from ..http import get

NAME = "remoteok"


def fetch(session, cfg):
    r = get(session, "https://remoteok.com/api", cfg)
    data = r.json()
    out = []
    # first element is a legal notice, real postings have id + position
    for x in data if isinstance(data, list) else []:
        if not (isinstance(x, dict) and x.get("id") and x.get("position")):
            continue
        sal_min = x.get("salary_min")
        sal_max = x.get("salary_max")
        out.append({
            "src": NAME,
            "id": x["id"],
            "title": x.get("position"),
            "company": x.get("company"),
            "location": x.get("location") or "Remote",
            "remote": True,
            "url": x.get("url") or f"https://remoteok.com/remote-jobs/{x['id']}",
            "date": x.get("date"),
            "tags": x.get("tags") or [],
            "desc_html": x.get("description"),
            "sal_min": sal_min if isinstance(sal_min, (int, float)) and sal_min > 1000 else None,
            "sal_max": sal_max if isinstance(sal_max, (int, float)) and sal_max > 1000 else None,
        })
    return out
