# JobScout scraper

Server-side aggregator behind [`/jobscout/`](../jobscout/). It scrapes public job
APIs and feeds on a schedule, keeps history in SQLite, and publishes a single
`jobs.json` that the static frontend loads as its "server" source.

Why server-side (vs. the browser-only sources the frontend already has):

- sources that browsers can't reach (no CORS): WeWorkRemotely RSS, HN "Who is hiring"
- ATS boards (Greenhouse/Lever) for specific companies you care about
- history: `first_seen`/`last_seen` per posting survives across visits
- one cached, gzip'd fetch for the frontend instead of four API calls per visitor

## Layout

```
scraper/
├── jobscout_scraper/        Python package (stdlib + requests)
│   ├── sources/             one module per source
│   ├── db.py                sqlite schema + upserts
│   ├── normalize.py         raw dicts → clean rows
│   ├── runner.py            scrape cycle + jobs.json export
│   └── __main__.py          CLI: run | loop | export
├── config.example.json      copy to data/config.json and edit
├── Dockerfile               scraper container (loop mode)
├── docker-compose.yml       scraper + Caddy (HTTPS, CORS, gzip)
├── Caddyfile
└── deploy/setup-hetzner.sh  one-shot server bootstrap
```

## Sources

| source           | what                                        | config |
|------------------|---------------------------------------------|--------|
| `remotive`       | remotive.com API                            | `limit` |
| `remoteok`       | remoteok.com API                            | — |
| `arbeitnow`      | arbeitnow.com API (EU-heavy)                | `pages` |
| `jobicy`         | jobicy.com API                              | `count` |
| `weworkremotely` | WWR RSS feed                                | `feeds` (optional list) |
| `hn_hiring`      | latest monthly "Ask HN: Who is hiring?"     | — |
| `greenhouse`     | per-company Greenhouse boards               | `boards`: slugs from `boards.greenhouse.io/<slug>` |
| `lever`          | per-company Lever boards                    | `boards`: slugs from `jobs.lever.co/<slug>` |

All are public JSON APIs or feeds — no HTML scraping, no auth, no ToS-hostile
sources. The scraper sends an identifying User-Agent and hits each source at
most once per interval (default 30 min).

## Deploy on Hetzner

1. **Create the server** — a CX22 (2 vCPU / 4 GB) on Ubuntu 24.04 is plenty.
   Add your SSH key when creating it.
2. **DNS** — add an A record, e.g. `jobs.thelimbostudio.com → <server IP>`.
3. **Bootstrap** — SSH in as root and run:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/imdoingsomething/thelimbostudio-site/main/scraper/deploy/setup-hetzner.sh | bash
   ```

   (or copy the script over and run it — it installs Docker, opens ports
   22/80/443 via ufw, clones this repo to `/opt/jobscout`, and starts both
   containers).
4. **Enable HTTPS** — once DNS resolves, set the domain and restart Caddy:

   ```sh
   cd /opt/jobscout/scraper
   echo "DOMAIN=jobs.thelimbostudio.com" > .env
   docker compose up -d --force-recreate caddy
   ```
5. **Verify**:

   ```sh
   docker compose logs -f scraper          # watch the first cycle
   curl -s https://jobs.thelimbostudio.com/jobs.json | head -c 300
   ```
6. **Point the frontend at it** — open `/jobscout/` on the site, expand the
   setup panel, paste `https://jobs.thelimbostudio.com` into
   *scraper server URL*, save. A `server` chip appears in the sources row.

### Ongoing

- Tune sources / add Greenhouse & Lever company slugs in
  `/opt/jobscout/scraper/data/config.json`, then `docker compose restart scraper`.
- Update after pushing changes to the repo:

  ```sh
  cd /opt/jobscout && git pull && cd scraper && docker compose up -d --build
  ```
- Data lives in `/opt/jobscout/scraper/data/` (`jobs.sqlite3` history +
  `public/jobs.json` snapshot). Back up the sqlite file if you care about
  history.

## Run locally (no Docker)

```sh
cd scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp config.example.json data-config.json          # optional; defaults work
.venv/bin/python -m jobscout_scraper run --data ./data --config data-config.json
python3 -m http.server -d data/public 8080       # → http://localhost:8080/jobs.json
```

## Feed format

```jsonc
{
  "generated_at": "2026-07-12T00:00:00Z",
  "count": 1234,
  "sources": { "remotive": 400, "remoteok": 250, ... },
  "jobs": [
    {
      "id": "remotive:12345",
      "src": "remotive",
      "title": "...", "company": "...", "location": "...",
      "remote": true, "url": "https://...",
      "date": "2026-07-10T12:00:00Z",          // posting date, may be null
      "tags": ["python", "..."],
      "desc_html": "...",                        // capped, frontend sanitizes
      "sal_min": 90000, "sal_max": 120000,       // may be null
      "sal_text": "$90k–$120k",                  // may be null
      "last_seen": "2026-07-12T00:00:00Z"
    }
  ]
}
```

Jobs drop out of the feed after `export.days_active` days (default 14) without
being seen at their source; everything stays in SQLite forever.
