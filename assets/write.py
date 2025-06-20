import sys
import json
import sqlite3
import base64
import uuid

def connect(DB_Name: str):
    return sqlite3.connect(DB_Name)

def insert_data(data):
    con = connect("assets/Joylog.db")
    cur = con.cursor()

    joylog_id = str(uuid.uuid4())
    location_id = str(uuid.uuid4())
    image_id = str(uuid.uuid4())

    # Insert location
    cur.execute("""
        INSERT INTO locations (locationID, long, lat)
        VALUES (?, ?, ?)
    """, (location_id, data["location"]["long"], data["location"]["lat"]))

    # Insert joylog entry
    cur.execute("""
        INSERT INTO joylog (date, time, text, imageID, locationID, score)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data["date"], data["time"], data["text"],
        image_id,
        location_id, data["score"]
    ))

    # Insert each image
    for img in data["images"]:
        image_blob = base64.b64decode(img["image"])
        cur.execute("""
            INSERT INTO images (imageID, image, filename)
            VALUES (?, ?, ?, ?, ?)
        """, (image_id, image_blob, img["filename"]))

    con.commit()
    con.close()

if __name__ == "__main__":
    raw_input = sys.stdin.read()
    parsed_data = json.loads(raw_input)
    insert_data(parsed_data)
    print("Eintrag mit Bildern erfolgreich gespeichert.")
