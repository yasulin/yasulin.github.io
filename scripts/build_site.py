#!/usr/bin/env python3
"""Build the static site and reading index. Requires Python 3.11+; no packages."""

from datetime import date, datetime
import json
from pathlib import Path
import re
import shutil
import tomllib

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PATHS = ("index.html", "images", "story", "creation", "project", "education", "diary", ".well-known", "CNAME", "robots.txt", "sitemap.xml", "404.html")


def load_entries(directory):
    entries = []
    seen = set()
    for path in sorted(directory.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        match = re.match(r"\A\+\+\+\n(.*?)\n\+\+\+\n([\s\S]*)\Z", text, re.DOTALL)
        if not match:
            raise ValueError(f"{path}: missing TOML front matter")
        metadata = tomllib.loads(match[1])
        value = metadata.get("date")
        if isinstance(value, datetime):
            raise ValueError(f"{path}: use a date without a time")
        if isinstance(value, date):
            value = value.isoformat()
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError(f"{path}: expected a YYYY-MM-DD date")
        date.fromisoformat(value)
        if value in seen:
            raise ValueError(f"{path}: duplicate diary date {value}; edit the existing entry")
        seen.add(value)
        # Preserve body text exactly, including multilingual text and line breaks.
        body = match[2]
        if body.strip() and not re.fullmatch(r"empty\s*\.{3}", body.strip(), re.IGNORECASE):
            entries.append({"date": value, "content": body})
    return sorted(entries, key=lambda entry: entry["date"])


def build():
    entries = load_entries(ROOT / "diary/entries")
    output = ROOT / "_site"
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    def ignored(directory, names):
        excluded = {name for name in names if name in {".DS_Store", "__pycache__"} or name.endswith(".pyc")}
        if Path(directory) == ROOT / "diary":
            excluded.update({"entries", "entries.json"})
        return excluded
    for name in PUBLIC_PATHS:
        source = ROOT / name
        destination = output / name
        if source.is_dir():
            shutil.copytree(source, destination, ignore=ignored)
        elif source.is_file():
            shutil.copy2(source, destination)
    index = json.dumps(entries, ensure_ascii=False, indent=2) + "\n"
    (output / "diary/entries.json").write_text(index, encoding="utf-8")
    # Keep the existing plain `python -m http.server` preview useful as well.
    (ROOT / "diary/entries.json").write_text(index, encoding="utf-8")
    (output / ".nojekyll").touch()
    print(f"Built {len(entries)} written diary entries into {output}")


if __name__ == "__main__":
    build()
