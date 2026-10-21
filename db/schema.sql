-- AI STORE Database Schema
-- Created for: AI Relay Proxy Server with MySQL integration
-- Compatible with MySQL 8.0+ and MariaDB 10.4+ (XAMPP)

-- Check if database exists, create if not
CREATE DATABASE IF NOT EXISTS ai_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ai_store;

-- ============================================================
-- Table: users
-- Purpose: Store user accounts for the AI STORE platform
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    login_count INT DEFAULT 0,
    last_login_at DATETIME,
    profile_json MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: oauth_accounts
-- Purpose: Store Google OAuth accounts linked to users
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_user (provider, provider_user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: api_keys
-- Purpose: Store API keys managed by users for AI model access
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,  -- Hashed API key (bcrypt)
    key_fingerprint CHAR(64),
    key_encrypted TEXT,
    upstream_url VARCHAR(500),
    model_preference VARCHAR(100),
    extra_json TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_key_hash (key_hash),
    INDEX idx_key_fingerprint (key_fingerprint),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: user_settings
-- Purpose: Per-user UI/playground preferences (theme, language, last model...)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT NOT NULL,
    setting_key VARCHAR(64) NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: request_history
-- Purpose: Playground request history
-- ============================================================
CREATE TABLE IF NOT EXISTS request_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    model VARCHAR(200),
    tokens INT NULL,
    ok BOOLEAN DEFAULT TRUE,
    latency INT NULL,
    time_text VARCHAR(20),
    request_json MEDIUMTEXT,
    response_json MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: http_sessions
-- Purpose: Express login sessions (survive server restarts) + device list per account
-- ============================================================
CREATE TABLE IF NOT EXISTS http_sessions (
    sid VARCHAR(128) NOT NULL PRIMARY KEY,
    data MEDIUMTEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    user_id INT NULL,                -- account that owns the session (NULL = not logged in)
    user_agent VARCHAR(255) NULL,    -- browser / device, shown in Profile > "Thiết bị đăng nhập"
    ip VARCHAR(64) NULL,
    created_at BIGINT NULL,          -- ms since epoch
    last_seen_at BIGINT NULL,        -- ms since epoch
    INDEX idx_http_sessions_expires (expires_at),
    INDEX idx_http_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: remember_tokens
-- Purpose: "Duy trì đăng nhập" - trusted-device tokens (SHA-256 hash only).
--          A valid token lets the login page start a new session without
--          typing the access code again, even after logging out.
-- ============================================================
CREATE TABLE IF NOT EXISTS remember_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    ext_token_encrypted TEXT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_remember_token_hash (token_hash),
    INDEX idx_remember_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Existing databases only: clean up what this schema no longer uses.
-- CREATE TABLE IF NOT EXISTS never removes anything, so run once by hand (MariaDB):
--   DROP TABLE IF EXISTS usage_logs;
--   DROP TABLE IF EXISTS sessions;
--   ALTER TABLE api_keys DROP COLUMN IF EXISTS key_salt, DROP COLUMN IF EXISTS rate_limit;
--   ALTER TABLE oauth_accounts DROP COLUMN IF EXISTS access_token,
--                              DROP COLUMN IF EXISTS refresh_token,
--                              DROP COLUMN IF EXISTS expires_at;
-- (MySQL 8 has no "IF EXISTS" for DROP COLUMN: drop the columns without it.)
-- ============================================================

-- ============================================================
-- Table: playground_conversations
-- Purpose: Playground chat (kept until the user clears history)
-- ============================================================
CREATE TABLE IF NOT EXISTS playground_conversations (
    user_id INT PRIMARY KEY,
    conv_json LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
