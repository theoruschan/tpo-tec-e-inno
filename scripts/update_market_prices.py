"""Actualiza src/infrastructure/data/marketPrices.json con el último Zonaprop Index publicado.

Para cada fuente prueba los meses posteriores al período guardado (hasta el mes actual),
descarga el PDF del reporte, extrae el alquiler medio de monoambiente y de 2 ambientes /
1 dormitorio y, si encuentra un período más nuevo, actualiza el JSON.

Uso:  python scripts/update_market_prices.py            (requiere: pip install pypdf)
Sale con código 0 aunque no haya novedades; con 1 si un PDF nuevo no se pudo interpretar
(así la GitHub Action falla y alguien lo revisa a mano en vez de guardar datos rotos).
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "src" / "infrastructure" / "data" / "marketPrices.json"

# Código del reporte en la URL de Zonaprop para cada fuente del JSON.
REPORT_CODES = {
    "zonaprop-caba": "CABA",
    "zonaprop-cba": "CBA",
    "zonaprop-gba-sur": "GBA_SUR",
}

# "monoambiente medio de 40 m2 se alquila por $ 779.370"
# "dos ambientes y 50 m2 se alquila por 643.213 pesos" / "un dormitorio y 50 m2 se alquila por 619.061 pesos"
PATTERNS = {
    "studio": re.compile(r"monoambiente medio de \d+ m2 se alquila por \$?\s?([\d.]+)", re.I),
    "two_rooms": re.compile(
        r"(?:2 ambientes|dos ambientes|un dormitorio) y \d+ m2 se alquila por \$?\s?([\d.]+)", re.I
    ),
}

MIN_PLAUSIBLE, MAX_PLAUSIBLE = 50_000, 20_000_000


def month_range(after: str, until: date) -> list[str]:
    year, month = map(int, after.split("-"))
    periods = []
    while True:
        month += 1
        if month == 13:
            year, month = year + 1, 1
        if (year, month) > (until.year, until.month):
            return periods
        periods.append(f"{year}-{month:02d}")


def candidate_urls(code: str, period: str) -> list[str]:
    year, month = map(int, period.split("-"))
    up_year, up_month = (year + 1, 1) if month == 12 else (year, month + 1)
    folder = f"{up_year}/{up_month:02d}"
    return [
        f"https://www.zonaprop.com.ar/{base}/wp-content/uploads/{folder}/INDEX_{code}_REPORTE_{period}{suffix}.pdf"
        for base in ("blog", "noticias")
        for suffix in ("", "-1")
    ]


def download(url: str) -> bytes | None:
    request = urllib.request.Request(url, headers={"User-Agent": "CuartoSeguro-TP-UADE/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read()
            return body if body.startswith(b"%PDF") else None
    except urllib.error.HTTPError:
        return None


def extract_prices(pdf_bytes: bytes) -> dict[str, int]:
    text = " ".join((page.extract_text() or "") for page in PdfReader(io.BytesIO(pdf_bytes)).pages)
    text = re.sub(r"\s+", " ", text)
    prices = {}
    for key, pattern in PATTERNS.items():
        match = pattern.search(text)
        if match:
            value = int(match.group(1).replace(".", ""))
            if not MIN_PLAUSIBLE <= value <= MAX_PLAUSIBLE:
                raise ValueError(f"valor fuera de rango para {key}: {value}")
            prices[key] = value
    return prices


def main() -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    today = date.today()
    changed = False
    failed = False

    for source in data["sources"]:
        code = REPORT_CODES.get(source["id"])
        if not code:
            continue
        for period in reversed(month_range(source["period"], today)):
            url, pdf = next(
                ((u, b) for u in candidate_urls(code, period) if (b := download(u))), (None, None)
            )
            if not pdf:
                continue
            try:
                prices = extract_prices(pdf)
            except Exception as error:  # noqa: BLE001 - se informa y se sigue con otra fuente
                print(f"[{source['id']}] {period}: no se pudo leer el PDF ({error})")
                failed = True
                break
            if not prices:
                print(f"[{source['id']}] {period}: el PDF no tiene los textos esperados. Revisar a mano: {url}")
                failed = True
                break
            print(f"[{source['id']}] {source['period']} -> {period}: {prices}")
            source.update(period=period, url=url, prices=prices)
            changed = True
            break
        else:
            print(f"[{source['id']}] sin reportes nuevos después de {source['period']}")

    if changed:
        data["updatedAt"] = today.isoformat()
        DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
