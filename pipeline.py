from lib.config import XLXS_PATH, RSS_SOURCES, API_SOURCES
from lib.store import (
    init_workbook, _flush_accumulator, _xl_styles,
    start_background_writer, stop_background_writer,
)
from lib.extract import index_rss_source, index_api_source
from lib.enrich import enrich_from_index
from lib.stats import get_index_stats
import log


def crawl_links(output_path: str = "") -> int:
    if not output_path:
        output_path = XLXS_PATH
    wb = init_workbook(output_path)
    s = _xl_styles()
    total_indexed = 0

    start_background_writer(wb, output_path, s)

    print(f"\n=== PHASE 1a: RSS ({len(RSS_SOURCES)} feeds) ===")
    for src in RSS_SOURCES:
        try:
            total_indexed += index_rss_source(src, wb, output_path, s)
        except Exception as e:
            print(f"  [RSS ERROR] {src['name']}: {e}")

    print(f"\n=== PHASE 1b: API Sources ({len(API_SOURCES)} zones, parallel) ===")
    import concurrent.futures
    api_results = [0] * len(API_SOURCES)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        fut_map = {}
        for idx, src in enumerate(API_SOURCES):
            f = ex.submit(index_api_source, src, wb, output_path, s)
            fut_map[f] = idx
        for f in concurrent.futures.as_completed(fut_map):
            idx = fut_map[f]
            try:
                api_results[idx] = f.result()
            except Exception as e:
                print(f"  [API ERROR] {API_SOURCES[idx]['name']}: {e}")
    total_indexed += sum(api_results)

    stop_background_writer(wb, output_path, s)
    wb.close()
    log.info(f"crawl_links done: {total_indexed} articles indexed")
    print(f"\n=== INDEXING DONE: {total_indexed} total articles indexed ===")
    return total_indexed


def crawl_content(output_path: str = "") -> int:
    if not output_path:
        output_path = XLXS_PATH
    import openpyxl as xl
    wb = xl.load_workbook(output_path)
    s = _xl_styles()
    from lib.store import flush_raw_accumulator
    enriched = enrich_from_index(wb, output_path, s)
    flush_raw_accumulator(wb, output_path, s)
    wb.close()
    log.info(f"crawl_content done: {enriched} enriched")
    return enriched


def daily(output_path: str = "") -> int:
    if not output_path:
        output_path = XLXS_PATH
    from lib.fetch import fetch_url
    from lib.store import _accumulate_entry, _maybe_flush
    import requests
    from lib.config import HEADERS, REQUEST_TIMEOUT
    from lib.extract import extract_cafef_articles, extract_cafebiz_articles, extract_vietnamnet_articles

    log.info(f"daily crawl started")
    wb = init_workbook(output_path)
    s = _xl_styles()
    new_indexed = 0

    print("--- DAILY RSS ---")
    for src in RSS_SOURCES:
        try:
            new_indexed += index_rss_source(src, wb, output_path, s)
        except Exception as e:
            print(f"  RSS error {src['name']}: {e}")
    _flush_accumulator(wb, output_path, s)

    print("--- DAILY API (page 1) ---")
    for src in API_SOURCES:
        try:
            t = src["type"]
            if t == "cafef":
                html = fetch_url(f"{src['domain']}/timelinelist/{src['zone_id']}/1.chn")
                if html:
                    entries = extract_cafef_articles(html, src['domain'], src['name'], src.get('cat', ''))
                    for e in entries:
                        new_indexed += _accumulate_entry(e)
            elif t == "cafebiz":
                html = fetch_url(f"{src['domain']}/timelinelist/{src['zone_id']}/1.htm")
                if html:
                    entries = extract_cafebiz_articles(html, src['domain'], src['name'], src.get('cat', ''))
                    for e in entries:
                        new_indexed += _accumulate_entry(e)
            elif t == "vietnamnet":
                payload = {"WebsiteId":"000003","PageId":"9b31d12ab91146ca8153dbdb6dfe3d29","ComponentId":"COMPONENT002545","CategoryId":src["category_id"],"PageSize":50,"PageIndex":0}
                resp = requests.post("https://vietnamnet.vn/newsapi/CategoryCustom/Gets", json=payload, headers=HEADERS, timeout=REQUEST_TIMEOUT)
                if resp.ok:
                    entries = extract_vietnamnet_articles(resp.json(), src['name'], src.get('cat', ''))
                    for e in entries:
                        new_indexed += _accumulate_entry(e)
        except Exception as e:
            print(f"  API error {src['name']}: {e}")
    _flush_accumulator(wb, output_path, s)

    wb.close()
    log.info(f"daily crawl done: {new_indexed} new articles")
    print(f"Daily crawl: {new_indexed} new articles indexed")
    return new_indexed
