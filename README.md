# Nhóm 4: Bán lẻ – Tiêu dùng – Thực phẩm – Dược phẩm

Hệ thống thu thập và xử lý tin tức phục vụ phân tích nhóm ngành Bán lẻ – Tiêu dùng – Thực phẩm – Dược phẩm. Dữ liệu được lấy từ 24 nguồn tin (21 RSS và 3 API), theo dõi 15 mã cổ phiếu, sau đó lưu trữ và cập nhật vào Google Sheets.

## Kiến trúc

### Python (crawl lịch sử)

```
main.py ──► pipeline.py ──► lib/ (config, models, fetch, extract, store, enrich, stats)
```

### Các chế độ hoạt động:

| Command | Chức năng |
|-------|-------|
| crawl-links |	Thu thập liên kết từ 21 RSS và 3 API, lưu vào SOURCE_INDEX (~33K liên kết) |
| crawl-content | Lấy nội dung bài viết, lọc theo STOCK_PATTERN và ghi vào NEWS_RAW (508 bài) |
| daily	| Cập nhật dữ liệu mới hằng ngày từ RSS và trang đầu của API |

### GAS (chạy hàng ngày trên Google App Scripts)

```
daily()
  ├── Crawl RSS + API
  ├── Keyword Filtering
  ├── Date Validation
  ├── Remove Duplicates
  ├── Update SOURCE_INDEX
  ├── Update NEWS_RAW
  ├── Write CRAWL_LOG
  └── Generate DAILY_SUMMARY
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
| `lib/` | Các module xử lý dữ liệu |

## Triển khai Google Apps Script

- **Spreadsheet**: `K4_CRAWL_NHOM_4_BANLE_TIEUDUNG_DUOCPHAM` (Google Sheets)
- **Script**: Bound script, trigger daily lúc 08:00 và 20:00

## Thư viện sử dụng

```bash
pip install requests feedparser beautifulsoup4 lxml openpyxl
```

## Commands

```bash
python main.py crawl-links    # Crawl lịch sử (RSS + multi-page API)
python main.py crawl-content  # Phân tích nội dung bài viết
python main.py daily          # Cập nhật dữ liệu hằng ngày
python main.py stats          # Thống kê
```
