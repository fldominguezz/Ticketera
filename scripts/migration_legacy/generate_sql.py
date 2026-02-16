import os
import uuid
import re
import shutil

SOURCE_DIR = "/home/fdominguez/Procedimientos/"
DEST_DIR = "/root/Ticketera/uploads/wiki_files/"
SPACE_ID = "54a690ee-4bf2-400d-98eb-c42e7b101932"
CREATOR_ID = "89218008-7fb4-4cad-a215-2ae58c317bd0"

sql_statements = []

def slugify(text):
    text = text.lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

def scan_dir(path, parent_id=None):
    if not os.path.exists(path): return
    items = sorted(os.listdir(path))
    for item in items:
        full_path = os.path.join(path, item)
        if os.path.isdir(full_path):
            folder_id = str(uuid.uuid4())
            slug = f"{slugify(item)}-{folder_id[:4]}"
            parent_val = f"'{parent_id}'" if parent_id else "NULL"
            sql_statements.append(f"INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, content, created_at, updated_at) VALUES ('{folder_id}', '{item.replace(\"'\", \"''\")}', '{slug}', '{SPACE_ID}', {parent_val}, true, '{CREATOR_ID}', '{CREATOR_ID}', 0, '', NOW(), NOW());")
            scan_dir(full_path, folder_id)
        elif item.lower().endswith(('.docx', '.pdf')):
            file_id = str(uuid.uuid4())
            file_ext = item.split('.')[-1]
            safe_name = f"{file_id}.{file_ext}"
            shutil.copy2(full_path, os.path.join(DEST_DIR, safe_name))
            
            title = os.path.splitext(item)[0].replace("_", " ").replace("-", " ").strip().title()
            slug = f"{slugify(title)}-{file_id[:4]}"
            file_rel_path = f"/uploads/wiki_files/{safe_name}"
            parent_val = f"'{parent_id}'" if parent_id else "NULL"
            sql_statements.append(f"INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, original_file_path, content, created_at, updated_at) VALUES ('{file_id}', '{title.replace(\"'\", \"''\")}', '{slug}', '{SPACE_ID}', {parent_val}, false, '{CREATOR_ID}', '{CREATOR_ID}', 0, '{file_rel_path}', '<p>Importado</p>', NOW(), NOW());")

if __name__ == "__main__":
    if not os.path.exists(DEST_DIR): os.makedirs(DEST_DIR)
    scan_dir(SOURCE_DIR)
    with open('/root/Ticketera/import_wiki.sql', 'w') as f:
        f.write("\n".join(sql_statements))
    print(f"Sincronización lista. Total items: {len(sql_statements)}")
