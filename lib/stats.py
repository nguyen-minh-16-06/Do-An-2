from collections import Counter
from datetime import datetime

from lib.config import XLXS_PATH, STOCK_CODES
from lib.store import get_source_index_rows


def get_index_stats(output_path: str = ""):
    if not output_path:
        output_path = XLXS_PATH

    import openpyxl as xl
    wb = xl.load_workbook(output_path)
    rows = get_source_index_rows(wb)
    wb.close()

    total = len(rows)
    source_stats: Counter = Counter()
    cat_stats: Counter = Counter()
    status_stats: Counter = Counter()
    year_counts: Counter = Counter()
    date_min = None
    date_max = None
    mention_count = 0

    for r in rows:
        src = r.get("Source", "")
        if src:
            source_stats[src] += 1
        cat = r.get("Category", "")
        if cat:
            cat_stats[cat] += 1
        status = r.get("Status", "")
        if status:
            status_stats[status] += 1
        pub = r.get("Datetime Public", "")
        if pub:
            try:
                d = datetime.fromisoformat(pub.replace("Z", ""))
                year_counts[d.year] += 1
                if date_min is None or d < date_min:
                    date_min = d
                if date_max is None or d > date_max:
                    date_max = d
            except Exception:
                pass

    print(f"\n{'='*60}")
    print(f"  INDEX STATISTICS")
    print(f"{'='*60}")
    print(f"  Total articles indexed: {total:,}")
    print(f"  Date range: {date_min} -> {date_max}" if date_min else "  Date range: N/A")
    print()

    print(f"  --- By Source ---")
    for src, count in source_stats.most_common():
        print(f"    {src:30s} {count:>8,}")
    print()

    print(f"  --- By Category ---")
    for cat, count in cat_stats.most_common():
        print(f"    {cat:30s} {count:>8,}")
    print()

    print(f"  --- By Status ---")
    for st, count in status_stats.most_common():
        print(f"    {st:30s} {count:>8,}")
    print()

    if year_counts:
        print(f"  --- By Year ---")
        for year, count in sorted(year_counts.items()):
            print(f"    {year:30d} {count:>8,}")
        print()

    print(f"{'='*60}\n")
