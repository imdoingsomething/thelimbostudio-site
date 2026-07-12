"""Hacker News monthly "Ask HN: Who is hiring?" thread via the Algolia API."""

import html
import re

from ..http import get

NAME = "hn_hiring"

SEARCH = (
    "https://hn.algolia.com/api/v1/search_by_date"
    "?query=%22who%20is%20hiring%22&tags=story,author_whoishiring&hitsPerPage=5"
)
ITEM = "https://hn.algolia.com/api/v1/items/{id}"

_TAG = re.compile(r"<[^>]+>")
_REMOTE = re.compile(r"\bremote\b", re.I)
_SALARY = re.compile(r"\$\s?\d{2,3}\s?k|\$\s?\d{4,6}", re.I)


def fetch(session, cfg):
    hits = get(session, SEARCH, cfg).json().get("hits", [])
    thread = next((h for h in hits if "who is hiring" in (h.get("title") or "").lower()), None)
    if not thread:
        return []
    data = get(session, ITEM.format(id=thread["objectID"]), cfg).json()
    month = (thread.get("title") or "").split("(")[-1].rstrip(")")

    out = []
    for c in data.get("children", []):
        text = c.get("text") or ""
        if not text or c.get("deleted") or c.get("dead"):
            continue
        plain = html.unescape(_TAG.sub(" ", text.replace("<p>", "\n")))
        first = next((ln.strip() for ln in plain.splitlines() if ln.strip()), "")
        # header convention: Company | Role | Location | ...
        parts = [p.strip() for p in first.split("|")]
        company = parts[0][:100] if parts else ""
        title = parts[1] if len(parts) > 1 else "Multiple roles (see post)"
        location = next(
            (p for p in parts[2:] if p and not _SALARY.search(p)),
            "Remote" if _REMOTE.search(plain[:600]) else "",
        )
        sal_m = _SALARY.search(first) or _SALARY.search(plain[:1500])
        out.append({
            "src": NAME,
            "id": c.get("id"),
            "title": title[:200],
            "company": company or "HN poster",
            "location": location[:150],
            "remote": bool(_REMOTE.search(plain[:600])),
            "url": f"https://news.ycombinator.com/item?id={c.get('id')}",
            "date": c.get("created_at"),
            "tags": ["hn", month] if month else ["hn"],
            "desc_html": text,
            "sal_text": sal_m.group(0) if sal_m else None,
        })
    return out
