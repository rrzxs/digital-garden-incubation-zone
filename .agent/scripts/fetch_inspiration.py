#!/usr/bin/env python3
import datetime as dt
import html
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123 Safari/537.36"
)


def fetch_text(url, timeout=30, accept="*/*"):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": accept},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception:  # noqa: BLE001
        result = subprocess.run(
            [
                "curl",
                "-L",
                "--max-time",
                str(timeout),
                "-A",
                USER_AGENT,
                "-H",
                f"Accept: {accept}",
                "-s",
                url,
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.stdout.strip():
            return result.stdout
        raise RuntimeError(f"curl fallback failed for {url}: exit={result.returncode}")


def fetch_json(url, timeout=30):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def normalize_space(value):
    return re.sub(r"\s+", " ", value or "").strip()


def strip_tags(value):
    value = re.sub(r"<[^>]+>", "", value or "")
    return normalize_space(html.unescape(value))


def slug_to_title(slug):
    words = [part for part in slug.strip("/").split("-") if part]
    return " ".join(word.capitalize() for word in words)


def build_item(source, title, url, note, weight, category):
    return {
        "source": normalize_space(source),
        "title": normalize_space(title),
        "url": normalize_space(url),
        "note": normalize_space(note),
        "weight": float(weight),
        "category": normalize_space(category),
    }


def parse_rss_items(xml_text, source, weight, default_category, note_prefix, limit=6):
    root = ET.fromstring(xml_text)
    items = []
    for entry in root.findall("./channel/item"):
        title = normalize_space(entry.findtext("title"))
        url = normalize_space(entry.findtext("link"))
        description = strip_tags(entry.findtext("description"))
        categories = [
            normalize_space(node.text)
            for node in entry.findall("category")
            if normalize_space(node.text)
        ]
        category_bits = ", ".join(categories[:3]) if categories else "n/a"
        note_parts = [note_prefix]
        if category_bits != "n/a":
            note_parts.append(f"Tags: {category_bits}")
        if description:
            note_parts.append(description)
        if title and url:
            items.append(
                build_item(
                    source=source,
                    title=title,
                    url=url,
                    note=" | ".join(note_parts),
                    weight=weight,
                    category=default_category,
                )
            )
        if len(items) >= limit:
            break
    return items


def dedupe(items):
    seen = set()
    unique = []
    for item in sorted(items, key=lambda value: (-value["weight"], value["source"], value["title"])):
        key = item["url"]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def rank_items(items, limit=20):
    return dedupe(items)[:limit]


def format_item(item):
    title = item["title"].replace("\n", " ").strip()
    note = item["note"].replace("\n", " ").strip()
    return (
        f"- SOURCE: {item['source']} | WEIGHT: {item['weight']:.2f} | "
        f"CATEGORY: {item['category']} | TITLE: {title} | URL: {item['url']} | NOTE: {note}"
    )


def fetch_awwwards(limit=6):
    html_text = fetch_text("https://www.awwwards.com/websites/sites_of_the_day/")
    hrefs = re.findall(r'href="(/sites/[^"#?]+)"', html_text)
    items = []
    seen = set()
    for href in hrefs:
        slug = href.split("/sites/", 1)[1].strip("/").split("/", 1)[0]
        if not slug or slug in seen:
            continue
        seen.add(slug)
        items.append(
            build_item(
                source="Awwwards",
                title=slug_to_title(slug),
                url=f"https://www.awwwards.com{href}",
                note="Top-tier immersive showcase with strong motion, layout, and interaction signal",
                weight=1.00,
                category="immersive-showcase",
            )
        )
        if len(items) >= limit:
            break
    if not items:
        raise RuntimeError("Awwwards parser returned no items")
    return items


def fetch_cssdesignawards(limit=6):
    html_text = fetch_text("https://www.cssdesignawards.com/")
    matches = re.findall(
        r'<a href="(/sites/[^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*([^<]+?)\s*</a>',
        html_text,
        re.S,
    )
    items = []
    seen = set()
    for href, raw_title in matches:
        title = strip_tags(raw_title)
        if not title or href in seen:
            continue
        seen.add(href)
        items.append(
            build_item(
                source="CSS Design Awards",
                title=title,
                url=f"https://www.cssdesignawards.com{href}",
                note="Premium UI benchmark with polished layout, transitions, and presentation quality",
                weight=0.88,
                category="premium-ui",
            )
        )
        if len(items) >= limit:
            break
    if not items:
        raise RuntimeError("CSS Design Awards parser returned no items")
    return items


def fetch_codrops(limit=6):
    xml_text = fetch_text("https://tympanus.net/codrops/feed/", accept="application/rss+xml")
    items = parse_rss_items(
        xml_text,
        source="Codrops",
        weight=0.93,
        default_category="interactive-pattern",
        note_prefix="Creative frontend article or demo with implementation-level interaction ideas",
        limit=limit,
    )
    if not items:
        raise RuntimeError("Codrops feed returned no items")
    return items


def fetch_onepagelove(limit=6):
    xml_text = fetch_text("https://onepagelove.com/feed", accept="application/rss+xml")
    items = parse_rss_items(
        xml_text,
        source="One Page Love",
        weight=0.97,
        default_category="productized-landing",
        note_prefix="One-page product or portfolio pattern with strong product framing",
        limit=limit,
    )
    if not items:
        raise RuntimeError("One Page Love feed returned no items")
    return items


def fetch_github_repos():
    since = (dt.date.today() - dt.timedelta(days=120)).isoformat()
    queries = [
        (
            "GitHub Animation",
            "creative animation interaction",
            0.76,
            "interaction-system",
            f"created:>{since} stars:>5 archived:false language:JavaScript topic:animation",
        ),
        (
            "GitHub Frontend",
            "frontend ui tooling",
            0.72,
            "tooling-signal",
            f"created:>{since} stars:>5 archived:false language:TypeScript topic:frontend",
        ),
        (
            "GitHub Productivity",
            "productivity web app",
            0.69,
            "product-signal",
            f"created:>{since} stars:>5 archived:false language:JavaScript productivity web",
        ),
    ]
    items = []
    for source, label, weight, category, query in queries:
        url = (
            "https://api.github.com/search/repositories?sort=stars&order=desc&per_page=4&q="
            + urllib.parse.quote(query)
        )
        payload = fetch_json(url, timeout=20)
        for repo in payload.get("items", []):
            items.append(
                build_item(
                    source=source,
                    title=repo["full_name"],
                    url=repo["html_url"],
                    note=f"{label} signal from recent repo. {normalize_space(repo.get('description') or '')}",
                    weight=weight,
                    category=category,
                )
            )
    return items


def fetch_dribbble(limit=4):
    html_text = fetch_text("https://dribbble.com/search/web%20design", timeout=6)
    if "challenge" in html_text.lower() or "verify that you're not a robot" in html_text.lower():
        raise RuntimeError("Dribbble blocked by anti-bot challenge")
    matches = re.findall(r'href="(/shots/\d+[^"]*)"[^>]*>([^<]{3,120})<', html_text)
    items = []
    seen = set()
    for href, raw_title in matches:
        title = strip_tags(raw_title)
        if not title or href in seen:
            continue
        seen.add(href)
        items.append(
            build_item(
                source="Dribbble",
                title=title,
                url=f"https://dribbble.com{href}",
                note="Visual motif source only; use for polish, not primary product direction",
                weight=0.54,
                category="visual-motif",
            )
        )
        if len(items) >= limit:
            break
    if not items:
        raise RuntimeError("Dribbble parser returned no items")
    return items


def fetch_layers(limit=4):
    html_text = fetch_text("https://layers.to/", timeout=6)
    if len(normalize_space(html_text)) < 120:
        raise RuntimeError("Layers returned empty or unresolved response")
    matches = re.findall(r'href="(/[^"]+)"[^>]*>\s*<[^>]+>\s*([^<]{3,120})\s*<', html_text)
    items = []
    seen = set()
    for href, raw_title in matches:
        title = strip_tags(raw_title)
        if not title or href in seen:
            continue
        seen.add(href)
        items.append(
            build_item(
                source="Layers",
                title=title,
                url=urllib.parse.urljoin("https://layers.to/", href),
                note="Experimental visual motif source only; use for aesthetics, not product framing",
                weight=0.48,
                category="visual-motif",
            )
        )
        if len(items) >= limit:
            break
    if not items:
        raise RuntimeError("Layers parser returned no items")
    return items


def main():
    collectors = [
        fetch_awwwards,
        fetch_onepagelove,
        fetch_codrops,
        fetch_cssdesignawards,
        fetch_github_repos,
        fetch_dribbble,
        fetch_layers,
    ]
    items = []
    errors = []

    for fn in collectors:
        try:
            items.extend(fn())
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{fn.__name__}: {exc}")

    ranked = rank_items(items, limit=24)
    if not ranked:
        for err in errors:
            print(f"- SOURCE: error | WEIGHT: 0.00 | CATEGORY: unavailable | TITLE: fetch failed | URL: n/a | NOTE: {err}")
        sys.exit(1)

    print("# Curated inspiration sources")
    print("")
    for item in ranked:
        print(format_item(item))

    if errors:
        print("")
        print("# Source warnings")
        for err in errors:
            print(f"- {err}")


if __name__ == "__main__":
    main()
