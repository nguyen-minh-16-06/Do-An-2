import time
from email.utils import parsedate_to_datetime

import requests
from bs4 import BeautifulSoup

from lib.config import HEADERS, REQUEST_TIMEOUT, MAX_RETRIES
import log


def fetch_url(url: str) -> str | None:
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException:
            if attempt == MAX_RETRIES - 1:
                return None
            time.sleep(2 ** attempt)


def parse_html(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def strip_html_tags(html_text: str) -> str:
    soup = BeautifulSoup(html_text, "lxml")
    return soup.get_text(separator=" ", strip=True)


def normalize_date(date_str: str) -> str:
    if not date_str:
        return ""
    try:
        dt = parsedate_to_datetime(date_str)
        return dt.isoformat()
    except Exception:
        pass
    return date_str


def fetch_article_content(url: str) -> str | None:
    html = fetch_url(url)
    if html is None:
        log.fetch_result(url, "FAIL", 0)
        return None
    soup = parse_html(html)

    # BỔ SUNG CÁC CLASS ĐẶC TRƯNG CỦA BÁO CHÍ VIỆT NAM
    selectors = [
        "article",
        "main",
        "div[itemprop=articleBody]",
        ".detail-content",  # Class bọc bài viết của CafeF, CafeBiz hiện tại
        ".contentdetail",  # Chuyên mục cũ của CafeF
        ".article-content",  # Cấu trúc của VietnamNet
        ".article-body"  # Các trang báo phổ thông khác
    ]

    container = None
    for selector in selectors:
        container = soup.select_one(selector)
        if container:
            break
    else:
        container = soup.find("body")

    if not container:
        return None

    content = container.get_text(separator=" ", strip=True)
    if len(content) > 10000:
        content = content[:10000]
    log.fetch_result(url, "OK", len(content))
    return content
