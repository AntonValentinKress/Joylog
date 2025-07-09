# assets/read.py
import sys
import sqlite3
import json

def read_entries(offset=0, limit=10):
    conn = sqlite3.connect("entries/data.db")
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, date, text, score, file
        FROM joylog
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    ''', (limit, offset))

    rows = cursor.fetchall()
    entries = [
        {"id": id, "date": date, "text": text, "score": score, "file": file}
        for id, date, text, score, file in rows
    ]

    conn.close()
    return entries

if __name__ == "__main__":
    offset = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    data = read_entries(offset, limit)
    print(json.dumps(data))