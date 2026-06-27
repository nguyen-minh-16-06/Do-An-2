import time

import feedparser
import requests
from bs4 import BeautifulSoup

from lib.config import HEADERS, REQUEST_TIMEOUT
from lib.fetch import fetch_url, parse_html, strip_html_tags, normalize_date
from lib.store import _accumulate_entry, _maybe_flush
import log


def parse_rss_articles(xml_text: str, source_name: str, cat: str) -> list[dict]:
    feed = feedparser.parse(xml_text)
    entries = []
    for entry in feed.entries:
        link = entry.get("link", "").strip()
        if not link:
            continue
        title = strip_html_tags(entry.get("title", ""))
        content_html = (
            entry.get("content", [{}])[0].get("value", "")
            or entry.get("summary", "")
            or entry.get("description", "")
        )
        content = strip_html_tags(content_html)
        date_pub = normalize_date(entry.get("published", ""))
        entries.append({
            "link": link,
            "source": f"RSS:{source_name}",
            "category": cat,
            "title": title,
            "datetime_public": date_pub,
            "status": "new",
        })
    return entries


def index_rss_source(source: dict, wb, output_path: str, s) -> int:
    name = source["name"]
    cat = source.get("cat", "")
    xml_text = fetch_url(source["url"])
    if xml_text is None:
        return 0
    entries = parse_rss_articles(xml_text, name, cat)
    added = 0
    for entry in entries:
        added += _accumulate_entry(entry)
    _maybe_flush(wb, output_path, s)
    if added:
        try:
            print(f"  [RSS] {name}: {len(entries)} found, {added} new")
        except UnicodeEncodeError:
            print(f"  [RSS] (unicode name): {len(entries)} found, {added} new")
        log.rss_fetch(name, source["url"], added)
    return added


def resolve_url(href: str, domain: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return domain + href
    return domain + "/" + href


def extract_cafef_articles(html: str, domain: str, name: str, cat: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    entries = []
    for item in soup.find_all("div", class_="tlitem"):
        h3 = item.find("h3")
        a_tag = h3.find("a") if h3 else None
        if not a_tag:
            continue
        href = a_tag.get("href", "")
        if not href:
            continue
        link = resolve_url(href, domain)
        title = a_tag.get_text(strip=True)
        time_el = item.find("span", class_="time")
        date_str = time_el.get("title", "") if time_el else ""
        entries.append({
            "link": link,
            "source": f"API:{name}",
            "category": cat,
            "title": title,
            "datetime_public": date_str,
            "status": "new",
        })
    return entries


def extract_cafebiz_articles(html: str, domain: str, name: str, cat: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    entries = []
    for item in soup.find_all("li", class_="item"):
        h3 = item.find("h3")
        a_tag = h3.find("a") if h3 else None
        if not a_tag:
            continue
        href = a_tag.get("href", "")
        if not href:
            continue
        link = resolve_url(href, domain)
        title = a_tag.get_text(strip=True)
        time_el = item.find("div", class_="time")
        date_str = time_el.get("title", "") if time_el else ""
        entries.append({
            "link": link,
            "source": f"API:{name}",
            "category": cat,
            "title": title,
            "datetime_public": date_str,
            "status": "new",
        })
    return entries


def extract_vietnamnet_articles(data: dict, name: str, cat: str) -> list[dict]:
    entries = []
    for a in data.get("data", {}).get("model", {}).get("articles", []):
        link = a.get("detailUrl", "")
        if not link:
            continue
        full_link = f"https://vietnamnet.vn{link}" if link.startswith("/") else link
        title = a.get("title", "")
        date_str = a.get("publishDate", "")
        entries.append({
            "link": full_link,
            "source": f"API:{name}",
            "category": cat,
            "title": title,
            "datetime_public": date_str,
            "status": "new",
        })
    return entries


def _api_build_url(source: dict, page: int) -> str:
    t = source["type"]
    if t == "cafef":
        return f"{source['domain']}/timelinelist/{source['zone_id']}/{page}.chn"
    if t == "cafebiz":
        return f"{source['domain']}/timelinelist/{source['zone_id']}/{page}.htm"
    return ""


def _api_fetch(source: dict, page: int):
    t = source["type"]
    if t == "vietnamnet":
        payload = {
            "WebsiteId": "000003",
            "PageId": "9b31d12ab91146ca8153dbdb6dfe3d29",
            "ComponentId": "COMPONENT002545",
            "CategoryId": source["category_id"],
            "PageSize": 50,
            "PageIndex": page,
        }
        try:
            resp = requests.post(
                "https://vietnamnet.vn/newsapi/CategoryCustom/Gets",
                json=payload, headers=HEADERS, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None
    html = fetch_url(_api_build_url(source, page))
    return html


def _api_extract(source: dict, data, page: int) -> list[dict]:
    t = source["type"]
    name = source["name"]
    cat = source.get("cat", "")
    if t == "cafef":
        return extract_cafef_articles(data, source["domain"], name, cat)
    if t == "cafebiz":
        return extract_cafebiz_articles(data, source["domain"], name, cat)
    if t == "vietnamnet":
        if data is None:
            return []
        return extract_vietnamnet_articles(data, name, cat)
    return []


def index_api_source(source: dict, wb, output_path: str, s) -> int:
    name = source["name"]
    t = source["type"]
    total_added = 0
    page = 0 if t == "vietnamnet" else 1
    consecutive_empty = 0
    max_empty = 1 if t != "cafef" else 3

    while True:
        data = _api_fetch(source, page)
        if data is None:
            print(f"  [API] {name}: page {page} FAILED, stopping")
            log.info(f"API {name}: FAILED at page {page}")
            break
        entries = _api_extract(source, data, page)
        if not entries:
            consecutive_empty += 1
            if consecutive_empty >= max_empty:
                if page > (0 if t == "vietnamnet" else 1):
                    print(f"  [API] {name}: {consecutive_empty} empty pages, stopping")
                    log.info(f"API {name}: {consecutive_empty} empty pages at page {page}, stopping")
                break
        else:
            consecutive_empty = 0
            for entry in entries:
                total_added += _accumulate_entry(entry)
        if page % 50 == 0 and total_added:
            log.info(f"API {name}: page {page} -> {total_added} articles")
        _maybe_flush(wb, output_path, s)
        page += 1
        time.sleep(0.15)

    print(f"  [API] {name}: DONE -> {total_added} articles indexed")
    log.info(f"API {name}: DONE -> {total_added} articles")
    return total_added
