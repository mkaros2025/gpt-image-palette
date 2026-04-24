CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_settings (id, base_url, api_key, updated_at)
VALUES (1, '', '', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS workspace_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  prompt TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '1024x1024',
  quality TEXT NOT NULL DEFAULT 'high',
  color_scheme_id TEXT NOT NULL DEFAULT 'preset-okabe-ito',
  custom_colors_json TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  reference_image_path TEXT,
  reference_image_name TEXT,
  reference_image_mime_type TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO workspace_state (
  id,
  prompt,
  size,
  quality,
  color_scheme_id,
  custom_colors_json,
  count,
  reference_image_path,
  reference_image_name,
  reference_image_mime_type,
  updated_at
)
VALUES (1, '', '1024x1024', 'high', 'preset-okabe-ito', NULL, 1, NULL, NULL, NULL, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS custom_color_schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS palette_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_color_scheme_id TEXT NOT NULL DEFAULT 'preset-okabe-ito',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO palette_preferences (id, default_color_scheme_id, updated_at)
VALUES (1, 'preset-okabe-ito', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  size TEXT NOT NULL,
  quality TEXT NOT NULL,
  color_scheme_id TEXT NOT NULL,
  custom_colors_json TEXT,
  count INTEGER NOT NULL,
  reference_image_path TEXT,
  status TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_images (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  size TEXT NOT NULL,
  quality TEXT NOT NULL,
  color_scheme_id TEXT NOT NULL,
  custom_colors_json TEXT,
  reference_image_path TEXT,
  image_path TEXT,
  status TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  error_message TEXT,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generation_images_job_id ON generation_images(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_images_status_created_at ON generation_images(status, created_at DESC);
