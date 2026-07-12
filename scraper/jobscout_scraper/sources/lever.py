"""Lever ATS boards — set company slugs in config: sources.lever.boards."""

import logging

from ..http import get

log = logging.getLogger("jobscout")

NAME = "lever"


def fetch(session, cfg):
    out = []
    for board in cfg["sources"][NAME].get("boards", []):
        try:
            r = get(session, f"https://api.lever.co/v0/postings/{board}?mode=json", cfg)
        except Exception as e:
            log.warning("lever board %s failed: %s", board, e)
            continue
        postings = r.json()
        for x in postings if isinstance(postings, list) else []:
            cat = x.get("categories") or {}
            loc = cat.get("location") or ""
            workplace = (x.get("workplaceType") or "").lower()
            sal = x.get("salaryRange") or {}
            out.append({
                "src": NAME,
                "id": x.get("id"),
                "title": x.get("text"),
                "company": board.replace("-", " ").title(),
                "location": loc,
                "remote": workplace == "remote" or "remote" in loc.lower(),
                "url": x.get("hostedUrl"),
                "date": x.get("createdAt"),  # epoch ms
                "tags": [t for t in (cat.get("team"), cat.get("commitment")) if t],
                "desc_html": x.get("description") or x.get("descriptionPlain"),
                "sal_min": sal.get("min"),
                "sal_max": sal.get("max"),
            })
    return out
