"""Greenhouse ATS boards — set company slugs in config: sources.greenhouse.boards."""

import html
import logging

from ..http import get

log = logging.getLogger("jobscout")

NAME = "greenhouse"


def fetch(session, cfg):
    out = []
    for board in cfg["sources"][NAME].get("boards", []):
        try:
            r = get(
                session,
                f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true",
                cfg,
            )
        except Exception as e:  # one bad slug shouldn't kill the rest
            log.warning("greenhouse board %s failed: %s", board, e)
            continue
        for x in r.json().get("jobs", []):
            loc = (x.get("location") or {}).get("name", "")
            out.append({
                "src": NAME,
                "id": f"{board}-{x.get('id')}",
                "title": x.get("title"),
                "company": board.replace("-", " ").title(),
                "location": loc,
                "remote": "remote" in loc.lower(),
                "url": x.get("absolute_url"),
                "date": x.get("updated_at"),
                "tags": [d.get("name") for d in x.get("departments") or [] if d.get("name")],
                # greenhouse double-escapes the HTML content
                "desc_html": html.unescape(x.get("content") or ""),
            })
    return out
