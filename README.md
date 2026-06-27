# Nhóm 4: Bán lẻ – Tiêu dùng – Thực phẩm – Dược phẩm

Crawl tin tức từ **24 nguồn** (21 RSS + 3 API) cho **15 mã cổ phiếu** Bán lẻ – Tiêu dùng – Thực phẩm – Dược phẩm.

## Kiến trúc

### Python (crawl lịch sử)

```
main.py ──► pipeline.py ──► lib/ (config, models, fetch, extract, store, enrich, stats)

crawl-links:    RSS (21) + API(3) ──► SOURCE_INDEX (33k+)
crawl-content:  title scan (STOCK_PATTERN) ──► fetch content ──► NEWS_RAW (508 articles)
daily:          RSS latest + API page 1 ──► SOURCE_INDEX (append)
```

### GAS (chạy hàng ngày trên cloud)

```
GS/Code.gs ──► daily()
  B1: crawl RSS (21 feeds) + API (3 zones, page 1)
  B2: keyword filter (findMatchingKeyword)
  B3: date filter (isRecentDate — hôm qua / hôm nay)
  B4: dedup by URL + content_hash
  B5: flush → SOURCE_INDEX + NEWS_RAW
  B6: ghi CRAWL_LOG
  B7: cập nhật DAILY_SUMMARY
```

## Sheets (10 tabs trong Google Sheets)

| Sheet | Mô tả |
|-------|-------|
| COMPANY_INFO | Thông tin 15 công ty |
| SOURCE_LIST | Danh sách 15 nguồn tin |
| SOURCE_INDEX | 32,682 link đã crawl |
| NEWS_RAW | 508 bài đã thêm vào (18 cột) |
| CONFIG_SOURCES | Cấu hình nguồn |
| CONFIG_KEYWORDS | 44 từ khóa + mã CP |
| CRAWL_LOG | Lịch sử chạy daily |
| DAILY_SUMMARY | Tổng kết theo ngày |
| DATA_QUALITY_CHECK | Kiểm tra chất lượng |
| README | Mô tả bộ dữ liệu |

## Mã cổ phiếu theo dõi (15)

MWG, FRT, DGW, PNJ, MSN, VNM, SAB, SBT, QNS, DBC, VHC, ANV, DHG, IMP, TRA

## Thư mục

| Path | Mô tả |
|------|-------|
| `GS/` | Google Apps Script (9 files) |
| `lib/` | Python modules |
| `data/` | xlsx đầu ra + báo cáo |
| `log/` | Crawl logs |

## GAS Deployment

- **Spreadsheet**: `K4_CRAWL_NHOM_4_BANLE_TIEUDUNG_DUOCPHAM` (Google Sheets)
- **Script**: Bound script, trigger daily lúc 08:00 và 20:00
- **Push**: `cd GS && clasp push`

## Dependencies (Python)

```bash
pip install requests feedparser beautifulsoup4 lxml openpyxl
```

## Commands

```bash
python main.py crawl-links    # Crawl lịch sử (RSS + multi-page API)
python main.py crawl-content  # Enrich → NEWS_RAW
python main.py daily          # Incremental daily
python main.py stats          # Thống kê
```
