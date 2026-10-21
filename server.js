require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { OAuth2Client } = require('google-auth-library');

// Database connection module
const db = require('./db/db');
const MySqlSessionStore = require('./db/session-store');

const app = express();

// Initialize database connection (tables are created before sessions are read/written)
const dbReady = (async () => {
  const connected = await db.testConnection();
  if (connected) {
    await db.initDatabase();
  } else {
    console.warn('Database connection failed, some features may be limited.');
  }
})();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const AGENT_MAX_SOCKETS = parsePositiveInteger(process.env.AGENT_MAX_SOCKETS, 2000);
const AGENT_MAX_TOTAL_SOCKETS = parsePositiveInteger(process.env.AGENT_MAX_TOTAL_SOCKETS, 4000);
const AGENT_MAX_FREE_SOCKETS = parsePositiveInteger(process.env.AGENT_MAX_FREE_SOCKETS, 512);
const AGENT_KEEP_ALIVE_MS = parsePositiveInteger(process.env.AGENT_KEEP_ALIVE_MS, 10000);

const upstreamAgentOptions = {
  keepAlive: true,
  keepAliveMsecs: AGENT_KEEP_ALIVE_MS,
  maxSockets: AGENT_MAX_SOCKETS,
  maxTotalSockets: AGENT_MAX_TOTAL_SOCKETS,
  maxFreeSockets: AGENT_MAX_FREE_SOCKETS,
  scheduling: 'lifo'
};

app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: Infinity }));

const httpAgent = new http.Agent(upstreamAgentOptions);
const httpsAgent = new https.Agent(upstreamAgentOptions);

const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  validateStatus: () => true
});

// Google OAuth configuration
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
const oauthClient = new OAuth2Client(googleClientId, googleClientSecret, googleCallbackUrl);

// Session middleware for authentication (sessions are stored in MySQL: table http_sessions)
const SESSION_DEFAULT_MS = 24 * 60 * 60 * 1000;          // 24 hours
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;    // 30 days when "Duy trì đăng nhập" is ticked
app.use(cookieParser());
app.use(session({
  store: new MySqlSessionStore(db, dbReady),
  secret: process.env.SESSION_SECRET || 'ai-relay-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: SESSION_DEFAULT_MS
  }
}));

// Remember which device a login session belongs to (shown in Profile > "Thiết bị đăng nhập")
app.use((req, res, next) => {
  if (req.session?.userId && !req.session.device) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    req.session.device = {
      ua: String(req.headers['user-agent'] || '').slice(0, 255),
      ip: forwarded || req.socket?.remoteAddress || '',
      createdAt: Date.now()
    };
  }
  next();
});

const googleConfigured = () => Boolean(googleClientId && googleClientSecret);

// Helper: Find or create user from Google profile (userinfo v3: sub, email, name, picture)
async function findOrCreateUserFromGoogle(userinfo) {
  // 1. Already linked via Google account id
  const linked = await db.query(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?',
    ['google', userinfo.sub]
  );
  if (linked.length > 0) {
    await db.query(
      'UPDATE users SET avatar_url = COALESCE(?, avatar_url), login_count = login_count + 1, last_login_at = NOW() WHERE id = ?',
      [userinfo.picture || null, linked[0].user_id]
    );
    return linked[0].user_id;
  }

  // 2. Existing user with same email -> link Google to it
  const byEmail = await db.query('SELECT id FROM users WHERE email = ?', [userinfo.email]);
  if (byEmail.length > 0) {
    await db.query(
      'INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES (?, ?, ?)',
      [byEmail[0].id, 'google', userinfo.sub]
    );
    await db.query(
      'UPDATE users SET avatar_url = COALESCE(?, avatar_url), login_count = login_count + 1, last_login_at = NOW() WHERE id = ?',
      [userinfo.picture || null, byEmail[0].id]
    );
    return byEmail[0].id;
  }

  // 3. New user (make username unique)
  let baseName = (userinfo.email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80) || 'user';
  let username = baseName;
  for (let i = 0; i < 5; i++) {
    const taken = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (taken.length === 0) break;
    username = baseName + Math.random().toString(36).slice(2, 6);
  }
  const passwordHash = await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10);
  const [result] = await db.execute(
    'INSERT INTO users (username, email, password_hash, display_name, avatar_url, role, status, login_count, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())',
    [username, userinfo.email, passwordHash, userinfo.name || username, userinfo.picture || null, 'user', 'active']
  );
  await db.query(
    'INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES (?, ?, ?)',
    [result.insertId, 'google', userinfo.sub]
  );
  return result.insertId;
}

// Step 1: redirect the browser to Google's consent screen
app.get('/auth/google', (req, res) => {
  if (!googleConfigured()) {
    return res.redirect('/login?google_error=not_configured');
  }
  const state = require('crypto').randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const url = oauthClient.generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: ['openid', 'profile', 'email'],
    state
  });
  res.redirect(url);
});

// Step 2: Google redirects back here with ?code=...
app.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.redirect('/login?google_error=denied');
  if (!code || !state || state !== req.session.oauthState) {
    return res.redirect('/login?google_error=invalid_state');
  }
  delete req.session.oauthState;

  try {
    const { tokens } = await oauthClient.getToken(code);
    const { data: userinfo } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userinfo.sub || !userinfo.email || userinfo.email_verified === false) {
      return res.redirect('/login?google_error=unverified_email');
    }

    const userId = await findOrCreateUserFromGoogle(userinfo);
    req.session.userId = userId;
    req.session.provider = 'google';
    req.session.authenticated = true;
    await adoptSessionSettings(req, userId);

    req.session.save(() => res.redirect('/login?google=success'));
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect('/login?google_error=failed');
  }
});

// Current logged-in user (session cookie)
app.get('/api/auth/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ authenticated: false });
  try {
    const rows = await db.query(
      'SELECT id, username, email, display_name, avatar_url, role FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, provider: req.session.provider || 'google', user: rows[0] });
  } catch (err) {
    res.status(500).json({ authenticated: false, error: 'Database error' });
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
]);

const SENSITIVE_ERROR_PATTERNS = [
  /https?:\/\/[^\s"'<>]+/gi,
  /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi,
  /<!DOCTYPE html>/i,
  /<html[\s>]/i,
  /cloudflare/i,
  /error code\s*524/i,
  /a timeout occurred/i
];

const DEFAULT_UPSTREAM_ERROR = {
  message: 'The upstream service could not complete the request at this time. Please try again shortly.',
  type: 'upstream_error',
  code: 'upstream_error'
};

const SANITIZED_UPSTREAM_STATUS_CODES = new Set([401, 403, 404, 408, 429, 500, 502, 503, 504, 521, 550]);

const shouldSanitizeUpstreamResponse = (status) => SANITIZED_UPSTREAM_STATUS_CODES.has(status);

const pickForwardHeaders = (req, { forceSSE = false } = {}) => {
  const headers = {};

  Object.entries(req.headers || {}).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (value === undefined) return;
    headers[key] = value;
  });

  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (forceSSE) {
    headers.Accept = 'text/event-stream';
    headers['Cache-Control'] = 'no-cache';
  }

  return headers;
};

const pickForwardWebSocketHeaders = (req, hostHeader) => {
  const headers = {};

  Object.entries(req.headers || {}).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length') return;
    if (value === undefined) return;
    headers[key] = value;
  });

  headers.Host = hostHeader;
  headers.Connection = 'Upgrade';
  headers.Upgrade = 'websocket';

  return headers;
};

const copyResponseHeaders = (res, upstreamHeaders = {}) => {
  Object.entries(upstreamHeaders).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    // Upstream cookies must never replace our own (session / remember_token) cookies
    if (lower === 'set-cookie') return;
    if (value !== undefined) res.setHeader(key, value);
  });
};

const getHeaderValue = (headers = {}, headerName) => {
  const target = headerName.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  const value = entry?.[1];

  if (Array.isArray(value)) return value.join(', ');
  return value || '';
};

