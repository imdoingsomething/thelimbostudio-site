"""JobScout scraper — server-side job aggregator feeding /jobscout on the site.

Scrapes public job APIs/feeds, keeps history in SQLite, and exports a
jobs.json snapshot that the static frontend consumes.
"""

__version__ = "0.1.0"
