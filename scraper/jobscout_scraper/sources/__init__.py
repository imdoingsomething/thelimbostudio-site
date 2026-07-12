"""Source registry. Each module exposes NAME and fetch(session, cfg) -> list[dict]."""

from . import (
    arbeitnow,
    greenhouse,
    hn_hiring,
    jobicy,
    lever,
    remoteok,
    remotive,
    weworkremotely,
)

ALL = {
    m.NAME: m
    for m in (
        remotive,
        remoteok,
        arbeitnow,
        jobicy,
        weworkremotely,
        hn_hiring,
        greenhouse,
        lever,
    )
}
