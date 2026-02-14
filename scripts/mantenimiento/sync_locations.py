import psycopg2
import uuid
import sys

# Configuración de conexión
DB_CONFIG = {
    "dbname": "ticketing_dev_db",
    "user": "user",
    "password": "password",
    "host": "db",
    "port": "5432"
}

def sync_locations():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("Conectado a la base de datos.")

        with open("/root/dependencias_completas.txt", "r") as f:
            lines = f.readlines()

        count_updated = 0
        count_created = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Separar código y nombre (ej: "1601 DIVISIÓN SEGURIDAD INFORMÁTICA")
            parts = line.split(" ", 1)
            if len(parts) < 2:
                continue
            
            code = parts[0]
            name = parts[1]
            path = name # Al ser independientes, el path es el nombre

            # Verificar si existe por código
            cur.execute("SELECT id FROM location_nodes WHERE dependency_code = %s", (code,))
            res = cur.fetchone()

            if res:
                # Actualizar
                cur.execute(
                    "UPDATE location_nodes SET name = %s, path = %s, updated_at = NOW() WHERE dependency_code = %s",
                    (name, path, code)
                )
                count_updated += 1
            else:
                # Crear nuevo
                new_id = str(uuid.uuid4())
                try:
                    cur.execute(
                        "INSERT INTO location_nodes (id, name, dependency_code, path, created_at) VALUES (%s, %s, %s, %s, NOW())",
                        (new_id, name, code, path)
                    )
                    count_created += 1
                except psycopg2.errors.UniqueViolation:
                    conn.rollback()
                    # Si el path ya existe (mismo nombre), le agrego el código para que sea único
                    path = f"{name} ({code})"
                    cur.execute(
                        "INSERT INTO location_nodes (id, name, dependency_code, path, created_at) VALUES (%s, %s, %s, %s, NOW())",
                        (new_id, name, code, path)
                    )
                    count_created += 1
                except Exception as e:
                    print(f"Error insertando {code}: {e}")
                    conn.rollback()
                    continue
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"Sincronización finalizada. Creados: {count_created}, Actualizados: {count_updated}")

    except Exception as e:
        print(f"Error de conexión o ejecución: {e}")

if __name__ == "__main__":
    sync_locations()