const isJsonContentType = (contentType = '') => /(^|[/+])json\b/i.test(String(contentType).split(';')[0]);
const hasRequestBody = (req) => !['GET', 'HEAD'].includes(String(req.method || '').toUpperCase());

const normalizeTargetUrl = (targetUrl) => String(targetUrl || '').replace(/\/+$/, '');

// Base URL + request path. Keys are often saved as ".../v1" while the request path already starts
// with "/v1/..." - joining them blindly produced "/v1/v1/chat/completions" (404 upstream).
const buildUpstreamUrl = (baseUrl, requestPath) => {
  const base = normalizeTargetUrl(baseUrl);
  const path = String(requestPath || '');
  const lastSegment = base.match(/\/([^/]+)$/)?.[1];
  if (lastSegment && /^v\d+$/i.test(lastSegment) && path.toLowerCase().startsWith(`/${lastSegment.toLowerCase()}/`)) {
    return base + path.slice(lastSegment.length + 1);
  }
  return base + path;
};

// ============================================================
// API key chain: stored keys (encrypted) used to call the upstream,
// with automatic failover to the next key when one does not answer.
// ============================================================
const UPSTREAM_TIMEOUT_MS = parsePositiveInteger(process.env.UPSTREAM_TIMEOUT_MS, 120000); // 120 seconds

const TOKEN_ENC_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.SESSION_SECRET || 'ai-relay-secret-change-in-production'))
  .digest();

const encryptToken = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', TOKEN_ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
};

