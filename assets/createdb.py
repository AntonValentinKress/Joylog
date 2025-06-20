import sqlite3

def connect(DB_Name:str):
    return sqlite3.connect(DB_Name)

if __name__ == "__main__":
    con = connect("assets/Joylog.db")
    cur = con.cursor()

    #Create Tables
    cur.execute("CREATE TABLE joylog(date, time, text, imageID, locationID, score)")
    cur.execute("CREATE TABLE images(imageID, image, filename)")
    cur.execute("CREATE TABLE locations(locationID, long, lat)")

    #Create Indexes
    cur.execute("CREATE INDEX idx_joylog ON joylog(date)")
    cur.execute("CREATE INDEX idx_images ON images(imageID)")
    cur.execute("CREATE INDEX idx_locations ON locations(locationID)")

    con.commit()

    con.close()