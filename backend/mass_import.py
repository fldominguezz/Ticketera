import os
import uuid
import shutil
import psycopg2
import re

# Configuración
SOURCE_DIR = "/home/fdominguez/Procedimientos/"
DEST_DIR = "/root/Ticketera/uploads/wiki_files/"
SPACE_ID = "54a690ee-4bf2-400d-98eb-c42e7b101932"
CREATOR_ID = "89218008-7fb4-4cad-a215-2ae58c317bd0"

# Conexión DB
try:
    conn = psycopg2.connect(
        dbname="ticketera_prod_db",
        user="ticketera_admin",
        password="20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa",
        host="127.0.0.1",
        port="5432"
    )
except:
    conn = psycopg2.connect(
        dbname="ticketera_prod_db",
        user="ticketera_admin",
        password="20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa",
        host="172.18.0.2", 
        port="5432"
    )

cur = conn.cursor()

def slugify(text):
    text = text.lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

def import_dir(path, parent_id=None):
    if not os.path.exists(path):
        print(f"Error: No existe el directorio {path}")
        return 0
        
    count = 0
    items = sorted(os.listdir(path))
    for item in items:
        full_path = os.path.join(path, item)
        if os.path.isdir(full_path):
            folder_id = str(uuid.uuid4())
            slug = slugify(item) + "-" + folder_id[:4]
            cur.execute("""
                INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, content, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (folder_id, item, slug, SPACE_ID, parent_id, True, CREATOR_ID, CREATOR_ID, 0, ""))
            count += import_dir(full_path, folder_id)
        
        elif item.lower().endswith(('.docx', '.pdf')):
            file_id = str(uuid.uuid4())
            file_ext = os.path.splitext(item)[1]
            safe_name = uuid.uuid4().hex + file_ext
            shutil.copy2(full_path, os.path.join(DEST_DIR, safe_name))
            
            title = os.path.splitext(item)[0].replace("_", " ").replace("-", " ").strip().title()
            slug = slugify(title) + "-" + file_id[:4]
            file_rel_path = "/uploads/wiki_files/" + safe_name
            
            cur.execute("""
                INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, original_file_path, content, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (file_id, title, slug, SPACE_ID, parent_id, False, CREATOR_ID, CREATOR_ID, 0, file_rel_path, f"<p>Procedimiento importado: {item}</p>"))
            count += 1
    return count

try:
    cur.execute("SELECT id FROM wiki_spaces WHERE id = %s", (SPACE_ID,))
    if not cur.fetchone():
        print("Error: El espacio PROCEDIMIENTOS OPERATIVOS no existe.")
    else:
        total = import_dir(SOURCE_DIR)
        conn.commit()
        print(f"Sincronización completada. Se importaron {total} archivos.")
except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
