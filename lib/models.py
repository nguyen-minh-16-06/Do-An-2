from dataclasses import dataclass
from datetime import datetime

SOURCE_INDEX_HEADERS = [
    "Link",
    "Source",
    "Category",
    "Title",
    "Datetime Public",
    "Status",
]

NEWS_RAW_HEADERS = [
    "news_id",
    "title",
    "summary",
    "content",
    "published_date",
    "source",
    "url",
    "industry_group",
    "tickers",
    "keywords",
    "event_type",
    "crawl_time",
    "content_hash",
    "crawl_status",
    "error_message",
    "checked_by",
    "checked_time",
    "note",
]

CONFIG_SOURCES_HEADERS = [
    "source_id",
    "source_name",
    "base_url",
    "search_url_pattern",
    "category_url",
    "category_tags",
    "type",
    "has_rss",
    "has_api",
    "allowed_to_crawl",
    "crawl_method",
    "articles_estimate",
    "note",
]

CONFIG_KEYWORDS_HEADERS = [
    "keyword_id",
    "keyword",
    "industry_group",
    "related_tickers",
    "event_type_suggestion",
    "priority",
    "note",
]

CRAWL_LOG_HEADERS = [
    "log_id",
    "log_date",
    "member",
    "source",
    "keyword_group",
    "date_range_from",
    "date_range_to",
    "records_found",
    "records_added",
    "duplicates",
    "failed",
    "status",
    "note",
]

DAILY_SUMMARY_HEADERS = [
    "date",
    "total_records",
    "new_records_today",
    "sources_updated",
    "date_coverage_from",
    "date_coverage_to",
    "missing_days",
    "duplicate_count",
    "issue_status",
    "next_action",
]

DATA_QUALITY_CHECK_HEADERS = [
    "check_id",
    "check_date",
    "checked_by",
    "total_records",
    "missing_title",
    "missing_url",
    "missing_published_date",
    "missing_content",
    "duplicated_url",
    "duplicated_content_hash",
    "wrong_date_format",
    "note",
]

README_HEADERS = [
    "field",
    "value",
]

README_ROWS = [
    ["group_id", "Nhóm 4"],
    ["group_name", "Nhóm 4 - Bán lẻ – Tiêu dùng – Thực phẩm – Dược phẩm"],
    ["members", "Nguyễn Chí Hiếu, Hoàng Thị Hương Giang"],
    ["leader", "Lê Nguyên Minh"],
    ["project_start_date", "04/06/2026"],
    ["update_frequency", "Daily (Cập nhật tự động lúc 20:00 - 21:00 hằng ngày)"],
    ["data_sources",
     "15 nguồn tin: CafeF, CafeBiz, VnExpress, VietnamNet, VnEconomy, VnBusiness, Dân trí, Doanh nghiệp VN, Sức Khỏe & Đời Sống, ZNEWS, Soha, Đầu Tư VN, Đời Sống VN, Tuổi Trẻ, Thanh Niên"],
    ["crawl_method", "RSS (21 feeds) + API (3 zones) - 8 workers parallel"],
    ["enrichment_method", "Title scan -> Content fetch -> ThreadPoolExecutor 8 workers"],
    ["data_coverage_source_index", "Đang cập nhật (chờ lần chạy đầu tiên)"],
    ["data_coverage_news_raw", "Đang cập nhật (chờ lần chạy đầu tiên)"],
    ["stock_codes_monitored", "MWG, FRT, DGW, PNJ, MSN, VNM, SAB, SBT, QNS, DBC, VHC, ANV, DHG, IMP, TRA (15 codes)"],
    ["ticker_mention_top5", "Đang cập nhật"],
    ["top_sources", "Đang cập nhật"],
    ["sheets_description",
     "COMPANY_INFO: 15 companies | SOURCE_LIST: 15 sources | SOURCE_INDEX: Danh sách links (6 cols) | NEWS_RAW: Dữ liệu bài viết chi tiết (18 cols) | CONFIG_SOURCES: Cấu hình 15 nguồn | CONFIG_KEYWORDS: Cấu hình từ khóa | CRAWL_LOG: Crawl history | DAILY_SUMMARY: Progress | DATA_QUALITY_CHECK: Quality | README: This sheet"],
    ["news_raw_columns",
     "news_id, title, summary, content, published_date, source, url, industry_group, tickers, keywords, event_type, crawl_time, content_hash, crawl_status, error_message, checked_by, checked_time, note"],
    ["quality_metrics", "Đang cập nhật"],
    ["spreadsheet_owner", "nguyenminh01062005@gmail.com"],
    ["github_link", "https://hub.aka.vn/projects/nhom-ban-le-tieu-dung-thuc-pham-duoc-pham"],
    ["note",
     "Bộ dữ liệu tài chính phục vụ đồ án thu thập và phân tích dữ liệu chuyên ngành Khoa học dữ liệu, Khoa Kỹ thuật và Công nghệ - Đại học Huế. CLI: python main.py {crawl-links, crawl-content, daily, stats}"],
]