import time

from ..http import get

NAME = "arbeitnow"


def fetch(session, cfg):
    pages = cfg["sources"][NAME].get("pages", 3)
    out = []
    for page in range(1, pages + 1):
        r = get(session, f"https://www.arbeitnow.com/api/job-board-api?page={page}", cfg)
        data = r.json().get("data", [])
        if not data:
            break
        for x in data:
            out.append({
                "src": NAME,
                "id": x.get("slug"),
                "title": x.get("title"),
                "company": x.get("company_name"),
                "location": x.get("location") or ("Remote" if x.get("remote") else ""),
                "remote": bool(x.get("remote")),
                "url": x.get("url"),
                "date": x.get("created_at"),  # unix epoch seconds
                "tags": (x.get("tags") or []) + (x.get("job_types") or []),
                "desc_html": x.get("description"),
            })
        time.sleep(1)
    return out
