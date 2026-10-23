#!/usr/bin/env python3
"""Rigenera resources/geo/istat-coords.json da RP92/comuni-italiani (lat/lng + ISTAT)."""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
import urllib.request

SRC = "https://cdn.jsdelivr.net/gh/RP92/comuni-italiani/data/comuni.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "resources", "geo", "istat-coords.json")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9\s']+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def main() -> int:
    with urllib.request.urlopen(SRC, timeout=90) as res:
        data = json.load(res)

    by_istat: dict = {}
    by_name: dict = {}
    for c in data:
        codice = str(c.get("codice") or "").zfill(6)
        nome = c.get("nome") or ""
        coord = c.get("coordinate") or {}
        lat, lng = coord.get("lat"), coord.get("lng")
        if lat is None or lng is None:
            continue
        by_istat[codice] = {
            "n": nome,
            "lat": round(float(lat), 5),
            "lng": round(float(lng), 5),
        }
        key = norm(nome)
        if key and (key not in by_name or c.get("capoluogo")):
            by_name[key] = codice

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"v": 1, "byIstat": by_istat, "byName": by_name}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {OUT} ({len(by_istat)} comuni)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
