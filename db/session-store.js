// express-session store backed by MySQL (table http_sessions).
// Login sessions survive server restarts and are shared by every page.

const session = require('express-session');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

class MySqlSessionStore extends session.Store {
  /**
   * @param {object} db      db module (needs .query)
   * @param {Promise} ready  resolves when the schema has been created
   */
  constructor(db, ready = Promise.resolve()) {
    super();
    this.db = db;
    this.ready = ready;
    // Remove expired sessions every 15 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 15 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  expiryOf(sess) {
    const expires = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    return Number.isFinite(expires) ? expires : Date.now() + DEFAULT_TTL_MS;
  }

  get(sid, cb) {
    this.ready
      .then(() => this.db.query('SELECT data FROM http_sessions WHERE sid = ? AND expires_at > ?', [sid, Date.now()]))
      .then((rows) => {
        if (!rows.length) return cb(null, null);
        try {
          cb(null, JSON.parse(rows[0].data));
        } catch (e) {
          cb(null, null);
        }
      })
      .catch((err) => {
        // A database hiccup must not turn every page into a 500: act as "not logged in".
        console.warn('Session store read failed:', err.message);
        cb(null, null);
      });
  }

  set(sid, sess, cb = () => {}) {
    const now = Date.now();
    const device = sess?.device || {};
    const userId = Number(sess?.userId) || null;
    const userAgent = device.ua ? String(device.ua).slice(0, 255) : null;
    const ip = device.ip ? String(device.ip).slice(0, 64) : null;
    this.ready
      .then(() => this.db.query(
        `INSERT INTO http_sessions (sid, data, expires_at, user_id, user_agent, ip, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at),
           user_id = VALUES(user_id), user_agent = VALUES(user_agent), ip = VALUES(ip),
           last_seen_at = VALUES(last_seen_at)`,
        [sid, JSON.stringify(sess), this.expiryOf(sess), userId, userAgent, ip, Number(device.createdAt) || now, now]
      ))
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  touch(sid, sess, cb = () => {}) {
    this.ready
      .then(() => this.db.query('UPDATE http_sessions SET expires_at = ?, last_seen_at = ? WHERE sid = ?', [this.expiryOf(sess), Date.now(), sid]))
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  destroy(sid, cb = () => {}) {
    this.ready
      .then(() => this.db.query('DELETE FROM http_sessions WHERE sid = ?', [sid]))
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  cleanup() {
    this.ready
      .then(() => this.db.query('DELETE FROM http_sessions WHERE expires_at <= ?', [Date.now()]))
      .catch(() => {});
  }
}

module.exports = MySqlSessionStore;
