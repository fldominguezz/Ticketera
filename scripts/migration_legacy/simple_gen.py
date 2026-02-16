import os, uuid, shutil

src = "/home/fdominguez/Procedimientos/"
dst = "/root/Ticketera/uploads/wiki_files/"
space = "54a690ee-4bf2-400d-98eb-c42e7b101932"
admin = "89218008-7fb4-4cad-a215-2ae58c317bd0"

sql = []

def do(p, parent="NULL"):
    if not os.path.exists(p): return
    for item in sorted(os.listdir(p)):
        full = os.path.join(p, item)
        uid = str(uuid.uuid4())
        title = item.replace("'", "''")
        if os.path.isdir(full):
            sql.append(f"INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, content, created_at, updated_at) VALUES ('{uid}', '{title}', '{uid[:8]}', '{space}', {parent}, true, '{admin}', '{admin}', 0, '', NOW(), NOW());")
            do(full, f"'{uid}'")
        elif item.lower().endswith(('.docx', '.pdf')):
            ext = item.split('.')[-1]
            shutil.copy2(full, os.path.join(dst, f"{uid}.{ext}"))
            sql.append(f"INSERT INTO wiki_pages (id, title, slug, space_id, parent_id, is_folder, creator_id, last_updated_by_id, view_count, original_file_path, content, created_at, updated_at) VALUES ('{uid}', '{title}', '{uid[:8]}', '{space}', {parent}, false, '{admin}', '{admin}', 0, '/uploads/wiki_files/{uid}.{ext}', '', NOW(), NOW());")

do(src)
with open("/root/Ticketera/import.sql", "w") as f:
    f.write("
".join(sql))
