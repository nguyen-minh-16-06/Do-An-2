var LOG_BUFFER = [];

function logInfo(msg) {
  logWrite("INFO", msg);
}

function logWarn(msg) {
  logWrite("WARN", msg);
}

function logError(msg) {
  logWrite("ERROR", msg);
}

function logFetch(url, status, length) {
  logWrite("FETCH", status + " " + length + "B " + url.slice(0, 100));
}

function logRss(name, url, count) {
  logWrite("RSS", name + " (" + url + ") -> " + count + " articles");
}

function logWrite(level, msg) {
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  LOG_BUFFER.push([ts, level, msg]);
  if (LOG_BUFFER.length >= 50) {
    flushLog();
  }
}

function flushLog() {
  if (LOG_BUFFER.length === 0) return;
  try {
    var ss = getSS();
    var ws = ss.getSheetByName("_LOG");
    if (!ws) {
      ws = ss.insertSheet("_LOG");
      ws.appendRow(["Timestamp", "Level", "Message"]);
    }
    var lastRow = ws.getLastRow();
    var range = ws.getRange(lastRow + 1, 1, LOG_BUFFER.length, 3);
    range.setValues(LOG_BUFFER);
    LOG_BUFFER = [];
  } catch (e) {
    console.log("Log flush error: " + e.message);
  }
}
