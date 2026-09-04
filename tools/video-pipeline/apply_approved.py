"""Write the approved videos into the records they belong to.

Reads approved.json (from review.py approved) and appends each video to the
`videos` list of the sequence or grip file the edge came from, in the shape
every record uses: provider, platform, id, title, and `start` where the
sequence sits inside a longer video. A video already on the record is left
alone. The provider is the channel's slug in video-providers/ where the name
matches one, and 'assorted' otherwise.

This is the only step that touches the repository, and it does so the way a
contributor would: one field, one file, then `npm run validate`.

APPROVING A VIDEO IS THE REVIEW. A sequence that was a draft becomes reviewed
in the same write, with the video id as what it was confirmed against and the
reviewer's role from the sheet as who confirmed it, so the site publishes it
on the next build. Watching the clip is the quality bar; nothing else has to
be edited by hand. Grips have no status and are unaffected.

Usage: python apply_approved.py [approved.json] [--dry-run]
"""
import datetime
import glob
import json
import os
import sys

from common import HERE, norm, repo_path


def providers():
    """channel name (normalised) -> provider slug."""
    out = {}
    for path in glob.glob(repo_path("video-providers", "*.json")):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        slug = os.path.basename(path)[:-5]
        out[norm(d["name"])] = slug
        out[norm(slug)] = slug
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    path = args[0] if args else os.path.join(HERE, "approved.json")
    with open(path, encoding="utf-8") as f:
        approved = json.load(f)
    by_name = providers()
    touched = 0
    for slug, edge in approved.items():
        file = repo_path(*edge["file"].split("/"))
        with open(file, encoding="utf-8") as f:
            d = json.load(f)
        have = {v["id"] for v in d["videos"]}
        added = []
        for v in edge["videos"]:
            if v["youtube_id"] in have:
                continue
            entry = {
                "provider": by_name.get(norm(v.get("channel") or ""), "assorted"),
                "platform": "youtube",
                "id": v["youtube_id"],
                "title": v.get("title") or slug.replace("__", " "),
            }
            if v.get("start_s"):
                entry["start"] = int(v["start_s"])
            added.append(entry)
        if not added:
            continue
        d["videos"].extend(added)
        touched += 1
        published = ""
        if d.get("status") == "draft":
            reviewer = next((v.get("reviewer") for v in edge["videos"] if v.get("reviewer")), "") or "reviewer"
            d["status"] = "reviewed"
            d["reviewed"] = {
                "on": datetime.date.today().isoformat(),
                "by": reviewer,
                "against": f"the demonstration {added[0]['id']}",
            }
            published = "; now reviewed, and published on the next build"
        print(f"{edge['file']}: +{len(added)} video(s){published}")
        if not dry:
            with open(file, "w", encoding="utf-8", newline="\n") as f:
                json.dump(d, f, ensure_ascii=False, indent=2)
                f.write("\n")
    print(f"{touched} record(s) {'would be' if dry else ''} updated; run `npm run validate`")


if __name__ == "__main__":
    main()
