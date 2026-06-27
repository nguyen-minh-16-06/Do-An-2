var _stats = null;

function daily() {
  logInfo("'=== DAILY CRAWL STARTED ===");
  // 1. Lấy mốc thời gian bắt đầu (tính bằng mili-giây)
  var startTimeMs = new Date().getTime();

  var ss = initWorkbook();
  var existingLinks = getExistingLinks(ss);

  _stats = { found: 0, added: 0, matchedNewsraw: 0, oldSkipped: 0, dupByHash: 0, failed: 0, sourcesUpdated: 0 };

  // 2. CHUẨN HÓA MÚI GIỜ VIỆT NAM (Khắc phục lỗi bỏ qua tin buổi sáng)
  var today = new Date();
  var todayStr = Utilities.formatDate(today, "GMT+7", "yyyy-MM-dd");
  var yesterday = new Date(today.getTime() - 86400000);
  var yesterdayStr = Utilities.formatDate(yesterday, "GMT+7", "yyyy-MM-dd");

  logInfo("--- B1: Crawl RSS (" + RSS_SOURCES.length + " feeds) ---");
  for (var i = 0; i < RSS_SOURCES.length; i++) {
    crawlRssSource(RSS_SOURCES[i], existingLinks, yesterdayStr, todayStr);

    // 3. CƠ CHẾ NGẮT GIỜ THÔNG MINH
    var elapsedSeconds = (new Date().getTime() - startTimeMs) / 1000;
    if (elapsedSeconds > 360) { // Nếu đã chạy quá 6 phút
      logInfo(Math.round(elapsedSeconds));
      break;
    }
  }

  logInfo("--- B2: Crawl API page 1 (" + API_SOURCES.length + " zones) ---");
  for (var j = 0; j < API_SOURCES.length; j++) {
    crawlApiPage1(API_SOURCES[j], existingLinks, yesterdayStr, todayStr);

    var elapsedSecondsAPI = (new Date().getTime() - startTimeMs) / 1000;
    if (elapsedSecondsAPI > 300) {
      break;
    }
  }

  logInfo("--- B5: Flush ra sheets ---");
  var nIdx = flushAccumulator(ss);
  var nRaw = flushRawAccumulator(ss);
  logInfo("SOURCE_INDEX +" + nIdx + ", NEWS_RAW +" + nRaw);

  var totalRecords = 0;
  var ws = ss.getSheetByName(SOURCE_INDEX_NAME);
  if (ws) totalRecords = ws.getLastRow() - 1;

  logInfo("--- B6: Ghi CRAWL_LOG ---");
  appendCrawlLog(ss, {
    log_date: todayStr,
    member: "GAS_Daily",
    source: "All (" + RSS_SOURCES.length + " RSS + " + API_SOURCES.length + " API)",
    keyword_group: "Bán lẻ, Tiêu dùng, Thực phẩm, Dược phẩm",
    date_range_from: todayStr,
    date_range_to: todayStr,
    records_found: _stats.found,
    records_added: _stats.added,
    duplicates: _stats.found - _stats.added + _stats.dupByHash,
    failed: _stats.failed,
    status: "done",
    note: "matched=" + _stats.matchedNewsraw + ", old_skipped=" + _stats.oldSkipped
  });

  logInfo("--- B7: Cập nhật DAILY_SUMMARY ---");
  updateDailySummary(ss, {
    date: todayStr,
    total_records: totalRecords,
    new_records_today: _stats.matchedNewsraw,
    sources_updated: _stats.sourcesUpdated,
    date_coverage_from: yesterdayStr,
    date_coverage_to: todayStr,
    missing_days: "",
    duplicate_count: _stats.found - _stats.added + _stats.dupByHash,
    issue_status: _stats.failed > 0 ? "WARN: " + _stats.failed + " failed" : "OK",
    next_action: "Daily " + todayStr
  });

  runDataQualityCheck(ss, todayStr);

  flushLog();

  var elapsedFinal = (new Date().getTime() - startTimeMs) / 1000;
  logInfo("=== DAILY DONE: found=" + _stats.found + " added=" + _stats.added +
    " old_skipped=" + _stats.oldSkipped + " matched_newsraw=" + _stats.matchedNewsraw +
    " (" + Math.round(elapsedFinal) + "s) ===");
}

function isRecentDate(pubDate, yesterdayStr, todayStr) {
  if (!pubDate) return true;
  var d = pubDate.slice(0, 10);
  return d === todayStr || d === yesterdayStr;
}

