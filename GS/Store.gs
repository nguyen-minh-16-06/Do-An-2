function initWorkbook() {
  var ss = getSS();
  ensureAllSheets(ss);
  return ss;
}

function ensureAllSheets(ss) {
  ensureSheet(ss, COMPANY_INFO_NAME, ["M\u00e3 CK","T\u00ean \u0111\u1ea7y \u0111\u1ee7","T\u00ean ti\u1ebfng Anh","T\u00ean c\u0169","S\u00e0n","Ng\u00e0nh","Website","Th\u00e0nh l\u1eadp","Nh\u00e2n s\u1ef1","Kinh doanh ch\u00ednh","T\u1eeb kh\u00f3a"], COMPANY_INFO.map(function(ci) {
    return [ci.code, ci.full_name, ci.english_name, ci.former_name, ci.exchange, ci.industry, ci.website, ci.established, ci.employees, ci.business, ci.keywords];
  }));
  ensureSheet(ss, NGUON_TIN_NAME, ["STT","T\u00ean trang","Domain","Chuy\u00ean m\u1ee5c","Lo\u1ea1i","RSS","S\u1ed1 b\u00e0i","Ghi ch\u00fa"], SOURCE_INFO.map(function(si, i) {
    return [i + 1, si.name, si.domain, si.categories, si.type, si.rss, si.articles, si.note];
  }));
  ensureSheet(ss, SOURCE_INDEX_NAME, SOURCE_INDEX_HEADERS, []);
  ensureSheet(ss, NEWS_RAW_NAME, NEWS_RAW_HEADERS, []);
  ensureSheet(ss, CONFIG_SOURCES_NAME, CONFIG_SOURCES_HEADERS, SOURCE_INFO.map(function(si) {
    var methods = [];
    if (si.has_rss) methods.push("rss");
    if (si.has_api) methods.push("api");
    if (methods.length === 0) methods.push("manual");
    return [
      si.name.toUpperCase().replace(/[ .&]/g, "_"),
      si.name,
      "https://" + si.domain,
      "", "",
      si.categories,
      si.type,
      si.has_rss ? "yes" : "no",
      si.has_api ? "yes" : "no",
      "yes",
      methods.join("/"),
      si.articles || "",
      si.note || ""
    ];
  }));
  ensureSheet(ss, CONFIG_KEYWORDS_NAME, CONFIG_KEYWORDS_HEADERS, CONFIG_KEYWORDS_DATA.map(function(kw) {
    return [kw.keyword_id, kw.keyword, kw.industry_group, kw.related_tickers, kw.event_type_suggestion, kw.priority, kw.note];
  }));
  ensureSheet(ss, CRAWL_LOG_NAME, CRAWL_LOG_HEADERS, []);
  ensureSheet(ss, DAILY_SUMMARY_NAME, DAILY_SUMMARY_HEADERS, []);
  ensureSheet(ss, DATA_QUALITY_NAME, DATA_QUALITY_CHECK_HEADERS, []);
  ensureSheet(ss, README_NAME, README_HEADERS, README_ROWS);
}

function ensureSheet(ss, name, headers, rows) {
  var ws = ss.getSheetByName(name);
  if (!ws) {
    ws = ss.insertSheet(name);
    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    ws.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1F4E79").setFontColor("#FFFFFF");
  }
  if (rows && rows.length > 0) {
    var lastRow = ws.getLastRow();
    if (lastRow < 2) {
      ws.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  }
}

function getExistingLinks(ss) {
  var existing = {};
  var ws = ss.getSheetByName(SOURCE_INDEX_NAME);
  if (!ws) return existing;
  var lastRow = ws.getLastRow();
  if (lastRow < 2) return existing;
  var urls = ws.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < urls.length; i++) {
    var v = urls[i][0];
    if (v) existing[String(v).trim()] = true;
  }
  return existing;
}

function getExistingHashes(ss) {
  var existing = {};
  var ws = ss.getSheetByName(NEWS_RAW_NAME);
  if (!ws) return existing;
  var lastRow = ws.getLastRow();
  if (lastRow < 2) return existing;
  var hashes = ws.getRange(2, 13, lastRow - 1, 1).getValues();
  for (var i = 0; i < hashes.length; i++) {
    var v = hashes[i][0];
    if (v) existing[String(v).trim()] = true;
  }
  return existing;
}

function makeNewsId(source, pubDate, url) {
  var prefix = (source || "").split(" ")[0].toUpperCase().slice(0, 8);
  var datePart = "00000000";

  if (pubDate) {
    var strDate = "";
    if (Object.prototype.toString.call(pubDate) === '[object Date]') {
      strDate = Utilities.formatDate(pubDate, "GMT+7", "yyyy-MM-dd");
    } else {
      strDate = String(pubDate).trim();
    }

    var d = strDate.slice(0, 10).replace(/-/g, "");
    if (d.length === 8) datePart = d;
  }

  var h = md5Hash(url || "").slice(0, 6);
  return prefix + "_" + datePart + "_" + h;
}

var _idxAccumulator = [];
var _idxFlushCounter = 0;

