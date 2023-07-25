CREATE TABLE IF NOT EXISTS cron (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    last_execution TEXT,
    deletion TEXT,
    cron TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_response (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cron_id INTEGER NOT NULL,
    response TEXT NOT NULL,
    status INTEGER NOT NULL,
    FOREIGN KEY (cron_id) REFERENCES cron (id)
);