function processNewEntry(entry, existingLinks, yesterdayStr, todayStr) {
  var link = (entry.link || "").trim();
  if (!link) return;
  if (existingLinks[link]) return;

  existingLinks[link] = true;
  _stats.found++;

  var pubDate = normalizeDate(entry.datetime_public || "");
  if (!isRecentDate(pubDate, yesterdayStr, todayStr)) {
    _stats.oldSkipped++;
    return;
  }

  _stats.added++;

  accumulateEntry(entry);

  var title = entry.title || "";
  var kw = findMatchingKeyword(title);
  if (kw) {
    accumulateRawEntry({
      title: title,
      summary: entry.summary || "",
      content: "",
      published_date: pubDate,
      source: entry.source || "",
      url: link,
      industry_group: kw.industry_group,
      tickers: kw.related_tickers,
      keywords: kw.keyword,
      event_type: kw.event_type_suggestion,
      crawl_status: "keyword_matched"
    });
    _stats.matchedNewsraw++;
  } else {
    var mentions = detectMentionsInText(title);
    var filtered = filterFalsePositives(mentions, title, link);
    var tickers = [];
    for (var code in filtered) {
      if (filtered[code]) tickers.push(code);
    }
    if (tickers.length > 0) {
      accumulateRawEntry({
        title: title,
        summary: entry.summary || "",
        content: "",
        published_date: pubDate,
        source: entry.source || "",
        url: link,
        industry_group: "Bán lẻ / Tiêu dùng",
        tickers: tickers.join(", "),
        keywords: tickers.join(", "),
        event_type: "stock_mention, company_news",
        crawl_status: "stock_detected"
      });
      _stats.matchedNewsraw++;
    }
  }
}

function crawlRssSource(rssEntry, existingLinks, yesterdayStr, todayStr) {
  try {
    var xmlText = fetchUrl(rssEntry.url);
    if (!xmlText) return;
    var entries = parseRssArticles(xmlText, rssEntry.name, rssEntry.cat || "");
    for (var i = 0; i < entries.length; i++) {
      processNewEntry(entries[i], existingLinks, yesterdayStr, todayStr);
    }
    _stats.sourcesUpdated++;
  } catch (e) {
    logWarn("RSS error [" + rssEntry.name + "]: " + e.message);
    _stats.failed++;
  }
}

function crawlApiPage1(src, existingLinks, yesterdayStr, todayStr) {
  try {
    var t = src.type;
    var data, entries;
    if (t === "cafef" || t === "cafebiz") {
      var url = apiBuildUrl(src, 1);
      if (!url) return;
      var html = fetchUrl(url);
      if (!html) return;
      if (t === "cafef") entries = extractCafefArticles(html, src.domain, src.name, src.cat || "");
      else entries = extractCafebizArticles(html, src.domain, src.name, src.cat || "");
    } else if (t === "vietnamnet") {
      data = apiFetch(src, 0);
      if (!data) return;
      entries = extractVietnamnetArticles(data, src.name, src.cat || "");
    } else return;
    for (var i = 0; i < entries.length; i++) {
      processNewEntry(entries[i], existingLinks, yesterdayStr, todayStr);
    }
    _stats.sourcesUpdated++;
  } catch (e) {
    logWarn("API error [" + src.name + "]: " + e.message);
    _stats.failed++;
  }
}

function crawlLinks() {
  logInfo("=== FULL CRAWL LINKS STARTED ===");
  var ss = initWorkbook();
  var existingLinks = getExistingLinks(ss);
  var totalAdded = 0;
  var stateKey = "CRAWL_LINKS_STATE";
  var props = PropertiesService.getScriptProperties();
  var stateStr = props.getProperty(stateKey);
  var state = stateStr ? JSON.parse(stateStr) : null;

  var allSources = RSS_SOURCES.concat(API_SOURCES.map(function(a) {
    return { name: a.name, url: apiBuildUrl(a, 1), cat: a.cat, isApi: true, apiSource: a };
  }));
  RSS_SOURCES.forEach(function(r) {
    r.isApi = false;
  });

  var idx = state ? state.idx : 0;
  var recurse = state ? state.recurse : false;
  var apiIdx = state ? state.apiIdx : 0;

  logInfo("Resuming from source index " + idx + ", api index " + apiIdx);

  for (var i = idx; i < RSS_SOURCES.length; i++) {
    indexRssSource(RSS_SOURCES[i], existingLinks, ss);
    props.setProperty(stateKey, JSON.stringify({ idx: i + 1, apiIdx: apiIdx, recurse: false }));
    if (remainingTime() < 60) {
      logInfo("Pausing RSS at index " + (i + 1) + " - time running low");
      flushAccumulator(ss);
      logInfo("Resume trigger scheduled");
      return;
    }
  }

  for (var j = apiIdx; j < API_SOURCES.length; j++) {
    indexApiSource(API_SOURCES[j], existingLinks, ss, true);
    props.setProperty(stateKey, JSON.stringify({ idx: RSS_SOURCES.length, apiIdx: j + 1, recurse: true }));
    if (remainingTime() < 60) {
      logInfo("Pausing API at index " + (j + 1) + " - time running low");
      flushAccumulator(ss);
      return;
    }
  }

  flushAccumulator(ss);
  props.deleteProperty(stateKey);

  logInfo("=== FULL CRAWL LINKS DONE: " + totalAdded + " total ===");
}

