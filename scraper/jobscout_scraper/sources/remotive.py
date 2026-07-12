from ..http import get

NAME = "remotive"


def fetch(session, cfg):
    limit = cfg["sources"][NAME].get("limit", 600)
    r = get(session, f"https://remotive.com/api/remote-jobs?limit={limit}", cfg)
    out = []
    for x in r.json().get("jobs", []):
        out.append({
            "src": NAME,
            "id": x.get("id"),
            "title": x.get("title"),
            "company": x.get("company_name"),
            "location": x.get("candidate_required_location") or "Remote",
            "remote": True,
            "url": x.get("url"),
            "date": x.get("publication_date"),
            "tags": x.get("tags") or [],
            "desc_html": x.get("description"),
            "sal_text": x.get("salary"),
        })
    return out
