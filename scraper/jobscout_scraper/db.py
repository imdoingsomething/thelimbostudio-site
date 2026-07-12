import json
import sqlite3
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id         TEXT PRIMARY KEY,   -- "<src>:<source id>"
    src        TEXT NOT NULL,
    title      TEXT NOT NULL,
    company    TEXT NOT NULL,
    location   TEXT,
    remote     INTEGER DEFAULT 0,
    url        TEXT NOT NULL,
    date       TEXT,               -- posting date, ISO 8601
    tags       TEXT,               -- JSON array
    desc_html  TEXT,
    sal_min    INTEGER,
    sal_max    INTEGER,
    sal_text   TEXT,
    first_seen TEXT NOT NULL,
    last_seen  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen);
CREATE INDEX IF NOT EXISTS idx_jobs_src ON jobs(src);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    stats       TEXT               -- JSON: per-source counts / errors
);
"""


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(path):
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def upsert_jobs(con, jobs):
    """Insert new jobs / refresh last_seen on known ones. Returns #new."""
    ts = now_iso()
    new = 0
    with con:
        for j in jobs:
            exists = con.execute("SELECT 1 FROM jobs WHERE id=?", (j["id"],)).fetchone()
            if not exists:
                new += 1
            con.execute(
                """INSERT INTO jobs (id, src, title, company, location, remote, url,
                                     date, tags, desc_html, sal_min, sal_max, sal_text,
                                     first_seen, last_seen)
                   VALUES (:id,:src,:title,:company,:location,:remote,:url,
                           :date,:tags,:desc_html,:sal_min,:sal_max,:sal_text,:ts,:ts)
                   ON CONFLICT(id) DO UPDATE SET
                       title=excluded.title, company=excluded.company,
                       location=excluded.location, remote=excluded.remote,
                       url=excluded.url, date=excluded.date, tags=excluded.tags,
                       desc_html=excluded.desc_html, sal_min=excluded.sal_min,
                       sal_max=excluded.sal_max, sal_text=excluded.sal_text,
                       last_seen=excluded.last_seen""",
                {**j, "tags": json.dumps(j.get("tags") or []), "ts": ts},
            )
    return new


def active_jobs(con, days, max_jobs):
    cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
    rows = con.execute(
        """SELECT * FROM jobs
           WHERE last_seen >= ?
           ORDER BY COALESCE(date, first_seen) DESC
           LIMIT ?""",
        (cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"), int(max_jobs)),
    ).fetchall()
    return [dict(r) for r in rows]


def record_run(con, started_at, stats):
    with con:
        con.execute(
            "INSERT INTO runs (started_at, finished_at, stats) VALUES (?,?,?)",
            (started_at, now_iso(), json.dumps(stats)),
        )
