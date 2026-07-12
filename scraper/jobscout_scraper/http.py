import logging
import time

import requests

log = logging.getLogger("jobscout")


def make_session(cfg):
    s = requests.Session()
    s.headers["User-Agent"] = cfg["user_agent"]
    s.headers["Accept"] = "application/json, application/xml;q=0.9, */*;q=0.8"
    return s


def get(session, url, cfg, retries=2, **kwargs):
    """GET with small retry/backoff. Raises on final failure."""
    timeout = cfg["request_timeout"]
    for attempt in range(retries + 1):
        try:
            r = session.get(url, timeout=timeout, **kwargs)
            if r.status_code == 429 and attempt < retries:
                wait = int(r.headers.get("Retry-After", 5))
                log.warning("429 from %s — sleeping %ss", url, wait)
                time.sleep(min(wait, 60))
                continue
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if attempt >= retries:
                raise
            log.warning("retrying %s after error: %s", url, e)
            time.sleep(2 * (attempt + 1))