const decryptToken = (b64) => {
  const buf = Buffer.from(b64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', TOKEN_ENC_KEY, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
};

const tokenFingerprint = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const extractClientToken = (req) => {
  const auth = String(req.headers['authorization'] || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return String(req.headers['x-api-key'] || req.headers['x-goog-api-key'] || '').trim();
};

const loadKeyChain = async (userId) => {
  const rows = await db.query(
    'SELECT id, upstream_url, key_encrypted FROM api_keys WHERE user_id = ? AND is_active = 1 AND key_encrypted IS NOT NULL AND upstream_url IS NOT NULL ORDER BY is_primary DESC, id ASC',
    [userId]
  );
  const chain = [];
  for (const row of rows) {
    try {
      chain.push({ id: row.id, url: row.upstream_url, token: decryptToken(row.key_encrypted) });
    } catch (e) {
      console.warn('Cannot decrypt API key #' + row.id + ' (was SESSION_SECRET changed?)');
    }
  }
  return chain;
};

// Identify the user from the API key sent by the client (or from the login session)
// and attach that user's ordered key list to the request.
const attachKeyChain = async (req, res, next) => {
  req.keyChain = [];
  try {
    let userId = req.session?.userId || null;
    const clientToken = extractClientToken(req);
    if (clientToken) {
      const rows = await db.query('SELECT user_id FROM api_keys WHERE key_fingerprint = ? LIMIT 1', [tokenFingerprint(clientToken)]);
      if (rows.length > 0) userId = rows[0].user_id;
    }
    if (userId) {
      req.userId = userId;
      req.keyChain = await loadKeyChain(userId);
    }
  } catch (error) {
    console.warn('attachKeyChain failed:', error.message);
  }
  next();
};

// WebSocket is not supported: the upgrade handler is synchronous and cannot look up the
// user's keys in SQL, so it always rejects.
const getUpstreamWebSocketOptions = (originalUrl = '') => {
  // Always rejected (see the comment above)
  throw new Error('WebSocket upgrade requires user to configure an API key with an upstream URL first.');
};

const getForwardRequestData = (req) => {
  if (!hasRequestBody(req)) return undefined;

  const contentType = getHeaderValue(req.headers, 'content-type');

  if (!contentType || isJsonContentType(contentType)) {
    return req.body;
  }

  return req;
};

const isTruthyStreamFlag = (value) => value === true || value === 'true' || value === 1 || value === '1';

const isEventStreamRequest = (req) => {
  const originalUrl = req.originalUrl || '';
  const requestPath = req.path || originalUrl.split('?')[0] || '';

  return isTruthyStreamFlag(req.body?.stream)
    || /:streamGenerateContent$/i.test(requestPath)
    || /[?&]alt=sse(?:&|$)/i.test(originalUrl);
};

const isFailoverStatus = (status) => status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;

const forwardCurrentApiRequest = async ({ req, res, responseType, forceSSE, path: pathOverride } = {}) => {
  const chain = req.keyChain || [];
  if (chain.length === 0) {
    return res.status(401).json({
      error: {
        message: 'No API key configured. Add an API key in the dashboard, then send it as "Authorization: Bearer <your key>".',
        type: 'authentication_error',
        code: 'no_api_key'
      }
    });
  }

  const originalUrl = pathOverride || req.originalUrl;
  const data = getForwardRequestData(req);
  const canRetry = data === undefined || data !== req; // a raw request stream cannot be replayed
  const attempts = [];

  for (let i = 0; i < chain.length; i++) {
    const key = chain[i];
    const isLast = i === chain.length - 1 || !canRetry;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const headers = pickForwardHeaders(req, { forceSSE });
      Object.keys(headers).forEach((name) => {
        if (['authorization', 'x-api-key', 'x-goog-api-key'].includes(name.toLowerCase())) delete headers[name];
      });
      headers.Authorization = `Bearer ${key.token}`;

      const response = await axiosInstance({
        method: req.method,
        url: buildUpstreamUrl(key.url, originalUrl),
        headers,
        data,
        responseType,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!isLast && isFailoverStatus(response.status)) {
        if (responseType === 'stream' && response.data?.destroy) response.data.destroy();
        attempts.push({ key: i + 1, status: response.status });
        console.warn(`[failover] key #${i + 1} returned ${response.status}, trying next key`);
        continue;
      }

      return forwardApiRequest({ req, res, prefetched: response, responseType });
    } catch (err) {
      clearTimeout(timer);
      const timedOut = controller.signal.aborted;
      attempts.push({ key: i + 1, error: timedOut ? 'timeout' : (err.code || 'network_error') });
      console.warn(`[failover] key #${i + 1} ${timedOut ? 'timed out after ' + UPSTREAM_TIMEOUT_MS + 'ms' : 'failed: ' + (err.code || err.message)}`);

      if (isLast) {
        return res.status(timedOut ? 504 : 502).json({
          error: {
            message: timedOut
              ? `Upstream did not respond within ${Math.round(UPSTREAM_TIMEOUT_MS / 1000)} seconds.`
              : 'Could not reach the upstream service.',
            type: 'upstream_error',
            code: 'all_keys_failed',
            attempts
          }
        });
      }
    }
  }
};

const forwardStreamableApiRequest = async (req, res) => {
  const isStream = isEventStreamRequest(req);
  return await forwardCurrentApiRequest({
    req,
    res,
    responseType: isStream ? 'stream' : 'json',
    forceSSE: isStream
  });
};

const forwardWebSocketUpgrade = (req, socket, head) => {
  const { hostname, port, path: upstreamPath, secure, hostHeader } = getUpstreamWebSocketOptions(req.url);
  const upstreamSocket = (secure ? tls : net).connect(port, hostname, () => {
    const headers = pickForwardWebSocketHeaders(req, hostHeader);

    const requestLines = [
      `GET ${upstreamPath} HTTP/1.1`,
      ...Object.entries(headers)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`),
      '',
      ''
    ];

    upstreamSocket.write(requestLines.join('\r\n'));

    if (head && head.length > 0) {
      upstreamSocket.write(head);
    }

    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });

  const closeSockets = () => {
    if (!socket.destroyed) socket.destroy();
    if (!upstreamSocket.destroyed) upstreamSocket.destroy();
  };

  upstreamSocket.on('error', closeSockets);
  socket.on('error', closeSockets);
  socket.on('close', () => {
    if (!upstreamSocket.destroyed) upstreamSocket.destroy();
  });
  upstreamSocket.on('close', () => {
    if (!socket.destroyed) socket.destroy();
  });
};

const stringifyPayload = (payload) => {
  if (payload === undefined || payload === null) return '';
  if (typeof payload === 'string') return payload;

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
};

const containsSensitiveErrorContent = (payload) => {
  const serialized = stringifyPayload(payload);

  return SENSITIVE_ERROR_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(serialized);
  });
};

const redactSensitiveContent = (value) => value
  .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
  .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, '[redacted-host]');

const normalizeErrorMessage = (payload, fallbackMessage) => {
  const serialized = stringifyPayload(payload);
  const normalized = serialized || fallbackMessage || DEFAULT_UPSTREAM_ERROR.message;

  if (containsSensitiveErrorContent(serialized)) {
    if (/rate limited/i.test(normalized)) {
      return 'The upstream service is currently rate limiting requests. Please try again in a moment.';
    }

    if (/timeout|timed out|524/i.test(normalized)) {
      return 'The upstream service took too long to respond. Please try again shortly.';
    }

    if (/unauthorized|forbidden|401|403/i.test(normalized)) {
      return 'The upstream service rejected the request credentials. Please verify access and try again.';
    }

    return DEFAULT_UPSTREAM_ERROR.message;
  }

  return redactSensitiveContent(normalized).slice(0, 1000);
};

const toSafeErrorBody = (payload, fallback = {}) => ({
  error: {
    message: normalizeErrorMessage(payload, fallback.message),
    type: fallback.type || DEFAULT_UPSTREAM_ERROR.type,
    code: fallback.code || DEFAULT_UPSTREAM_ERROR.code
  }
});

const toErrorBody = (err) => {
  return toSafeErrorBody(err.response?.data, {
    message: err.message || DEFAULT_UPSTREAM_ERROR.message,
    type: 'proxy_error',
    code: err.code || err.response?.status || DEFAULT_UPSTREAM_ERROR.code
  });
};

const forwardApiRequest = async ({ req, res, method, url, data, responseType, forceSSE, prefetched }) => {
  try {
    const response = prefetched || await axiosInstance({
      method,
      url,
      headers: pickForwardHeaders(req, { forceSSE }),
      data,
      responseType
    });

    const shouldSanitize = shouldSanitizeUpstreamResponse(response.status);

    if (responseType === 'stream') {
      const upstreamStream = response.data;

      if (shouldSanitize) {
        if (upstreamStream && typeof upstreamStream.destroy === 'function') {
          upstreamStream.destroy();
        }

        return res.status(response.status).json(toSafeErrorBody(null, {
          message: DEFAULT_UPSTREAM_ERROR.message,
          type: 'upstream_error',
          code: response.status
        }));
      }

      copyResponseHeaders(res, response.headers || {});

      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;

        req.off('aborted', handleClientDisconnect);
        res.off('close', handleClientDisconnect);
        upstreamStream.off('error', handleUpstreamError);
        upstreamStream.off('end', handleUpstreamEnd);
        upstreamStream.off('close', handleUpstreamClose);
      };

      const handleClientDisconnect = () => {
        cleanup();

        if (!upstreamStream.destroyed) {
          upstreamStream.destroy(new Error('Client disconnected during stream'));
        }
      };

      const handleUpstreamError = (streamError) => {
        cleanup();

        if (!res.headersSent) {
          const safeError = toSafeErrorBody(null, {
            message: streamError.message || DEFAULT_UPSTREAM_ERROR.message,
            type: 'upstream_stream_error',
            code: streamError.code || 'upstream_stream_error'
          });

          res.status(502).json(safeError);
          return;
        }

        if (!res.destroyed) {
          res.destroy(streamError);
        }
      };

      const handleUpstreamEnd = () => {
        cleanup();
      };

      const handleUpstreamClose = () => {
        cleanup();
      };

      req.on('aborted', handleClientDisconnect);
      res.on('close', handleClientDisconnect);
      upstreamStream.on('error', handleUpstreamError);
      upstreamStream.on('end', handleUpstreamEnd);
      upstreamStream.on('close', handleUpstreamClose);

      if (!res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      }

      if (!res.getHeader('cache-control')) {
        res.setHeader('Cache-Control', 'no-cache, no-transform');
      }

      res.status(response.status);

      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      upstreamStream.pipe(res);
      return;
    }

    const safeBody = shouldSanitize
      ? toSafeErrorBody(response.data, {
        message: DEFAULT_UPSTREAM_ERROR.message,
        type: 'upstream_error',
        code: response.status
      })
      : response.data;

    copyResponseHeaders(res, response.headers || {});

    return res.status(response.status).json(safeBody);
  } catch (err) {
    return res.status(err.response?.status || 500).json(toErrorBody(err));
  }
};


// Clients that forget the "/v1" prefix (e.g. POST /chat/completions, GET /dashboard/billing/usage):
// rewrite them to "/v1/..." so they go through the same key lookup and forwarding.
const V1_ALIAS_PATTERN = /^\/(chat\/completions|completions|embeddings|responses|messages|images|audio|moderations|files|batches|assistants|threads|fine_tuning|videos|dashboard\/billing|models\/.+)(?=[/?]|$)/i;

app.use((req, res, next) => {
  const pathOnly = req.path || '';
  const isAlias = V1_ALIAS_PATTERN.test(pathOnly);
  // "/models" is also the web page: only treat it as the API when the caller is an API client
  // (sends an API key header, or does not ask for HTML like a browser does)
  const isModelsList = /^\/models\/?$/i.test(pathOnly) && req.method === 'GET'
    && (Boolean(extractClientToken(req)) || !String(req.headers.accept || '').includes('text/html'));

  if (isAlias || isModelsList) {
    req.url = '/v1' + req.url;
    req.originalUrl = '/v1' + req.originalUrl;
  }
  next();
});

// Resolve the caller's API keys for every proxied route
app.use(['/v1', '/v1beta', '/api'], attachKeyChain);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/models', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'models.html'));
});

app.get('/rankings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'rankings.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'dashboard.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'docs.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'profile.html'));
});

// Dashboard billing subscription
app.get('/v1/dashboard/billing/subscription', async (req, res) => {
  return forwardCurrentApiRequest({ req, res, path: '/v1/dashboard/billing/subscription' });
});

// Dashboard billing usage
app.get('/v1/dashboard/billing/usage', async (req, res) => {
  const currentYear = new Date().getFullYear();
  return forwardCurrentApiRequest({
    req,
    res,
    path: `/v1/dashboard/billing/usage?start_date=2024-01-01&end_date=${currentYear}-12-31`
  });
});

// OpenAI-compatible model list
app.get('/v1/models', async (req, res) => {
  return forwardCurrentApiRequest({ req, res, path: '/v1/models' });
});

// Tried in order: cmd first (measured faster and more stable), codex as fallback
const EXTERNAL_AUTH_BASE_URLS = [
  'https://cmd.micosoft.icu',
  'https://codex.micosoft.icu'
];

const CARD_LOGIN_ENDPOINTS = EXTERNAL_AUTH_BASE_URLS.map((baseUrl) => `${baseUrl}/api/users/card-login`);
const USER_CONFIG_ENDPOINTS = EXTERNAL_AUTH_BASE_URLS.map((baseUrl) => `${baseUrl}/api/userconfig/get`);
const EXTERNAL_AUTH_TIMEOUT_MS = 10000;

const isRetryableExternalAuthError = (error) => !error.response
  || error.code === 'ECONNABORTED'
  || error.code === 'ETIMEDOUT'
  || error.code === 'ECONNRESET'
  || error.code === 'ENOTFOUND'
  || error.code === 'EAI_AGAIN';

const getExternalAuthHeaders = (req, { includeSessionHeaders = false } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': req.headers['user-agent'] || 'ai-relay-proxy'
  };

  if (includeSessionHeaders) {
    // The external auth token is kept server-side in the login session (SQL), not in the browser.
    const authToken = req.session?.extToken || getHeaderValue(req.headers, 'x-auth-token');
    // Never forward our own cookies (login session, trusted-device token) to the external service
    let cookie = String(getHeaderValue(req.headers, 'cookie') || '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith('connect.sid=') && !part.startsWith(REMEMBER_COOKIE + '='))
      .join('; ');
    if (req.session?.extToken && !/(^|;\s*)token=/.test(cookie)) {
      cookie = (cookie ? cookie + '; ' : '') + 'token=' + encodeURIComponent(req.session.extToken);
    }

    if (authToken) headers['x-auth-token'] = authToken;
    if (cookie) headers.Cookie = cookie;
  }

  return headers;
};

// ============================================================
// Authentication Middleware
// ============================================================
const authenticateUser = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.userId = req.session.userId;
  req.userAuthenticated = true;
  next();
};

const authenticateUserOptional = (req, res, next) => {
  if (req.session.userId) {
    req.userId = req.session.userId;
    req.userAuthenticated = true;
  } else {
    req.userId = null;
    req.userAuthenticated = false;
  }
  next();
};

// ============================================================
// Per-user / per-visitor settings (theme, language, playground choices)
// Logged-in users: table user_settings. Visitors: their SQL-backed session.
// ============================================================
const SETTING_VALIDATORS = {
  theme: (v) => v === 'dark' || v === 'light',
  language: (v) => ['vi', 'en', 'zh', 'ja'].includes(v),
  playground_model: (v) => typeof v === 'string' && v.length <= 200,
  playground_web_search: (v) => v === 'true' || v === 'false'
};

async function loadSettings(req) {
  const out = { ...(req.session?.settings || {}) };
  if (req.session?.userId) {
    const rows = await db.query('SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?', [req.session.userId]);
    rows.forEach((r) => { out[r.setting_key] = r.setting_value; });
  }
  return out;
}

// Preferences chosen before logging in are kept for the account (never overwriting saved ones)
async function adoptSessionSettings(req, userId) {
  const pending = req.session?.settings;
  if (!pending) return;
  try {
    for (const [key, value] of Object.entries(pending)) {
      await db.query('INSERT IGNORE INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)', [userId, key, String(value)]);
    }
  } catch (e) {
    console.warn('adoptSessionSettings failed:', e.message);
  }
}

app.get('/api/settings', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json({ success: true, settings: await loadSettings(req) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  const incoming = req.body?.settings && typeof req.body.settings === 'object'
    ? req.body.settings
    : (req.body?.key ? { [req.body.key]: req.body.value } : {});

  const clean = {};
  for (const [key, raw] of Object.entries(incoming)) {
    const validator = SETTING_VALIDATORS[key];
    const value = raw === null || raw === undefined ? '' : String(raw);
    if (!validator) return res.status(400).json({ error: 'Unknown setting: ' + key });
    if (value !== '' && !validator(value)) return res.status(400).json({ error: 'Invalid value for ' + key });
    clean[key] = value;
  }

  try {
    if (req.session.userId) {
      for (const [key, value] of Object.entries(clean)) {
        if (value === '') {
          await db.query('DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?', [req.session.userId, key]);
        } else {
          await db.query(
            'INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
            [req.session.userId, key, value]
          );
        }
      }
    } else {
      req.session.settings = { ...(req.session.settings || {}) };
      for (const [key, value] of Object.entries(clean)) {
        if (value === '') delete req.session.settings[key]; else req.session.settings[key] = value;
      }
    }
    res.json({ success: true, settings: await loadSettings(req) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================================================
// Login profile helpers
// ============================================================
const TOKEN_FIELDS = ['token', 'access_token'];

// Token that identifies the user on the external card service (kept only in the server-side session)
function extractExternalToken(response) {
  const d = response?.data || {};
  const candidates = [
    d.token, d.data?.token, d.access_token, d.data?.access_token, d.user?.token, d.data?.user?.token
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  if (found) return found.trim();

  const cookies = [].concat(response?.headers?.['set-cookie'] || []);
  for (const c of cookies) {
    const m = String(c).match(/^token=([^;]+)/);
    if (m) {
      try { return decodeURIComponent(m[1]); } catch (_) { return m[1]; }
    }
  }
  return '';
}

// Copy of the login response that is safe to store/send to the browser (no tokens)
function sanitizeLoginPayload(payload) {
  let copy;
  try { copy = JSON.parse(JSON.stringify(payload ?? {})); } catch (_) { copy = {}; }
  if (!copy || typeof copy !== 'object') return {};
  const strip = (obj) => {
    if (obj && typeof obj === 'object') TOKEN_FIELDS.forEach((f) => { delete obj[f]; });
  };
  strip(copy); strip(copy.data); strip(copy.user); strip(copy.data?.user);
  return copy;
}

function parseJsonSafe(text, fallback = null) {
  if (!text) return fallback;
  try { return JSON.parse(text); } catch (_) { return fallback; }
}

// ============================================================
// API key storage in SQL (the single source of truth for keys)
// ============================================================
const KEY_EXTRA_FIELDS = ['mode', 'effort', 'channel', 'single_tool_use'];

const pickKeyExtra = (entry = {}) => ({
  mode: String(entry.mode || '').trim(),
  effort: String(entry.effort || '').trim(),
  channel: String(entry.channel || '').trim(),
  single_tool_use: Boolean(entry.single_tool_use)
});

// Full ordered key list of one user (decrypted) - only ever sent to its owner
async function listKeyConfig(userId) {
  const rows = await db.query(
    'SELECT id, upstream_url, key_encrypted, model_preference, extra_json, is_active FROM api_keys WHERE user_id = ? AND key_encrypted IS NOT NULL AND upstream_url IS NOT NULL ORDER BY is_primary DESC, id ASC',
    [userId]
  );
  const list = [];
  for (const row of rows) {
    let token;
    try { token = decryptToken(row.key_encrypted); } catch (e) { continue; }
    const extra = parseJsonSafe(row.extra_json, {}) || {};
    const entry = { url: row.upstream_url, token, model: row.model_preference || '' };
    KEY_EXTRA_FIELDS.forEach((f) => { entry[f] = extra[f] ?? (f === 'single_tool_use' ? false : ''); });
    entry.enabled = Boolean(row.is_active);
    list.push(entry);
  }
  return list;
}

async function insertKeyRow(conn, userId, entry, position, isPrimary) {
  const token = String(entry.token || '').trim();
  const url = String(entry.url || '').trim();
  let host = url;
  try { host = new URL(url).host; } catch (_) { /* keep raw url */ }
  const keyName = ('Key ' + (position + 1) + ' - ' + host + ' (****' + token.slice(-4) + ')').slice(0, 100);
  const keyHash = await bcrypt.hash(token, 10);

  await conn.query(
    'INSERT INTO api_keys (user_id, key_name, key_hash, key_fingerprint, key_encrypted, upstream_url, model_preference, extra_json, is_active, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      keyName,
      keyHash,
      tokenFingerprint(token),
      encryptToken(token),
      url.slice(0, 500),
      String(entry.model || '').slice(0, 100) || null,
      JSON.stringify(pickKeyExtra(entry)),
      entry.enabled === false ? 0 : 1,
      isPrimary ? 1 : 0
    ]
  );
}

// Keys stored on the external card service -> list of {url, token, ...}
async function fetchExternalKeyList(req) {
  if (!req.session?.extToken) return null;
  for (const endpoint of USER_CONFIG_ENDPOINTS) {
    try {
      const response = await requestUserConfig(endpoint, req, { k: 'api-config' });
      const d = response.data;
      if (response.status === 200 && d && Number(d.code ?? 0) === 0) {
        const list = d?.data?.list || d?.list || [];
        return Array.isArray(list) ? list.filter((e) => e && e.token && e.url) : [];
      }
    } catch (err) {
      if (!isRetryableExternalAuthError(err)) return null;
    }
  }
  return null;
}

// Add the external keys that SQL does not know yet (matched by token fingerprint)
async function importExternalKeys(req, userId) {
  const list = await fetchExternalKeyList(req);
  if (!list || !list.length) return 0;

  const known = new Set((await db.query('SELECT key_fingerprint FROM api_keys WHERE user_id = ?', [userId])).map((r) => r.key_fingerprint));
  const fresh = list.filter((e) => !known.has(tokenFingerprint(String(e.token).trim())));
  if (!fresh.length) return 0;

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ?', [userId]);
    for (let i = 0; i < fresh.length; i++) {
      await insertKeyRow(conn, userId, { ...fresh[i], enabled: true }, n + i, n + i === 0);
    }
    await conn.commit();
    invalidateAggregateCache();
    return fresh.length;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Push the enabled keys to the external service so both stay the same (best effort)
async function pushExternalKeyList(req, list) {
  if (!req.session?.extToken) return 'skipped';
  const clean = list.filter((e) => e.enabled !== false).map((e) => ({
    url: String(e.url || '').trim(),
    mode: String(e.mode || '').trim(),
    model: String(e.model || '').trim(),
    token: String(e.token || '').trim(),
    effort: String(e.effort || '').trim(),
    channel: String(e.channel || '').trim(),
    single_tool_use: Boolean(e.single_tool_use)
  }));
  for (const endpoint of USER_CONFIG_SET_ENDPOINTS) {
    try {
      const response = await requestUserConfig(endpoint, req, { k: 'api-config', v: { kiro: true, list: clean } });
      if (response.status === 200 && Number(response.data?.code ?? 1) === 0) return 'ok';
    } catch (err) {
      if (!isRetryableExternalAuthError(err)) return 'failed';
    }
  }
  return 'failed';
}

// Avatar of the logged-in account (the Google profile picture), served from our own origin.
// Hot-linking lh3.googleusercontent.com from the browser is often blocked (referrer / rate limit),
// which left an empty dark circle. Only the user's own stored URL on a Google image host is fetched.
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const isGoogleAvatarHost = (host) => /(^|\.)googleusercontent\.com$/i.test(host) || host === 'lh3.google.com';

app.get('/api/avatar', async (req, res) => {
  try {
    if (!req.session?.userId) return res.status(401).end();
    const rows = await db.query('SELECT avatar_url FROM users WHERE id = ?', [req.session.userId]);
    const raw = String(rows[0]?.avatar_url || '').trim();
    if (!raw) return res.status(404).end();

    let url;
    try { url = new URL(raw); } catch (_) { return res.status(404).end(); }
    if (url.protocol !== 'https:' || !isGoogleAvatarHost(url.hostname)) return res.status(404).end();

    const upstream = await axios.get(url.toString(), {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: AVATAR_MAX_BYTES,
      maxRedirects: 0,
      validateStatus: () => true
    });
    const type = String(upstream.headers['content-type'] || '');
    if (upstream.status !== 200 || !/^image\//i.test(type)) return res.status(404).end();

    res.set({ 'Content-Type': type, 'Cache-Control': 'private, no-cache', Vary: 'Cookie' });
    res.send(Buffer.from(upstream.data));
  } catch (error) {
    res.status(404).end();
  }
});

// ============================================================
// Logged-in devices (sessions of the current account)
// ============================================================
const describeUserAgent = (ua = '') => {
  const s = String(ua);
  let os = 'Thiết bị không rõ';
  if (/iPhone/i.test(s)) os = 'iPhone';
  else if (/iPad/i.test(s)) os = 'iPad';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  let browser = 'Trình duyệt';
  if (/Edg(e|A|iOS)?\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/Firefox|FxiOS/i.test(s)) browser = 'Firefox';
  else if (/Chrome|CriOS/i.test(s)) browser = 'Chrome';
  else if (/Safari/i.test(s)) browser = 'Safari';
  return `${os} · ${browser}`;
};

const maskIp = (ip = '') => {
  const value = String(ip).replace(/^::ffff:/i, '').trim();
  if (!value) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return value.split('.').slice(0, 2).join('.') + '.xxx.xxx';
  if (value.includes(':')) return value.split(':').slice(0, 2).join(':') + ':xxxx';
  return '';
};

const timeAgoVi = (ms) => {
  const diff = Math.max(0, Date.now() - Number(ms || 0));
  const min = Math.floor(diff / 60000);
  if (min < 2) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

app.get('/api/sessions', authenticateUser, async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT sid, user_agent, ip, created_at, last_seen_at FROM http_sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_seen_at DESC',
      [req.userId, Date.now()]
    );
    const devices = rows.map((row) => {
      const current = row.sid === req.sessionID;
      const ip = maskIp(row.ip);
      const parts = [current ? 'Hiện tại' : `Hoạt động ${timeAgoVi(row.last_seen_at)}`];
      if (ip) parts.push(`IP ${ip}`);
      return {
        name: describeUserAgent(row.user_agent),
        detail: parts.join(' · '),
        tag: current ? 'Current session' : 'Active session',
        current
      };
    });
    devices.sort((a, b) => Number(b.current) - Number(a.current));
    res.set('Cache-Control', 'no-store').json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// Log out every OTHER device (their sessions and "remember this device" tokens); this browser stays signed in
app.post('/api/sessions/revoke-others', authenticateUser, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM http_sessions WHERE user_id = ? AND sid <> ?', [req.userId, req.sessionID]);
    await db.query('DELETE FROM remember_tokens WHERE user_id = ?', [req.userId]);
    res.clearCookie(REMEMBER_COOKIE);
    res.json({ success: true, revoked: Number(result?.affectedRows || 0) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// Everything the browser needs right after page load: who is logged in, the profile,
// preferences and (optionally) the key list.
app.get('/api/bootstrap', async (req, res) => {
  const out = { authenticated: false, settings: {} };
  try {
    out.settings = await loadSettings(req);
    if (req.session?.userId) {
      const rows = await db.query(
        'SELECT id, username, email, display_name, avatar_url, role, profile_json FROM users WHERE id = ?',
        [req.session.userId]
      );
      if (rows.length) {
        const u = rows[0];
        out.authenticated = true;
        out.provider = req.session.provider || 'card';
        out.user = {
          id: u.id, username: u.username, email: u.email, name: u.display_name,
          avatar: u.avatar_url || '', role: u.role
        };
        out.profile = parseJsonSafe(u.profile_json, null);
        const [{ n }] = await db.query('SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND is_active = 1', [u.id]);
        out.keyCount = Number(n);
        if (req.query.keys === '1') out.keys = await listKeyConfig(u.id);
      }
    }
    res.set('Cache-Control', 'no-store').json(out);
  } catch (error) {
    console.error('bootstrap failed:', error.message);
    res.status(500).json({ authenticated: false, settings: out.settings || {}, error: 'Database error' });
  }
});

app.get('/api/api-keys/config', authenticateUser, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json({ success: true, keys: await listKeyConfig(req.userId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load API keys', message: error.message });
  }
});

// Pull keys saved on the external service into SQL, then return the SQL list
app.post('/api/api-keys/pull', authenticateUser, async (req, res) => {
  try {
    let imported = 0;
    try { imported = await importExternalKeys(req, req.userId); } catch (e) { console.warn('Key pull failed:', e.message); }
    res.set('Cache-Control', 'no-store').json({ success: true, imported, keys: await listKeyConfig(req.userId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load API keys', message: error.message });
  }
});

// ============================================================
// Playground request history
// ============================================================
const HISTORY_MAX_ROWS = 200;
const HISTORY_FIELD_MAX_CHARS = 1_000_000;

// Drop inline base64 data (images) so history rows stay small
function slimForHistory(value) {
  if (typeof value === 'string') {
    return value.startsWith('data:') && value.length > 1000 ? '[inline data omitted]' : value;
  }
  if (Array.isArray(value)) return value.map(slimForHistory);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = slimForHistory(v);
    return out;
  }
  return value;
}

function historyJson(value) {
  if (value === undefined) return null;
  const text = JSON.stringify(slimForHistory(value));
  return text.length > HISTORY_FIELD_MAX_CHARS
    ? JSON.stringify({ truncated: true, note: 'Payload too large to store' })
    : text;
}

app.get('/api/history', authenticateUser, async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT id, model, tokens, ok, latency, time_text FROM request_history WHERE user_id = ? ORDER BY id DESC LIMIT ?',
      [req.userId, HISTORY_MAX_ROWS]
    );
    res.set('Cache-Control', 'no-store').json({
      success: true,
      data: rows.map((r) => ({
        id: r.id, model: r.model, tokens: r.tokens, ok: Boolean(r.ok), latency: r.latency, time: r.time_text
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

app.get('/api/history/:id', authenticateUser, async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT id, request_json, response_json FROM request_history WHERE user_id = ? AND id = ?',
      [req.userId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({
      success: true,
      data: { id: rows[0].id, request: parseJsonSafe(rows[0].request_json), response: parseJsonSafe(rows[0].response_json) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history entry' });
  }
});

app.post('/api/history', authenticateUser, async (req, res) => {
  try {
    const r = req.body || {};
    const tokens = Number.isFinite(Number(r.tokens)) && r.tokens !== null ? Math.round(Number(r.tokens)) : null;
    const latency = Number.isFinite(Number(r.latency)) && r.latency !== null ? Math.round(Number(r.latency)) : null;
    const [result] = await db.execute(
      'INSERT INTO request_history (user_id, model, tokens, ok, latency, time_text, request_json, response_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.userId,
        String(r.model || '').slice(0, 200),
        tokens,
        r.ok === false ? 0 : 1,
        latency,
        String(r.time || '').slice(0, 20),
        historyJson(r.request),
        historyJson(r.response)
      ]
    );
    // Keep only the newest rows for this user
    await db.query(
      'DELETE FROM request_history WHERE user_id = ? AND id <= (SELECT id FROM (SELECT id FROM request_history WHERE user_id = ? ORDER BY id DESC LIMIT 1 OFFSET ?) t)',
      [req.userId, req.userId, HISTORY_MAX_ROWS]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('history insert failed:', error.message);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

// Playground conversation (chat shown in the Playground panel), kept per account
app.get('/api/playground', authenticateUser, async (req, res) => {
  try {
    const rows = await db.query('SELECT conv_json FROM playground_conversations WHERE user_id = ?', [req.userId]);
    let conv = [];
    if (rows[0]?.conv_json) {
      try { conv = JSON.parse(rows[0].conv_json); } catch { conv = []; }
    }
    res.json({ conv: Array.isArray(conv) ? conv : [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load playground' });
  }
});

app.put('/api/playground', authenticateUser, async (req, res) => {
  try {
    const conv = req.body?.conv;
    if (!Array.isArray(conv)) return res.status(400).json({ error: 'conv must be an array' });
    await db.query(
      'INSERT INTO playground_conversations (user_id, conv_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE conv_json = VALUES(conv_json)',
      [req.userId, JSON.stringify(conv)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('playground save failed:', error.message);
    res.status(500).json({ error: 'Failed to save playground' });
  }
});

app.delete('/api/playground', authenticateUser, async (req, res) => {
  try {
    await db.query('DELETE FROM playground_conversations WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear playground' });
  }
});

app.delete('/api/history', authenticateUser, async (req, res) => {
  try {
    await db.query('DELETE FROM request_history WHERE user_id = ?', [req.userId]);
    await db.query('DELETE FROM playground_conversations WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ============================================================
// Models + Rankings built ONLY from the API keys of the logged-in account
// ============================================================
const AGGREGATE_CACHE_MS = 60 * 1000;
const AGGREGATE_FETCH_TIMEOUT_MS = 15000;
const AGGREGATE_CONCURRENCY = 8;
const aggregateCache = new Map(); // keyed per user: "<userId>:models", "<userId>:rankings:<period>"

function invalidateAggregateCache() {
  aggregateCache.clear();
}

// Active keys of ONE account (primary first, then oldest first).
// Never returns another user's keys; no session / no keys -> empty list.
async function loadUserActiveKeys(userId) {
  if (!userId) return [];
  const rows = await db.query(
    'SELECT id, upstream_url, key_encrypted FROM api_keys WHERE user_id = ? AND is_active = 1 AND key_encrypted IS NOT NULL AND upstream_url IS NOT NULL ORDER BY is_primary DESC, id ASC',
    [userId]
  );
  const keys = [];
  for (const row of rows) {
    if (!/^https?:\/\//i.test(String(row.upstream_url || '').trim())) continue;
    try {
      keys.push({ id: row.id, url: String(row.upstream_url).trim().replace(/\/+$/, ''), token: decryptToken(row.key_encrypted) });
    } catch (e) {
      console.warn('Cannot decrypt API key #' + row.id);
    }
  }
  return keys;
}

// Two keys pointing at the same site count as one source ("url gốc"):
// scheme+host+path, lower-cased, without a trailing slash or /v1
function baseUrlKey(url) {
  let value = String(url || '').trim().replace(/\/+$/, '');
  try {
    const u = new URL(value);
    value = u.origin + u.pathname.replace(/\/+$/, '');
  } catch (_) { /* keep as is */ }
  return value.toLowerCase().replace(/\/v1$/, '');
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchJsonWithKey(url, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGGREGATE_FETCH_TIMEOUT_MS);
  try {
    const response = await axiosInstance({
      method: 'GET',
      url,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal
    });
    if (response.status !== 200 || !response.data || typeof response.data !== 'object') return null;
    return response.data;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const readModelList = (data) => {
  const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : Array.isArray(data) ? data : [];
  return raw
    .map((m) => {
      const id = m?.id || m?.name || m?.model;
      if (typeof id !== 'string' || !id.trim()) return null;
      return { id: id.trim(), owned_by: m?.owned_by || m?.provider || m?.owner || '', endpoint: typeof m?.endpoint === 'string' ? m.endpoint : '' };
    })
    .filter(Boolean);
};

async function fetchModelsForKey(key) {
  const candidates = [`${key.url}/models`];
  if (!/\/v1$/i.test(key.url)) candidates.push(`${key.url}/v1/models`);
  for (const url of candidates) {
    const list = readModelList(await fetchJsonWithKey(url, key.token));
    if (list.length) return list;
  }
  return null;
}

// GET /api/models/all -> union of the models exposed by the active keys of the logged-in account
app.get('/api/models/all', async (req, res) => {
  try {
    const userId = req.session?.userId || null;
    const cacheKey = `${userId || 'anon'}:models`;
    const cached = aggregateCache.get(cacheKey);
    if (!req.query.refresh && cached && Date.now() - cached.at < AGGREGATE_CACHE_MS) {
      return res.json(cached.body);
    }

    const keys = await loadUserActiveKeys(userId);
    const results = await mapLimit(keys, AGGREGATE_CONCURRENCY, (key) => fetchModelsForKey(key));

    const byId = new Map();
    results.forEach((list) => {
      (list || []).forEach((m) => {
        const existing = byId.get(m.id);
        if (!existing) byId.set(m.id, { ...m });
        else if (!existing.owned_by && m.owned_by) existing.owned_by = m.owned_by;
      });
    });

    const body = {
      object: 'list',
      data: [...byId.values()].map((m) => ({ id: m.id, object: 'model', owned_by: m.owned_by || 'unknown', endpoint: m.endpoint || undefined })),
      meta: { keys: keys.length, failed: results.filter((r) => !r).length }
    };
    if (aggregateCache.size > 500) aggregateCache.clear();
    aggregateCache.set(cacheKey, { at: Date.now(), body });
    res.json(body);
  } catch (error) {
    console.error('models aggregate failed:', error.message);
    res.status(500).json({ error: { message: 'Không thể tải danh sách model.', type: 'server_error' } });
  }
});

async function fetchRankingsForKey(key, period) {
  const query = `/api/rankings?period=${encodeURIComponent(period)}`;
  const candidates = [`${key.url}${query}`];
  try {
    const origin = new URL(key.url).origin;
    if (origin !== key.url) candidates.push(`${origin}${query}`);
  } catch (_) { /* ignore */ }

  for (const url of candidates) {
    const data = await fetchJsonWithKey(url, key.token);
    if (data && Array.isArray(data?.data?.models)) return data.data;
  }
  return null;
}

const numberFrom = (...values) => {
  for (const v of values) {
    const n = Number(v);
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(n)) return n;
  }
  return 0;
};

// GET /api/rankings?period=... -> ranking built from the data of the logged-in account's keys.
// Keys that point at the same base URL are queried once only.
app.get('/api/rankings', async (req, res) => {
  const period = ['today', 'week', 'month', 'year', 'all'].includes(req.query.period) ? req.query.period : 'today';
  try {
    const userId = req.session?.userId || null;
    const cacheKey = `${userId || 'anon'}:rankings:${period}`;
    const cached = aggregateCache.get(cacheKey);
    if (!req.query.refresh && cached && Date.now() - cached.at < AGGREGATE_CACHE_MS) {
      return res.json(cached.body);
    }

    const keys = await loadUserActiveKeys(userId);
    const sources = [];
    const seen = new Set();
    for (const key of keys) {
      const id = baseUrlKey(key.url);
      if (seen.has(id)) continue;
      seen.add(id);
      sources.push(key);
    }

    const results = await mapLimit(sources, AGGREGATE_CONCURRENCY, (key) => fetchRankingsForKey(key, period));
    const ok = results.filter(Boolean);

    if (sources.length && !ok.length) {
      return res.status(502).json({ error: { message: 'Không có nguồn nào trả về dữ liệu xếp hạng.', type: 'upstream_error' } });
    }

    const byModel = new Map();
    const points = [];
    ok.forEach((data) => {
      data.models.forEach((item) => {
        const model = String(item.model || item.model_name || item.name || item.label || '').trim();
        if (!model) return;
        const tokens = numberFrom(item.tokens, item.token, item.count, item.usage, item.total_tokens);
        const change = numberFrom(item.change, item.delta, item.trend, item.growth, item.growth_pct);
        const entry = byModel.get(model) || { model, provider: '', tokens: 0, prev: 0, contributions: 0, change: 0 };
        entry.provider = entry.provider || String(item.provider || item.vendor || item.company || item.source || '');
        entry.tokens += tokens;
        entry.prev += change > -100 ? tokens / (1 + change / 100) : 0;
        entry.contributions += 1;
        entry.change = change;
        byModel.set(model, entry);
      });
      if (Array.isArray(data?.models_history?.points)) points.push(...data.models_history.points);
    });

    const models = [...byModel.values()]
      .sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model))
      .map((e, i) => ({
        rank: i + 1,
        model: e.model,
        provider: e.provider || 'Unknown',
        tokens: e.tokens,
        // one source: keep its own figure; several: growth of the summed usage
        change: e.contributions === 1 ? e.change : Math.round((e.prev > 0 ? ((e.tokens - e.prev) / e.prev) * 100 : 0) * 100) / 100
      }));

    const body = {
      code: 0,
      data: { models, models_history: { points } },
      meta: { keys: keys.length, sources: sources.length, failed: results.length - ok.length }
    };
    if (aggregateCache.size > 500) aggregateCache.clear();
    aggregateCache.set(cacheKey, { at: Date.now(), body });
    res.json(body);
  } catch (error) {
    console.error('rankings aggregate failed:', error.message);
    res.status(500).json({ error: { message: 'Không thể tải dữ liệu xếp hạng.', type: 'server_error' } });
  }
});

// Save the whole key list from the dashboard into MySQL (the source of truth for keys).
// Each token is stored as a bcrypt hash, a SHA-256 fingerprint (lookup) and an AES-256-GCM encrypted copy (used for failover).
// Disabled keys are kept too (is_active = 0). Afterwards the enabled keys are pushed to the external service (best effort).
app.post('/api/api-keys/sync', authenticateUser, async (req, res) => {
  const list = Array.isArray(req.body?.list) ? req.body.list : null;
  if (!list) return res.status(400).json({ error: 'list must be an array' });
  if (list.length > 100) return res.status(400).json({ error: 'Too many keys (max 100)' });

  const clean = list
    .map((e) => ({ ...(e || {}), token: String(e?.token || '').trim(), url: String(e?.url || '').trim() }))
    .filter((e) => e.token && e.url);

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM api_keys WHERE user_id = ?', [req.userId]);
    for (let i = 0; i < clean.length; i++) {
      await insertKeyRow(conn, req.userId, clean[i], i, i === 0);
    }
    await conn.commit();
    invalidateAggregateCache();
  } catch (error) {
    await conn.rollback();
    console.error('API key sync failed:', error.message);
    return res.status(500).json({ error: 'Failed to sync API keys', message: error.message });
  } finally {
    conn.release();
  }

  const external = await pushExternalKeyList(req, clean).catch(() => 'failed');
  res.json({ success: true, saved: clean.length, external, keys: await listKeyConfig(req.userId) });
});

const requestCardLogin = (endpoint, req, body = req.body) => axios.post(endpoint, body, {
  headers: getExternalAuthHeaders(req),
  timeout: EXTERNAL_AUTH_TIMEOUT_MS,
  validateStatus: () => true
});

const requestUserConfig = (endpoint, req, data = req.body) => axios.post(endpoint, data, {
  headers: getExternalAuthHeaders(req, { includeSessionHeaders: true }),
  timeout: EXTERNAL_AUTH_TIMEOUT_MS,
  validateStatus: () => true
});

// Card-login: keep a local user record so the access code is stored as a bcrypt hash.
// The code itself is never saved; a SHA-256 fingerprint is used only to find the user again.
async function upsertCardUser(card) {
  const code = String(card || '').trim();
  if (!code) return null;

  const fingerprint = crypto.createHash('sha256').update(code).digest('hex');
  const username = 'card_' + fingerprint.slice(0, 16);
  const email = username + '@card.local';

  const existing = await db.query('SELECT id, password_hash FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    await db.query(
      'UPDATE users SET login_count = login_count + 1, last_login_at = NOW() WHERE id = ?',
      [existing[0].id]
    );
    return existing[0].id;
  }

  const passwordHash = await bcrypt.hash(code, 10);
  const [result] = await db.execute(
    'INSERT INTO users (username, email, password_hash, display_name, role, status, login_count, last_login_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())',
    [username, email, passwordHash, 'Card ' + fingerprint.slice(0, 6), 'user', 'active']
  );
  return result.insertId;
}

const isCardLoginSuccess = (response) => {
  const d = response?.data;
  if (response?.status !== 200 || !d || typeof d !== 'object') return false;
  const ok = d.code === 0 || d.code === '0' || d.success === true;
  return ok && Boolean(d.data || d.token);
};

// ============================================================
// "Duy trì đăng nhập": trusted-device token
// A random token lives in an httpOnly cookie; only its SHA-256 hash is stored in SQL.
// Logging out destroys the session but keeps this token, so the login page can offer
// "continue as ..." without asking for the access code again. "Dùng tài khoản khác"
// (POST /api/remember/forget) deletes it.
// ============================================================
const REMEMBER_COOKIE = 'remember_token';

const hashRememberToken = (token) => require('crypto').createHash('sha256').update(String(token)).digest('hex');

const rememberCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_REMEMBER_MS
});

async function issueRememberToken(res, userId, extToken) {
  const token = require('crypto').randomBytes(32).toString('hex');
  await db.query('DELETE FROM remember_tokens WHERE user_id = ? AND expires_at <= ?', [userId, Date.now()]);
  await db.query(
    'INSERT INTO remember_tokens (user_id, token_hash, ext_token_encrypted, expires_at) VALUES (?, ?, ?, ?)',
    [userId, hashRememberToken(token), extToken ? encryptToken(extToken) : null, Date.now() + SESSION_REMEMBER_MS]
  );
  res.cookie(REMEMBER_COOKIE, token, rememberCookieOptions());
}

async function revokeRememberToken(req, res) {
  const token = req.cookies?.[REMEMBER_COOKIE];
  if (token) {
    await db.query('DELETE FROM remember_tokens WHERE token_hash = ?', [hashRememberToken(token)]);
  }
  res.clearCookie(REMEMBER_COOKIE);
}

async function findRememberToken(req) {
  const token = req.cookies?.[REMEMBER_COOKIE];
  if (!token || typeof token !== 'string') return null;
  const rows = await db.query(
    `SELECT r.id, r.user_id, r.ext_token_encrypted, u.display_name, u.username
       FROM remember_tokens r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = ? AND r.expires_at > ?`,
    [hashRememberToken(token), Date.now()]
  );
  return rows[0] || null;
}

app.get('/api/remember/status', async (req, res) => {
  try {
    const row = await findRememberToken(req);
    if (!row) {
      if (req.cookies?.[REMEMBER_COOKIE]) res.clearCookie(REMEMBER_COOKIE);
      return res.set('Cache-Control', 'no-store').json({ available: false });
    }
    res.set('Cache-Control', 'no-store').json({ available: true, name: row.display_name || row.username || '' });
  } catch (error) {
    res.status(500).json({ available: false, error: 'Database error' });
  }
});

// Start a new login session from the trusted-device token (and rotate the token)
app.post('/api/remember/resume', async (req, res) => {
  try {
    const row = await findRememberToken(req);
    if (!row) {
      res.clearCookie(REMEMBER_COOKIE);
      return res.status(401).json({ success: false, error: 'Remember token is missing or expired' });
    }

    let extToken = null;
    try { extToken = row.ext_token_encrypted ? decryptToken(row.ext_token_encrypted) : null; } catch (e) { extToken = null; }

    await db.query('DELETE FROM remember_tokens WHERE id = ?', [row.id]);
    await issueRememberToken(res, row.user_id, extToken);

    req.session.userId = row.user_id;
    req.session.provider = 'card';
    req.session.authenticated = true;
    req.session.extToken = extToken;
    req.session.cookie.maxAge = SESSION_REMEMBER_MS;
    await adoptSessionSettings(req, row.user_id);
    res.json({ success: true });
  } catch (error) {
    console.error('remember resume failed:', error.message);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/remember/forget', async (req, res) => {
  try {
    await revokeRememberToken(req, res);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Card login endpoint
app.post('/api/users/card-login', async (req, res) => {
  let lastError = null;
  // "remember" is only for our own session / trusted-device token - do not forward it upstream
  const { remember, ...upstreamBody } = req.body || {};

  for (const endpoint of CARD_LOGIN_ENDPOINTS) {
    try {
      const response = await requestCardLogin(endpoint, req, upstreamBody);

      if (isCardLoginSuccess(response)) {
        try {
          const userId = await upsertCardUser(req.body?.card);
          if (userId) {
            req.session.userId = userId;
            req.session.provider = 'card';
            req.session.authenticated = true;
            req.session.extToken = extractExternalToken(response) || null;
            req.session.cookie.maxAge = remember === true ? SESSION_REMEMBER_MS : SESSION_DEFAULT_MS;

            // Trusted-device token: only when "Duy trì đăng nhập" is ticked
            if (remember === true) await issueRememberToken(res, userId, req.session.extToken);
            else await revokeRememberToken(req, res);

            // Profile (login response without tokens) is stored in SQL
            await db.query('UPDATE users SET profile_json = ? WHERE id = ?', [
              JSON.stringify(sanitizeLoginPayload(response.data)),
              userId
            ]);
            await adoptSessionSettings(req, userId);
            // Bring the keys saved on the external service into SQL (best effort)
            await importExternalKeys(req, userId).catch((e) => console.warn('Key import failed:', e.message));
          }
        } catch (dbErr) {
          // Database problems must not block a valid upstream login
          console.error('Card-login user sync failed:', dbErr.message);
        }
      }

      copyResponseHeaders(res, response.headers || {});
      return res.status(response.status).send(response.data);
    } catch (err) {
      lastError = err;

      if (!isRetryableExternalAuthError(err)) {
        return res.status(err.response?.status || 500).json(toErrorBody(err));
      }
    }
  }

  return res.status(lastError?.response?.status || 504).json({
    error: {
      message: 'Lost connection with the server. Please try again.',
      type: 'gateway_timeout',
      code: 'card_login_timeout'
    }
  });
});

// User config endpoint for API key configuration
app.post('/api/userconfig/get', async (req, res) => {
  let lastError = null;
  const data = req.body && Object.keys(req.body).length ? req.body : { k: 'api-config' };

  for (const endpoint of USER_CONFIG_ENDPOINTS) {
    try {
      const response = await requestUserConfig(endpoint, req, data);
      copyResponseHeaders(res, response.headers || {});
      return res.status(response.status).send(response.data);
    } catch (err) {
      lastError = err;

      if (!isRetryableExternalAuthError(err)) {
        return res.status(err.response?.status || 500).json(toErrorBody(err));
      }
    }
  }

  return res.status(lastError?.response?.status || 504).json({
    error: {
      message: 'Lost connection with the server. Please try again.',
      type: 'gateway_timeout',
      code: 'user_config_timeout'
    }
  });
});

const USER_CONFIG_SET_ENDPOINTS = EXTERNAL_AUTH_BASE_URLS.map((baseUrl) => `${baseUrl}/api/userconfig/set`);

// Persist user config (api-config list) with failover
app.post('/api/userconfig/set', async (req, res) => {
  let lastError = null;

  for (const endpoint of USER_CONFIG_SET_ENDPOINTS) {
    try {
      const response = await requestUserConfig(endpoint, req, req.body);
      copyResponseHeaders(res, response.headers || {});
      return res.status(response.status).send(response.data);
    } catch (err) {
      lastError = err;

      if (!isRetryableExternalAuthError(err)) {
        return res.status(err.response?.status || 500).json(toErrorBody(err));
      }
    }
  }

  return res.status(lastError?.response?.status || 504).json({
    error: {
      message: 'Lost connection with the server. Please try again.',
      type: 'gateway_timeout',
      code: 'user_config_timeout'
    }
  });
});

// Responses API with optional SSE
app.post('/v1/responses', async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Chat Completions API with optional SSE
app.post('/v1/chat/completions', async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Legacy Completions API with optional SSE
app.post('/v1/completions', async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Claude Messages API with optional SSE
app.post('/v1/messages', async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Audio speech binary passthrough
app.post('/v1/audio/speech', async (req, res) => {
  return forwardCurrentApiRequest({
    req,
    res,
    responseType: 'stream'
  });
});

// Audio transcription/translation passthrough
app.post(['/v1/audio/transcriptions', '/v1/audio/translations'], async (req, res) => {
  return forwardCurrentApiRequest({
    req,
    res,
    responseType: 'stream'
  });
});

// Gemini-compatible /v1beta API
app.all(/^\/v1beta\/.*/, async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Video content binary passthrough
app.get(/^\/v1\/videos\/[^/]+\/content$/, async (req, res) => {
  return forwardCurrentApiRequest({
    req,
    res,
    responseType: 'stream'
  });
});

// Management API fallback
app.all(/^\/api\/.*/, async (req, res) => {
  return forwardCurrentApiRequest({ req, res });
});

// OpenAI-compatible /v1 fallback
app.all(/^\/v1\/.*/, async (req, res) => {
  return forwardStreamableApiRequest(req, res);
});

// Relay health check
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// JSON error responses (no HTML stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: { message: 'Internal server error', type: 'server_error' } });
});

const PORT = (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy server đang chạy tại port: ${PORT}`);
    console.log(`⚙️  Upstream agent: maxSockets=${AGENT_MAX_SOCKETS}, maxTotalSockets=${AGENT_MAX_TOTAL_SOCKETS}, maxFreeSockets=${AGENT_MAX_FREE_SOCKETS}`);
});

server.on('upgrade', (req, socket, head) => {
  const requestPath = req.url?.split('?')[0] || '';

  // WebSocket upgrades are not supported (no async DB lookup is possible here), so all are rejected
  if (/^\/v1\/realtime$/i.test(requestPath)) {
    // Realtime endpoint: not supported
    socket.destroy();
    return;
  }

  // Reject all other WebSocket upgrade requests
  socket.destroy();
});

server.timeout = 0;
