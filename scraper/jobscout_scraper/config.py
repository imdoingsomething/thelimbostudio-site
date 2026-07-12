import copy
import json
import logging
import os

log = logging.getLogger("jobscout")

DEFAULTS = {
    "interval_minutes": 30,
    "request_timeout": 30,
    "user_agent": "JobScoutBot/0.1 (+https://thelimbostudio.com/jobscout/)",
    "export": {
        # jobs disappear from jobs.json after this many days without being
        # seen at their source; they stay in sqlite forever
        "days_active": 14,
        "max_desc_chars": 6000,
        "max_jobs": 3000,
    },
    "sources": {
        "remotive": {"enabled": True, "limit": 600},
        "remoteok": {"enabled": True},
        "arbeitnow": {"enabled": True, "pages": 3},
        "jobicy": {"enabled": True, "count": 100},
        "weworkremotely": {"enabled": True},
        "hn_hiring": {"enabled": True},
        # ATS boards: add company slugs, e.g. the slug in
        # boards.greenhouse.io/<slug> or jobs.lever.co/<slug>
        "greenhouse": {"enabled": True, "boards": []},
        "lever": {"enabled": True, "boards": []},
    },
}


def _merge(base, override):
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load(path=None):
    """Defaults merged with the JSON file at `path` (or $CONFIG_PATH), if present."""
    path = path or os.environ.get("CONFIG_PATH", "")
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cfg = _merge(DEFAULTS, json.load(f))
        log.info("loaded config from %s", path)
        return cfg
    if path:
        log.warning("config file %s not found — using defaults", path)
    return copy.deepcopy(DEFAULTS)
