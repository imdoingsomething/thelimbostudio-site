import argparse
import logging
import os
import time

from . import config, db
from .runner import export_json, scrape_once


def main():
    p = argparse.ArgumentParser(prog="jobscout_scraper")
    p.add_argument("command", choices=["run", "loop", "export"],
                   help="run: scrape once and export · loop: scrape forever · export: rebuild jobs.json from sqlite")
    p.add_argument("--data", default=os.environ.get("DATA_DIR", "./data"),
                   help="data dir (sqlite + public/jobs.json), default ./data or $DATA_DIR")
    p.add_argument("--config", default=os.environ.get("CONFIG_PATH", ""),
                   help="path to config.json (optional, defaults built in)")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s",
                        datefmt="%H:%M:%S")
    log = logging.getLogger("jobscout")

    cfg = config.load(args.config)
    os.makedirs(args.data, exist_ok=True)
    con = db.connect(os.path.join(args.data, "jobs.sqlite3"))
    out_path = os.path.join(args.data, "public", "jobs.json")

    def cycle():
        scrape_once(con, cfg)
        export_json(con, cfg, out_path)

    if args.command == "export":
        export_json(con, cfg, out_path)
    elif args.command == "run":
        cycle()
    else:  # loop
        interval = max(5, int(cfg["interval_minutes"])) * 60
        log.info("loop mode — scraping every %d min", interval // 60)
        while True:
            try:
                cycle()
            except Exception:
                log.exception("scrape cycle failed — will retry next interval")
            time.sleep(interval)


if __name__ == "__main__":
    main()
