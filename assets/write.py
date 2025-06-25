import os
import json
import sqlite3
import base64
import uuid
from datetime import datetime

# VARIABLEN
DB_NAME = "entries/Joylog.db"
ENTRY_FOLDER = "entries/"
COMPRESSION = 90

def connect(DB_Name: str):
    return sqlite3.connect(DB_Name)

def readJson(filepath:str):
    with open(filepath, 'r') as JSON:
       data = json.load(JSON)

    return data

def insert_data(data:dict):
    con = connect(DB_NAME)
    cur = con.cursor()

    location_id = str(uuid.uuid4())
    image_id = str(uuid.uuid4())

    datetimeValue = datetime.strptime(f"{data['date']} {data['time']}", "%Y-%m-%d %H:%M")

    # Insert joylog entry
    cur.execute("""
        INSERT INTO joylog (datetime, text, imageID, locationID, score)
        VALUES (?, ?, ?, ?, ?)
    """, (
        datetimeValue, 
        data["text"],
        image_id,
        location_id, 
        data["score"]
    ))

    # Insert location
    cur.execute("""
        INSERT INTO locations (locationID, lat, long)
        VALUES (?, ?, ?)
    """, (
        location_id, 
        data['latlng']['lat'] if 'lat' in data['latlng'] and data['latlng']['lat'] else "", 
        data['latlng']['lng'] if 'lng' in data['latlng'] and data['latlng']['lng'] else ""
    ))

    # Insert each image
    count = 1
    for img in data["images"]:
        if img.startswith("data:image"):
            try:
                base64_data = img.split(",")[1]
                image_blob = base64.b64decode(base64_data)
            except (IndexError, base64.binascii.Error) as e:
                print(f"Fehler beim Dekodieren: {e}")
                continue
        else:
            print("Bilddaten ohne 'data:image' Prefix – übersprungen")
            continue

        filename = f"{datetimeValue}-{str(count)}"  # Fallback-Filename
        cur.execute("""
            INSERT INTO images (imageID, image, filename)
            VALUES (?, ?, ?)
        """, (image_id, image_blob, filename))
        count += 1

    con.commit()
    con.close()

def removeFile(filepath:str):
    if os.path.exists(filepath):
        os.remove(filepath)
    else:
        print("The file does not exist") 

def getJsonPath():
    # List all .json files in the directory
    json_files = [f for f in os.listdir(ENTRY_FOLDER) if f.endswith(".json")]

    if json_files:
        json_path = os.path.join(ENTRY_FOLDER, json_files[0])  # or iterate through them
        return(json_path)
    else:
        return



if __name__ == "__main__":
    path = getJsonPath()
    data = readJson(path)
    insert_data(data)
    removeFile(path)