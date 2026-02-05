import csv
import uuid
import psycopg2
from datetime import datetime

# Configuración de la base de datos (según .env)
DB_PARAMS = {
    "host": "db",
    "database": "ticketera_db",
    "user": "user",
    "password": "password"
}

CSV_FILE = "/app/dependencias.csv"

def import_data():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Mapeo explícito de las columnas del CSV
                nombre = row['nombre_dependencia'].strip()
                codigo = row['codigo'].strip()
                
                # Campos requeridos por el modelo de DB (LocationNode)
                loc_id = str(uuid.uuid4())
                # El path debe ser único, usamos nombre + código para evitar colisiones
                path = f"{nombre} ({codigo})"
                
                cur.execute(
                    """
                    INSERT INTO location_nodes (id, name, dependency_code, path, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (dependency_code) DO NOTHING
                    """,
                    (loc_id, nombre, codigo, path, datetime.now())
                )
                if cur.rowcount > 0:
                    count += 1
            
            conn.commit()
            print(f"Importación exitosa: {count} dependencias creadas.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    import_data()
