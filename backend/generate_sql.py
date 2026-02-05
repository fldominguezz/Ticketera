import csv
import uuid

CSV_FILE = "/root/Ticketera/backend/dependencias.csv"
OUTPUT_FILE = "/root/Ticketera/backend/import_locations.sql"

def generate_sql():
    with open(CSV_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        with open(OUTPUT_FILE, mode='w', encoding='utf-8') as out:
            out.write("BEGIN;\n")
            for row in reader:
                nombre = row['nombre_dependencia'].strip().replace("'", "''")
                codigo = row['codigo'].strip()
                loc_id = str(uuid.uuid4())
                path = f"{nombre} ({codigo})"
                sql = f"INSERT INTO location_nodes (id, name, dependency_code, path, created_at) VALUES ('{loc_id}', '{nombre}', '{codigo}', '{path}', NOW()) ON CONFLICT (dependency_code) DO NOTHING;\n"
                out.write(sql)
            out.write("COMMIT;\n")

if __name__ == "__main__":
    generate_sql()