function crawlContent() {
  logInfo("=== CRAWL CONTENT STARTED ===");
  var ss = initWorkbook();
  var enriched = enrichFromIndex(ss, 500);
  logInfo("=== CRAWL CONTENT DONE: " + enriched + " enriched ===");
}

function testDiagnostic() {
  var LOG = function(level, msg) {
    var ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    var row = [ts, level, msg];
    try {
      var sh = getSS().getSheetByName("_LOG");
      if (!sh) {
        sh = getSS().insertSheet("_LOG");
        sh.appendRow(["Timestamp", "Level", "Message"]);
      }
      sh.appendRow(row);
    } catch (e) {
      console.log("[DIAG] " + level + " " + msg + " (write error: " + e.message + ")");
    }
  };

  try {
    LOG("INFO", "=== DIAGNOSTIC START ===");
    var ss = getSS();
    LOG("INFO", "SS OK: " + ss.getName() + " sheets=" + ss.getSheets().length);

    LOG("INFO", "Fetch RSS: https://cafef.vn/bat-dong-san.rss");
    var xmlText = fetchUrl("https://cafef.vn/bat-dong-san.rss");
    LOG("INFO", "fetchUrl returned: " + (xmlText ? xmlText.length + " chars" : "NULL"));
    if (xmlText && xmlText.length > 50) {
      try {
        var doc = XmlService.parse(xmlText);
        var root = doc.getRootElement();
        var channel = root.getChild("channel") || root;
        var items = channel.getChildren("item");
        LOG("INFO", "Parsed OK: " + items.length + " items");
        if (items.length > 0) {
          var title = getChildText(items[0], "title");
          var pubDate = getChildText(items[0], "pubDate");
          LOG("INFO", "Item 0: " + (title || "").slice(0, 60));
          LOG("INFO", "  date=" + (pubDate || "N/A") + " recent=" + isRecentDate(pubDate || ""));
        }
      } catch (e) {
        LOG("ERROR", "Xml parse: " + e.message);
        LOG("INFO", "First 200: " + xmlText.slice(0, 200));
      }
    } else {
      LOG("INFO", "Raw response: " + (xmlText || "").slice(0, 200));
    }

    LOG("INFO", "Fetch API: cafef zoneId=18835");
    var apiText = fetchUrl("https://cafef.vn/ajax/timelinelist.chn?zoneId=18835&page=1&pageSize=15");
    LOG("INFO", "API cafef: " + (apiText ? apiText.length + " chars" : "NULL"));
    if (apiText) LOG("INFO", "  first 150: " + apiText.slice(0, 150));
  } catch (e) {
    LOG("ERROR", "UNCAUGHT: " + e.message);
  }
  LOG("INFO", "=== DIAGNOSTIC END ===");
}

function testSimple() {
  var msg = "OK: " + getSS().getName() + " sheets=" + getSS().getSheets().length;
  SpreadsheetApp.getUi().alert(msg);
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var hasDaily = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "daily") hasDaily = true;
  }
  if (!hasDaily) {
    ScriptApp.newTrigger("daily").timeBased().everyDays(1).atHour(8).create();

    ScriptApp.newTrigger("daily").timeBased().everyDays(1).atHour(20).create();

    logInfo("Daily triggers created (08:00 and 20:00)");
  } else {
    logInfo("Daily triggers already exist");
  }
}

