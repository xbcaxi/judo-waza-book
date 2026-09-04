"""Index every upload from the allowlisted channels into the videos table.

Cost: about 1 unit per 50 videos to list, and 1 per 50 for details. A
channel with 2,000 uploads is about 80 units. Rerun to pick up new uploads;
what is already indexed is not fetched again.

Usage: python index_channels.py [--details]

A channel given by handle is resolved and its id printed; paste the id into
config.yaml so the next run does not spend the lookup.
"""
import sys
from datetime import datetime, timezone

from common import YouTube, iso_duration_to_seconds, load_config, open_db


def main():
    cfg = load_config()
    con = open_db(cfg["db"])
    yt = YouTube(con)
    want_details = "--details" in sys.argv
    now = datetime.now(timezone.utc).isoformat()

    for ch in cfg["channels"]:
        cid = ch.get("channel_id")
        if not cid and ch.get("handle"):
            item = yt.resolve_handle(ch["handle"])
            if not item:
                print(f"could not resolve {ch['handle']}")
                continue
            cid = item["id"]
            print(f"{ch['name']}: {ch['handle']} -> {cid}  (add channel_id to config.yaml)")
        pl = yt.uploads_playlist(cid)
        new_ids = []
        n = 0
        for sn in yt.playlist_items(pl):
            vid = sn["resourceId"]["videoId"]
            n += 1
            exists = con.execute("SELECT 1 FROM videos WHERE video_id=?", (vid,)).fetchone()
            if exists:
                # A video the repository already knows gains its channel and text.
                con.execute(
                    "UPDATE videos SET channel_id=?, channel_name=?, title=?, description=?, published=?"
                    " WHERE video_id=? AND method='existing'",
                    (cid, ch["name"], sn["title"], sn.get("description", ""), sn["publishedAt"], vid),
                )
                continue
            con.execute(
                "INSERT OR IGNORE INTO videos(video_id,channel_id,channel_name,title,description,published,indexed_at,method)"
                " VALUES(?,?,?,?,?,?,?,'indexed')",
                (vid, cid, ch["name"], sn["title"], sn.get("description", ""),
                 sn["publishedAt"], now),
            )
            new_ids.append(vid)
        con.commit()
        print(f"{ch['name']}: {n} uploads, {len(new_ids)} new")

        if want_details and new_ids:
            det = yt.video_details(new_ids)
            for vid, it in det.items():
                con.execute(
                    "UPDATE videos SET duration_s=?, views=? WHERE video_id=?",
                    (iso_duration_to_seconds(it["contentDetails"]["duration"]),
                     int(it["statistics"].get("viewCount", 0)), vid),
                )
            con.commit()

    print(f"quota used today: {yt.used_today()} units")


if __name__ == "__main__":
    main()
