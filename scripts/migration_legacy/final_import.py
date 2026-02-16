import os
import uuid
import shutil
import psycopg2

# Configuración
SOURCE_DIR = "/home/fdominguez/Procedimientos/"
DEST_DIR = "/root/Ticketera/uploads/wiki_files/"
SPACE_ID = "54a690ee-4bf2-400d-98eb-c42e7b101932"
CREATOR_ID = "89218008-7fb4-4cad-a215-2ae58c317bd0"

# Conexión DB interna (Docker bridge)
conn = psycopg2.connect(
    dbname="ticketera_prod_db",
    user="ticketera_admin",
    password="20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa",
    host="172.18.0.2", 
    port="5432"
)
cur = conn.cursor()

def get_slug(text, uid):
    clean = "".join(c if c.isalnum() else "-" for c in text.lower()).strip("-")
    return f"{clean}-{uid[:4]}"

def process(path, parent_id=None):
    if not os.path.exists(path): return 0
    count = 0
    for item in sorted(os.listdir(path)):
        full = os.path.join(path, item)
        uid = str(uuid.uuid4())
        slug = get_slug(item, uid)
        
        if os.path.isdir(full):
            cur.execute("INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, content, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())",
                        (uid, item, slug, SPACE_ID, parent_id, True, CREATOR_ID, CREATOR_ID, 0, ""))
            count += process(full, uid)
        
        elif item.lower().endswith(('.docx', '.pdf')):
            ext = item.split('.')[-1]
            safe = f"{uid}.{ext}"
            shutil.copy2(full, os.path.join(DEST_DIR, safe))
            title = os.path.splitext(item)[0].replace("_", " ").replace("-", " ").title()
            cur.execute("INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, original_file_path, content, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())",
                        (uid, title, slug, SPACE_ID, parent_id, False, CREATOR_ID, CREATOR_ID, 0, f"/uploads/wiki_files/{safe}", "<p>Importado</p>"))
            count += 1
    return count

if __name__ == "__main__":
    if not os.path.exists(DEST_DIR): os.makedirs(DEST_DIR)
    total = process(SOURCE_DIR)
    conn.commit()
    cur.close()
    conn.close()
    print(f"Sincronización total: {total} archivos importados.")
