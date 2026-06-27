from datetime import datetime
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent / "log"
LOG_DIR.mkdir(parents=True, exist_ok=True)
_log_file = open(LOG_DIR / "main.log", "w", encoding="utf-8")


def _write(msg: str, level: str = "INFO") -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    for line in msg.rstrip("\n").split("\n"):
        _log_file.write(f"[{ts}] {level} {line}\n")
    _log_file.flush()


def info(msg: str) -> None:
    _write(msg, "INFO")


def warn(msg: str) -> None:
    _write(msg, "WARN")


def error(msg: str) -> None:
    _write(msg, "ERROR")


def fetch_result(url: str, status: str, length: int) -> None:
    _write(f"FETCH {status} {length}B {url[:100]}", "FETCH")


def rss_fetch(name: str, url: str, count: int) -> None:
    _write(f"RSS {name} ({url}) -> {count} articles", "RSS")



