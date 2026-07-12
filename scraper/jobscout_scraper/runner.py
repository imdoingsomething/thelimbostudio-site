import json
import logging
import os
import tempfile

from . import db, sources
from .http import make_session
from .normalize import normalize

log = logging.getLogger("jobscout")


def scrape_once(con, cfg):
    """Fetch every enabled source, upsert into sqlite, return per-source stats."""
    session = make_session(cfg)
    stats = {}
    started = db.now_iso()
    for name, mod in sources.ALL.items():
        scfg = cfg["sources"].get(name, {})
        if not scfg.get("enabled", False):
            stats[name] = {"skipped": True}
            continue
        try:
            raw = mod.fetch(session, cfg)
        except Exception as e:
            log.error("source %s failed: %s", name, e)
            stats[name] = {"error": str(e)[:300]}
            continue
        jobs, dropped = [], 0
        for r in raw:
            n = normalize(r)
            if n:
                jobs.append(n)
            else:
                dropped += 1
        new = db.upsert_jobs(con, jobs)
        stats[name] = {"fetched": len(jobs), "new": new, "dropped": dropped}
        log.info("%-16s %4d jobs (%d new)", name, len(jobs), new)
    db.record_run(con, started, stats)
    return stats


def export_json(con, cfg, out_path):
    """Write the public jobs.json snapshot atomically."""
    exp = cfg["export"]
    jobs = db.active_jobs(con, exp["days_active"], exp["max_jobs"])
    cap = exp["max_desc_chars"]
    per_src = {}
    for j in jobs:
        j["tags"] = json.loads(j.pop("tags") or "[]")
        j["remote"] = bool(j["remote"])
        j["desc_html"] = (j["desc_html"] or "")[:cap]
        j.pop("first_seen", None)
        per_src[j["src"]] = per_src.get(j["src"], 0) + 1

    payload = {
        "generated_at": db.now_iso(),
        "count": len(jobs),
        "sources": per_src,
        "jobs": jobs,
    }
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(out_path) or ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, out_path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    log.info("exported %d jobs → %s (%.1f MB)", len(jobs), out_path,
             os.path.getsize(out_path) / 1e6)
    return len(jobs)
