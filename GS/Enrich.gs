function detectMentionsInText(text) {
  var originalText = text || "";
  var upper = originalText.toUpperCase();
  var result = {};

  for (var i = 0; i < STOCK_CODES.length; i++) {
    var code = STOCK_CODES[i];

    var tickerRegex = new RegExp("\\b" + code + "\\b");
    var hasTicker = tickerRegex.test(originalText);

    var hasCompanyName = COMPANY_NAME_PATTERNS[code] && COMPANY_NAME_PATTERNS[code].test(upper);

    if (hasTicker || hasCompanyName) {
      result[code] = 1;
    } else {
      result[code] = 0;
    }
  }
  return result;
}

function filterFalsePositives(mentions, text, link) {
  var linked = (link || "").toLowerCase();
  for (var d = 0; d < BLOCKED_DOMAINS.length; d++) {
    if (linked.indexOf(BLOCKED_DOMAINS[d]) >= 0) {
      var zeroed = {};
      for (var c in mentions) {
        zeroed[c] = 0;
      }
      return zeroed;
    }
  }
  var upper = (text || "").toUpperCase();
  var hasVi = VIETNAMESE_CHARS_REGEX.test(upper);
  var result = {};
  for (var j = 0; j < STOCK_CODES.length; j++) {
    var code = STOCK_CODES[j];
    result[code] = mentions[code] || 0;
    if (result[code] === 1) {
      var nameMatched = COMPANY_NAME_PATTERNS[code] && COMPANY_NAME_PATTERNS[code].test(upper);
      if (!nameMatched && !hasVi) {
        result[code] = 0;
      }
    }
  }
  return result;
}

function findMatchingKeyword(title) {
  if (!title) return null;
  for (var i = 0; i < CONFIG_KEYWORDS_DATA.length; i++) {
    var kwObj = CONFIG_KEYWORDS_DATA[i];
    var kwText = (kwObj.keyword || "").trim();
    if (!kwText) continue;

    var keywordRegex = new RegExp("(^|[^\\p{L}\\p{N}])" + kwText + "([^\\p{L}\\p{N}]|$)", "iu");

    if (keywordRegex.test(title)) {
      return kwObj;
    }
  }
  return null;
}

function enrichFromIndex(ss, limit) {
  limit = limit || 500;

  // 1. Ghi nhận thời điểm bắt đầu chạy hàm
  var startTime = new Date().getTime();

  var existingHashes = getExistingHashes(ss);
  var rows = getSourceIndexRows(ss);
  var candidates = [];

  for (var i = 0; i < rows.length; i++) {
    if (rows[i].Status === "new") candidates.push(rows[i]);
  }

  var titleMatched = [];
  for (var j = 0; j < candidates.length; j++) {
    var r = candidates[j];
    var title = r.Title || "";
    var link = r.Link || "";

    var mentions = detectMentionsInText(title);
    var filtered = filterFalsePositives(mentions, title, link);
    var hasTicker = false;
    for (var c in filtered) {
      if (filtered[c]) { hasTicker = true; break; }
    }

    if (hasTicker) {
      titleMatched.push(r);
    }
  }

  var enriched = 0;
  var toProcess = titleMatched.slice(0, limit);

  for (var k = 0; k < toProcess.length; k++) {
    var entry = toProcess[k];
    var link = entry.Link;
    var fullContent = fetchArticleContent(link);

    var baseTitle = entry.Title || "";
    var baseText = baseTitle + " " + (fullContent || "");

    var mentions2 = detectMentionsInText(baseText);
    var filtered2 = filterFalsePositives(mentions2, baseText, link);
    var tickers = [];
    for (var c2 in filtered2) {
      if (filtered2[c2]) tickers.push(c2);
    }

    if (tickers.length === 0) {
      updateEntryStatus(ss, link, "no_ticker_found");
      continue;
    }

    var matchedKw = "";
    var matchedEvent = "";
    var kwMatch = findMatchingKeyword(baseTitle);

    if (kwMatch) {
      matchedKw = kwMatch.keyword;
      matchedEvent = kwMatch.event_type_suggestion;
    } else {
      matchedKw = tickers.join(", ");
      matchedEvent = "stock_mention, company_news";
    }

    var isValidContent = (fullContent && fullContent.length >= 500);
    var finalContent = isValidContent ? fullContent : (fullContent || "Nội dung quá ngắn hoặc bị chặn hiển thị");
    var finalStatus = isValidContent ? "success" : (fullContent ? "short_content" : "failed");

    updateEntryStatus(ss, link, isValidContent ? "mentioned" : finalStatus);

    accumulateRawEntry({
      title: baseTitle,
      summary: isValidContent ? fullContent.slice(0, 300) : (entry.Summary || ""),
      content: finalContent,
      published_date: entry["Datetime Public"] || "",
      source: entry.Source || "",
      url: link,
      industry_group: "Bán lẻ / Tiêu dùng",
      tickers: tickers.join(", "),
      keywords: matchedKw,
      event_type: matchedEvent,
      crawl_status: finalStatus,
      error_message: isValidContent ? "" : (fullContent ? "Content too short (<500 chars)" : "Fetch failed")
    });

    if (isValidContent) {
      enriched++;
    }

    if ((k + 1) % 50 === 0) {
      flushRawAccumulator(ss);
    }

    // 2. TỰ ĐỘNG BẤM GIỜ: Thay thế hoàn toàn ScriptApp.getRemainingTime()
    var currentTime = new Date().getTime();
    var elapsedSeconds = (currentTime - startTime) / 1000;
    if (elapsedSeconds > 300) { // Nếu chạy quá 300 giây (5 phút)
      logInfo("Tạm dừng cào tại dòng thứ " + (k + 1) + " để tránh lỗi Timeout của Google.");
      break;
    }
  }

  var n = flushRawAccumulator(ss);
  logInfo("Enrichment: " + enriched + " enriched from " + toProcess.length + " candidates");
  return enriched;
}