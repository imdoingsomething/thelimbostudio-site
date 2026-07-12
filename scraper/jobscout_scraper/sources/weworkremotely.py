import xml.etree.ElementTree as ET

from ..http import get

NAME = "weworkremotely"

FEEDS = [
    "https://weworkremotely.com/remote-jobs.rss",
]


def fetch(session, cfg):
    out = []
    for feed in cfg["sources"][NAME].get("feeds", FEEDS):
        r = get(session, feed, cfg)
        root = ET.fromstring(r.content)
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            # WWR titles are "Company: Job Title"
            company, _, job_title = title.partition(":")
            if not job_title:
                job_title, company = title, ""
            link = (item.findtext("link") or "").strip()
            guid = (item.findtext("guid") or link).strip()
            region = item.findtext("region") or ""
            out.append({
                "src": NAME,
                "id": guid.rsplit("/", 1)[-1] or guid,
                "title": job_title.strip(),
                "company": company.strip(),
                "location": region.strip() or "Remote",
                "remote": True,
                "url": link,
                "date": item.findtext("pubDate"),
                "tags": [c.text.strip() for c in item.findall("category") if c.text],
                "desc_html": item.findtext("description"),
            })
    return out
