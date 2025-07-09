import sys
import json
import sqlite3
import os

def main(filepath):
    with open(filepath, 'r', encoding="utf-8") as f:
        data = json.load(f)

    conn = sqlite3.connect('entries/data.db')
    cursor = conn.cursor()

    # Tabelle bei Bedarf erstellen
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS joylog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            text TEXT,
            score INTEGER,
            file TEXT
        )
    ''')

    # Daten einfügen
    cursor.execute('''
        INSERT INTO joylog (date, text, score, file)
        VALUES (?, ?, ?, ?)
    ''', (
        data.get('date'),
        data.get('text'),
        int(data.get('score', 0)),
        data.get('file')
    ))

    conn.commit()
    conn.close()

    # JSON-Datei löschen
    os.remove(filepath)
    print(f"Import abgeschlossen und Datei {filepath} gelöscht.")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 import_to_sqlite.py <json_filepath>")
        sys.exit(1)

    main(sys.argv[1])