function runDataQualityCheck(ss, todayStr) {
  logInfo("--- B8: Thực hiện Data Quality Check ---");

  var rawSheet = ss.getSheetByName("NEWS_RAW");
  var qcSheet = ss.getSheetByName("DATA_QUALITY_CHECK");

  if (!rawSheet || !qcSheet) {
    logWarn("Không tìm thấy sheet NEWS_RAW hoặc DATA_QUALITY_CHECK");
    return;
  }

  var data = rawSheet.getDataRange().getValues();
  if (data.length <= 1) {
    logInfo("NEWS_RAW trống, bỏ qua kiểm tra chất lượng.");
    return;
  }

  var headers = data[0];

    var colIdx = {
    title: headers.indexOf("title"),
    url: headers.indexOf("url"),
    pubDate: headers.indexOf("published_date"),
    content: headers.indexOf("content"),
    hash: headers.indexOf("content_hash")
  };

  var totalRecords = data.length - 1;
  var missingTitle = 0;
  var missingUrl = 0;
  var missingPubDate = 0;
  var missingContent = 0;
  var wrongDateFormat = 0;

  var seenUrls = {};
  var duplicatedUrl = 0;

  var seenHashes = {};
  var duplicatedHash = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var title = row[colIdx.title] ? String(row[colIdx.title]).trim() : "";
    var url = row[colIdx.url] ? String(row[colIdx.url]).trim() : "";
    var pubDate = row[colIdx.pubDate] ? String(row[colIdx.pubDate]).trim() : "";
    var content = row[colIdx.content] ? String(row[colIdx.content]).trim() : "";
    var hash = row[colIdx.hash] ? String(row[colIdx.hash]).trim() : "";

    if (!title) missingTitle++;
    if (!url) missingUrl++;
    if (!pubDate) missingPubDate++;
    if (!content) missingContent++;

    if (pubDate) {
      var parsedDate = new Date(pubDate);
      if (parsedDate.toString() === "Invalid Date") {
        wrongDateFormat++;
      }
    }

    if (url) {
      if (seenUrls[url]) duplicatedUrl++;
      else seenUrls[url] = true;
    }

    if (hash) {
      if (seenHashes[hash]) duplicatedHash++;
      else seenHashes[hash] = true;
    }
  }

  var errorSum = missingTitle + missingUrl + missingPubDate + duplicatedUrl + wrongDateFormat;
  var note = "PASSED";
  if (errorSum > 0) note = "WARNING: Phân mảnh dữ liệu (" + errorSum + " lỗi)";
  if (missingContent > totalRecords * 0.5) note = "CRITICAL: Quá nửa dữ liệu trống nội dung";

  // Tạo ID bài kiểm tra ngẫu nhiên theo ngày
  var timestampStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HHmmss");
  var checkId = "QC_" + todayStr.replace(/-/g, "") + "_" + timestampStr;

  var rowData = [
    checkId,                    // check_id
    todayStr,                   // check_date
    "System_Auto",              // checked_by
    totalRecords,               // total_records
    missingTitle,               // missing_title
    missingUrl,                 // missing_url
    missingPubDate,             // missing_published_date
    missingContent,             // missing_content
    duplicatedUrl,              // duplicated_url
    duplicatedHash,             // duplicated_content_hash
    wrongDateFormat,            // wrong_date_format
    note                        // note
  ];

  qcSheet.appendRow(rowData);
  logInfo("Đã ghi báo cáo Quality Check: " + note);
}

function fixAllDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Cấu hình danh sách các sheet và cột cần dọn dẹp
  var configs = [
    { sheetName: "NEWS_RAW", colName: "published_date" },
    { sheetName: "SOURCE_INDEX", colName: "Datetime Public" }
  ];

  var totalUpdated = 0;

  for (var c = 0; c < configs.length; c++) {
    var sheet = ss.getSheetByName(configs[c].sheetName);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var dateColIdx = headers.indexOf(configs[c].colName);
    if (dateColIdx === -1 && configs[c].fallbackColName) {
      dateColIdx = headers.indexOf(configs[c].fallbackColName);
    }

    if (dateColIdx === -1) continue;

    var sheetUpdated = false;
    for (var i = 1; i < data.length; i++) {
      var cellValue = data[i][dateColIdx];
      if (!cellValue) continue;

      // Xử lý Date Object
      if (Object.prototype.toString.call(cellValue) === '[object Date]') {
        data[i][dateColIdx] = Utilities.formatDate(cellValue, "GMT+7", "yyyy-MM-dd HH:mm:ss");
        sheetUpdated = true;
      }
      // Xử lý chuỗi chứa chữ T
      else if (typeof cellValue === 'string') {
        var str = cellValue.trim();
        if (str.indexOf("T") !== -1) {
          data[i][dateColIdx] = str.replace("T", " ").replace(/(\+.*|Z)$/, "");
          sheetUpdated = true;
        }
      }
    }

    if (sheetUpdated) {
      sheet.getDataRange().setValues(data);
      totalUpdated++;
    }
  }

  SpreadsheetApp.getUi().alert("Hoàn tất! Đã làm sạch dữ liệu cho " + totalUpdated + " sheet.");
}



