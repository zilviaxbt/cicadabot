import csv
import os
import time
import subprocess
import sys
from typing import Dict, Tuple, List, Optional

import requests
from flask import Flask, render_template, redirect, url_for, request


APP_TITLE = "GalaChain Leaderboard"
BALANCES_CSV = "balances.csv"
STARTING_BALANCES_CSV = "startingbalances.csv"
COINGECKO_GALA_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=gala&vs_currencies=usd"
PRICE_CACHE_TTL_SEC = 60


app = Flask(__name__)


# In-memory cache: {"gala_usd": (price, timestamp)}
_price_cache: Dict[str, Tuple[float, float]] = {}


def parse_float(value: Optional[str]) -> float:
    if value is None:
        return 0.0
    try:
        value_str = str(value).strip()
        if value_str == "" or value_str.lower() in {"na", "nan", "none", "null"}:
            return 0.0
        return float(value_str)
    except Exception:
        return 0.0


def read_balances_from_csv(path: str) -> Dict[str, Dict[str, float]]:
    result: Dict[str, Dict[str, float]] = {}
    if not os.path.exists(path):
        return result
    with open(path, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            owner = (row.get("owner") or "").strip()
            if not owner:
                continue
            gala = parse_float(row.get("GALA"))
            gusdc = parse_float(row.get("GUSDC"))
            gusdt = parse_float(row.get("GUSDT"))
            result[owner] = {
                "GALA": gala,
                "GUSDC": gusdc,
                "GUSDT": gusdt,
            }
    return result


def get_gala_usd_price() -> float:
    now = time.time()
    cached = _price_cache.get("gala_usd")
    if cached and (now - cached[1] < PRICE_CACHE_TTL_SEC):
        return cached[0]
    try:
        resp = requests.get(COINGECKO_GALA_PRICE_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        price = parse_float(((data or {}).get("gala") or {}).get("usd"))
        # Cache even if zero (API might legitimately return 0, albeit unlikely)
        _price_cache["gala_usd"] = (price, now)
        return price
    except Exception:
        # Fallback to last cached if available; else 0.0
        if cached:
            return cached[0]
        return 0.0


def compute_totals(
    current: Dict[str, Dict[str, float]],
    starting: Dict[str, Dict[str, float]],
    gala_price: float,
) -> List[Dict[str, object]]:
    owners = set(current.keys()) | set(starting.keys())
    rows: List[Dict[str, object]] = []

    for owner in owners:
        c = current.get(owner, {})
        s = starting.get(owner, {})

        gala_c = parse_float(c.get("GALA"))
        gusdc_c = parse_float(c.get("GUSDC"))
        gusdt_c = parse_float(c.get("GUSDT"))

        gala_s = parse_float(s.get("GALA"))
        gusdc_s = parse_float(s.get("GUSDC"))
        gusdt_s = parse_float(s.get("GUSDT"))

        current_total = gala_c * gala_price + gusdc_c + gusdt_c
        starting_total = gala_s * gala_price + gusdc_s + gusdt_s
        change = current_total - starting_total
        pct_change: Optional[float] = None
        if starting_total > 0:
            pct_change = (change / starting_total) * 100.0

        rows.append(
            {
                "owner": owner,
                "gala": gala_c,
                "gusdc": gusdc_c,
                "gusdt": gusdt_c,
                "starting_total": starting_total,
                "current_total": current_total,
                "change": change,
                "pct_change": pct_change,
            }
        )

    rows.sort(key=lambda r: r["current_total"], reverse=True)
    for idx, row in enumerate(rows, start=1):
        row["rank"] = idx
    return rows


def format_decimal(value: float, decimals: int) -> str:
    fmt = "{:." + str(decimals) + "f}"
    try:
        return fmt.format(float(value))
    except Exception:
        return fmt.format(0.0)


@app.template_filter("fmt_gala")
def jinja_fmt_gala(value: float) -> str:
    return format_decimal(value or 0.0, 8)


@app.template_filter("fmt_token")
def jinja_fmt_token(value: float) -> str:
    return format_decimal(value or 0.0, 6)


@app.template_filter("fmt_usd")
def jinja_fmt_usd(value: float) -> str:
    return format_decimal(value or 0.0, 6)


@app.template_filter("fmt_pct")
def jinja_fmt_pct(value: Optional[float]) -> str:
    if value is None:
        return "-"
    return "{:.2f}".format(float(value))


def get_mtime(path: str) -> Optional[str]:
    try:
        ts = os.path.getmtime(path)
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
    except Exception:
        return None


@app.route("/", methods=["GET"])
def index():
    gala_price = get_gala_usd_price()

    current = read_balances_from_csv(BALANCES_CSV)
    starting = read_balances_from_csv(STARTING_BALANCES_CSV)

    leaderboard = compute_totals(current, starting, gala_price)
    has_starting = os.path.exists(STARTING_BALANCES_CSV)
    balances_mtime = get_mtime(BALANCES_CSV)

    return render_template(
        "index.html",
        title=APP_TITLE,
        gala_price=gala_price,
        leaderboard=leaderboard,
        has_starting=has_starting,
        balances_mtime=balances_mtime,
    )


@app.route("/refresh", methods=["POST"])
def refresh():
    # Fire-and-forget background process to update balances.csv
    try:
        python_exe = sys.executable or "python"
        subprocess.Popen(
            [python_exe, "fetch_galachain_balances.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=(subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0),
        )
    except Exception:
        # Ignore errors; page will reload with existing data
        pass
    return redirect(url_for("index"))


if __name__ == "__main__":
    # Bind to 127.0.0.1:8000 per spec
    app.run(host="127.0.0.1", port=8000)



