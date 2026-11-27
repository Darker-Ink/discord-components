-- API keys. The key itself is `dm_<id>_<secret>`; only a SHA-256 hash of the secret is stored.
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Preview metadata; listing and quota checks only touch this table.
CREATE TABLE previews (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES api_keys (id) ON DELETE CASCADE,
  secret INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL,
  -- Size of the normalized JSON payload in bytes (what the per-key storage quota counts).
  size INTEGER NOT NULL,
  options TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX previews_by_key ON previews (key_id, created_at DESC, id DESC);
CREATE INDEX previews_by_expiry ON previews (expires_at);

-- The messages, gzipped JSON, kept apart from the metadata so list queries never read them.
CREATE TABLE preview_payloads (
  preview_id TEXT PRIMARY KEY REFERENCES previews (id) ON DELETE CASCADE,
  data BLOB NOT NULL
);

-- Fixed-window counters for key creation, by a keyed hash of the client IP.
CREATE TABLE key_creation_windows (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, window_start)
);
