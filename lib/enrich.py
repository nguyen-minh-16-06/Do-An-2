import concurrent.futures
import log
from lib.config import STOCK_CODES, STOCK_PATTERN, COMPANY_NAME_PATTERNS, BLOCKED_DOMAINS, VIETNAMESE_CHARS
from lib.fetch import fetch_article_content
from lib.config import CONFIG_KEYWORDS_DATA

def detect_mentions_in_text(text: str) -> dict[str, int]:
    upper = text.upper()
    stock_hits = set(STOCK_PATTERN.findall(upper))
    result: dict[str, int] = {}
    for code in STOCK_CODES:
        if code in stock_hits:
            result[code] = 1
        elif COMPANY_NAME_PATTERNS[code].search(upper):
            result[code] = 1
        else:
            result[code] = 0
    return result


def filter_false_positives(mentions: dict[str, int], text: str, link: str) -> dict[str, int]:
    if any(d in link.lower() for d in BLOCKED_DOMAINS):
        return {code: 0 for code in mentions}
    upper = text.upper()
    has_vi = bool(VIETNAMESE_CHARS.search(upper))
    result = dict(mentions)
    for code in STOCK_CODES:
        if result[code] == 1:
            name_matched = bool(COMPANY_NAME_PATTERNS[code].search(upper))
            if not name_matched and not has_vi:
                result[code] = 0
    return result



def enrich_from_index(wb, output_path: str, s: dict, limit: int = 50000) -> int:
    from lib.store import (
        get_source_index_rows,
        _ensure_sheet_exists,
        _flush_accumulator,
        _init_raw_accumulator,
        accumulate_raw_entry,
        maybe_flush_raw,
    )
    _init_raw_accumulator(wb)
    rows = get_source_index_rows(wb)
    candidates = [r for r in rows if r.get("Status") == "new"]

    title_mentioned = []
    for r in candidates:
        title = r.get("Title", "")
        link = r.get("Link", "")
        mentions = detect_mentions_in_text(title)
        filtered = filter_false_positives(mentions, title, link)
        if any(filtered.values()):
            title_mentioned.append(r)

    print(f"\n=== PHASE 2: Enrichment ({len(title_mentioned)} candidates with mention in title) ===")

    enriched_count = 0
    candidates = title_mentioned[:limit]

    def process_one(entry):
        # Đảm bảo đã import từ config
        from lib.config import CONFIG_KEYWORDS_DATA

        link = entry["Link"]
        full_content = fetch_article_content(link)

        if full_content and len(full_content) >= 500:
            text = f"{entry.get('Title', '')} {full_content}"
            mentions = detect_mentions_in_text(text)
            filtered = filter_false_positives(mentions, text, link)
            _update_entry_in_source_index(wb, link, "mentioned")
            tickers_list = [c for c, v in filtered.items() if v]
            tickers = ", ".join(tickers_list)

            # Logic gán nhãn
            matched_kw = ""
            matched_event = ""
            lower_title = entry.get("Title", "").lower()

            # 1. Ưu tiên khớp theo danh sách từ khóa ngành/mã cổ phiếu
            for kw_item in CONFIG_KEYWORDS_DATA:
                if kw_item["keyword"].lower() in lower_title:
                    matched_kw = kw_item["keyword"]
                    matched_event = kw_item["event_type_suggestion"]
                    break

            # 2. Nếu không khớp từ khóa đặc thù, lấy chính mã cổ phiếu làm từ khóa
            if not matched_kw and tickers:
                matched_kw = tickers
                matched_event = "stock_mention, company_news"

            raw_entry = {
                "title": entry.get("Title", ""),
                "summary": full_content[:300],
                "content": full_content,
                "published_date": entry.get("Datetime Public", ""),
                "source": entry.get("Source", ""),
                "url": link,
                "industry_group": "Bán lẻ / Tiêu dùng" if matched_kw else "",
                "tickers": tickers,
                "keywords": matched_kw,
                "event_type": matched_event,
                "crawl_status": "success",
            }
            accumulate_raw_entry(raw_entry)
            return 1
        else:
            _update_entry_in_source_index(wb, link, "failed")
            raw_entry = {
                "title": entry.get("Title", ""),
                "summary": "",
                "content": full_content or "",
                "published_date": entry.get("Datetime Public", ""),
                "source": entry.get("Source", ""),
                "url": link,
                "industry_group": "",
                "tickers": "",
                "keywords": "",
                "event_type": "",
                "crawl_status": "failed" if not full_content else "short_content",
            }
            accumulate_raw_entry(raw_entry)
            return 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        fut_list = [ex.submit(process_one, e) for e in candidates]
        for i, fut in enumerate(concurrent.futures.as_completed(fut_list)):
            enriched_count += fut.result()
            maybe_flush_raw(wb, output_path, s)
            if (i + 1) % 100 == 0:
                print(f"  [ENRICH] processed {i+1}/{len(candidates)}, enriched {enriched_count}")

    _flush_accumulator(wb, output_path, s)
    wb.save(output_path)
    print(f"\n=== ENRICHMENT DONE: {enriched_count} enriched ===")
    log.info(f"Enrichment: {enriched_count} enriched from {len(candidates)} candidates")
    return enriched_count


def _update_entry_in_source_index(wb, link: str, status: str, content_length: int = 0, mentions: dict | None = None, output_path: str = ""):
    from lib.store import SOURCE_INDEX_NAME
    if SOURCE_INDEX_NAME not in wb.sheetnames:
        return 0
    ws = wb[SOURCE_INDEX_NAME]
    headers = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    for r in range(2, ws.max_row + 1):
        v = ws.cell(r, 1).value
        if v and str(v).strip() == link:
            ws.cell(r, 6, value=status)
            if output_path:
                wb.save(output_path)
            return
