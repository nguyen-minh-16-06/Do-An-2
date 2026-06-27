import sys
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

import log


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python main.py [crawl-links|crawl-content|daily|stats]")
        return

    command = args[0]
    output_path = args[1] if len(args) > 1 else ""

    log.info(f"Command: {command}")

    if command == "crawl-links":
        from pipeline import crawl_links
        crawl_links(output_path)

    elif command == "crawl-content":
        from pipeline import crawl_content
        crawl_content(output_path)

    elif command == "daily":
        from pipeline import daily
        daily(output_path)

    elif command == "stats":
        from lib.stats import get_index_stats
        get_index_stats(output_path)

    else:
        print(f"Unknown command: {command}")
        print("Usage: python main.py [crawl-links|crawl-content|daily|stats]")
        sys.exit(1)


if __name__ == "__main__":
    main()