function accumulateEntry(entry) {
  var link = (entry.link || "").trim();
  if (!link) return 0;
  _idxAccumulator.push([
    link,
    entry.source || "",
    entry.category || "",
    entry.title || "",
    entry.datetime_public || "",
    entry.status || "new"
  ]);
  _idxFlushCounter++;
  return 1;
}

function flushAccumulator(ss) {
  if (_idxAccumulator.length === 0) return 0;
  var ws = ss.getSheetByName(SOURCE_INDEX_NAME);
  if (!ws) return 0;
  var lastRow = ws.getLastRow();
  var n = _idxAccumulator.length;
  ws.getRange(lastRow + 1, 1, n, 6).setValues(_idxAccumulator);
  var count = n;
  _idxAccumulator = [];
  _idxFlushCounter = 0;
  SpreadsheetApp.flush();
  return count;
}

var _rawAccumulator = [];
var _rawFlushCounter = 0;

function accumulateRawEntry(entry) {
  var url = (entry.url || "").trim();
  if (!url) return 0;

  var h = md5Hash(url).slice(0, 6);
  var newsId = makeNewsId(entry.source || "", entry.published_date || "", url);
  var now = new Date();
  var ts = now.toISOString().slice(0, 19).replace("T", " ");

  // 1. LẤY DỮ LIỆU THÔ
  var rawSummary = entry.summary ? String(entry.summary).trim() : "";
  var rawContent = entry.content ? String(entry.content).trim() : "";

  // 2. LOGIC ĐẮP VÁ (FALLBACK): Nếu content trống mà summary có chữ, lấy summary đắp vào
  if (rawContent === "" && rawSummary !== "") {
    rawContent = rawSummary;
  }

  // 3. LÀM SẠCH HTML (Bảo vệ sheet khỏi rác code)
  var finalSummary = cleanHtmlContent(rawSummary);
  var finalContent = cleanHtmlContent(rawContent);

  _rawAccumulator.push([
    newsId,
    entry.title || "",
    finalSummary,
    finalContent, // Đã được làm sạch và đắp vá nếu cần
    entry.published_date || "",
    entry.source || "",
    url,
    entry.industry_group || "",
    entry.tickers || "",
    entry.keywords || "",
    entry.event_type || "",
    ts,
    h,
    entry.crawl_status || "new",
    entry.error_message || "",
    "", "", ""
  ]);

  _rawFlushCounter++;
  return 1;
}

function flushRawAccumulator(ss) {
  if (_rawAccumulator.length === 0) return 0;
  var ws = ss.getSheetByName(NEWS_RAW_NAME);
  if (!ws) return 0;
  var lastRow = ws.getLastRow();
  var n = _rawAccumulator.length;
  ws.getRange(lastRow + 1, 1, n, 18).setValues(_rawAccumulator);
  var count = n;
  _rawAccumulator = [];
  _rawFlushCounter = 0;
  SpreadsheetApp.flush();
  return count;
}

function appendCrawlLog(ss, entry) {
  var ws = ss.getSheetByName(CRAWL_LOG_NAME);
  if (!ws) return;
  var lastRow = ws.getLastRow();
  var logId = "CL" + ("00000" + (lastRow)).slice(-5);
  var now = new Date();
  var dateStr = now.toISOString().slice(0, 10);
  var row = [
    logId,
    entry.log_date || dateStr,
    entry.member || "",
    entry.source || "",
    entry.keyword_group || "",
    entry.date_range_from || "",
    entry.date_range_to || "",
    entry.records_found || 0,
    entry.records_added || 0,
    entry.duplicates || 0,
    entry.failed || 0,
    entry.status || "done",
    entry.note || ""
  ];
  ws.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
}

function updateDailySummary(ss, entry) {
  var ws = ss.getSheetByName(DAILY_SUMMARY_NAME);
  if (!ws) return;
  var lastRow = ws.getLastRow();
  var now = new Date();
  var dateStr = now.toISOString().slice(0, 10);
  var row = [
    entry.date || dateStr,
    entry.total_records || 0,
    entry.new_records_today || 0,
    entry.sources_updated || "",
    entry.date_coverage_from || "",
    entry.date_coverage_to || "",
    entry.missing_days || "",
    entry.duplicate_count || 0,
    entry.issue_status || "",
    entry.next_action || ""
  ];
  ws.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
}

function getSourceIndexRows(ss) {
  var ws = ss.getSheetByName(SOURCE_INDEX_NAME);
  if (!ws) return [];
  var lastRow = ws.getLastRow();
  if (lastRow < 2) return [];
  var data = ws.getRange(2, 1, lastRow - 1, 6).getValues();
  return data.map(function(r) {
    return {
      Link: r[0], Source: r[1], Category: r[2], Title: r[3],
      "Datetime Public": r[4], Status: r[5]
    };
  });
}

function updateEntryStatus(ss, link, status) {
  var ws = ss.getSheetByName(SOURCE_INDEX_NAME);
  if (!ws) return;
  var lastRow = ws.getLastRow();
  if (lastRow < 2) return;
  var urls = ws.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < urls.length; i++) {
    if (String(urls[i][0]).trim() === link) {
      ws.getRange(i + 2, 6).setValue(status);
      return;
    }
  }
}
