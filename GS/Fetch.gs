function fetchUrl(url, timeoutSecs) {
  timeoutSecs = timeoutSecs || REQUEST_TIMEOUT;
  for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        timeoutSeconds: timeoutSecs,
        headers: HTTP_HEADERS
      });
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        return resp.getContentText("UTF-8");
      }
      logWarn("fetchUrl " + url + " HTTP " + code);
    } catch (e) {
      logWarn("fetchUrl " + url + " attempt " + (attempt + 1) + ": " + e.message);
      if (attempt === MAX_RETRIES - 1) return null;
    }
    Utilities.sleep((attempt + 1) * 1000);
  }
  return null;
}

function fetchMultiple(urls) {
  var requests = urls.map(function(u) {
    return {
      url: u,
      muteHttpExceptions: true,
      timeoutSeconds: REQUEST_TIMEOUT,
      headers: HTTP_HEADERS
    };
  });
  var responses = UrlFetchApp.fetchAll(requests);
  return responses.map(function(resp, i) {
    var code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return resp.getContentText("UTF-8");
    }
    logFetch(urls[i], "FAIL", code);
    return null;
  });
}

function stripHtmlTags(html) {
  if (!html) return "";
  html = html.replace(/<[^>]*>/g, " ");
  html = html.replace(/&amp;/g, "&");
  html = html.replace(/&lt;/g, "<");
  html = html.replace(/&gt;/g, ">");
  html = html.replace(/&quot;/g, "\"");
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&[a-zA-Z]+;/g, " ");
  html = html.replace(/\s+/g, " ").trim();
  return html;
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";
  try {
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace("T", " ");
    }
  } catch (e) {}
  return dateStr;
}

function md5Hash(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] + 256) & 0xFF;
    hex += ("0" + b.toString(16)).slice(-2);
  }
  return hex.toUpperCase();
}

function extractArticleBody(html) {
  if (!html) return null;
  var selectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*itemprop\s*=\s*["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class\s*=\s*["'][^"']*detail-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class\s*=\s*["'][^"']*article-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class\s*=\s*["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class\s*=\s*["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class\s*=\s*["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<body[^>]*>([\s\S]*?)<\/body>/i
  ];
  for (var i = 0; i < selectors.length; i++) {
    var m = html.match(selectors[i]);
    if (m) {
      var text = stripHtmlTags(m[1]);
      if (text.length > 500) {
        if (text.length > 10000) text = text.slice(0, 10000);
        return text;
      }
    }
  }
  var bodyText = stripHtmlTags(html);
  if (bodyText.length > 500) {
    if (bodyText.length > 10000) bodyText = bodyText.slice(0, 10000);
    return bodyText;
  }
  return null;
}

function fetchArticleContent(url) {
  var html = fetchUrl(url, 15);
  if (!html) return null;
  return extractArticleBody(html);
}

function resolveUrl(href, domain) {
  if (href.indexOf("http") === 0) return href;
  if (href.indexOf("/") === 0) return domain + href;
  return domain + "/" + href;
}
