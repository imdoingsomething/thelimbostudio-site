from ..http import get

NAME = "jobicy"


def fetch(session, cfg):
    count = cfg["sources"][NAME].get("count", 100)
    r = get(session, f"https://jobicy.com/api/v2/remote-jobs?count={count}", cfg)
    out = []
    for x in r.json().get("jobs", []):
        out.append({
            "src": NAME,
            "id": x.get("id"),
            "title": x.get("jobTitle"),
            "company": x.get("companyName"),
            "location": x.get("jobGeo") or "Remote",
            "remote": True,
            "url": x.get("url"),
            "date": x.get("pubDate"),
            "tags": (x.get("jobIndustry") or []) + (x.get("jobType") or []),
            "desc_html": x.get("jobDescription") or x.get("jobExcerpt"),
            "sal_min": x.get("annualSalaryMin"),
            "sal_max": x.get("annualSalaryMax"),
        })
    return out
