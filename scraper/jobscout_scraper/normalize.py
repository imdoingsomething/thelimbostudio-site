import re
from datetime import datetime, timezone

_WS = re.compile(r"\s+")

# absolute cap stored in sqlite; the export applies its own (smaller) cap
MAX_DESC_STORE = 40000


def _clean(s):
    return _WS.sub(" ", str(s or "")).strip()


def iso_date(value):
    """Best-effort ISO 8601 normalization; returns None if unparseable."""
    if value in (None, "", 0):
        return None
    try:
        if isinstance(value, (int, float)):
            ts = float(value)
            if ts > 1e12:  # milliseconds
                ts /= 1000
            return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        s = str(value).strip()
        s = s.replace("Z", "+00:00")
        # "2026-07-10 14:00:00" → parseable with T
        if " " in s and "T" not in s:
            s = s.replace(" ", "T", 1)
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, OSError, OverflowError):
        return _rfc822(str(value))


def _rfc822(s):
    """RSS pubDate fallback: 'Thu, 10 Jul 2026 12:34:56 +0000'."""
    from email.utils import parsedate_to_datetime

    try:
        return parsedate_to_datetime(s).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError):
        return None


def normalize(raw):
    """Validate/clean one raw source dict into the sqlite row shape.

    Expected raw keys: src, id, title, company, url — required;
    location, remote, date, tags, desc_html, sal_min, sal_max, sal_text — optional.
    Returns None if the posting is unusable.
    """
    title = _clean(raw.get("title"))
    company = _clean(raw.get("company"))
    url = str(raw.get("url") or "").strip()
    src = raw.get("src")
    if not (title and url and src):
        return None
    sid = str(raw.get("id") or "").strip() or f"{title}|{company}".lower()

    def _sal(v):
        try:
            v = int(float(v))
            return v if 1000 <= v <= 5_000_000 else None
        except (TypeError, ValueError):
            return None

    return {
        "id": f"{src}:{sid}",
        "src": src,
        "title": title[:300],
        "company": company[:200] or "unknown",
        "location": _clean(raw.get("location"))[:200] or "Remote",
        "remote": 1 if raw.get("remote") else 0,
        "url": url[:1000],
        "date": iso_date(raw.get("date")),
        "tags": [_clean(t)[:60] for t in (raw.get("tags") or []) if _clean(t)][:15],
        "desc_html": str(raw.get("desc_html") or "")[:MAX_DESC_STORE],
        "sal_min": _sal(raw.get("sal_min")),
        "sal_max": _sal(raw.get("sal_max")),
        "sal_text": _clean(raw.get("sal_text"))[:300] or None,
    }
