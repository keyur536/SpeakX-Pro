import sqlite3
import pprint

conn = sqlite3.connect('video_analyzer.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = c.fetchall()
print("Tables:", tables)

for table in ['user', 'users']:
    if (table,) in tables:
        c.execute(f"SELECT username, email, role FROM {table}")
        print(f"Users in {table}:")
        pprint.pprint(c.fetchall())
