import csv
import sys
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.asset import Asset
from app.db.models.location import LocationNode
from app.crud.crud_location import location as crud_location

def simplify_os_version(version_str):
    if not version_str or not isinstance(version_str, str):
        return version_str
    # Extrae el primer número antes del punto (ej: 10.0.x -> 10)
    return version_str.split('.')[0]

def import_eset_csv(file_path):
    db = SessionLocal()
    try:
        # Detectar delimitador (ESET suele usar tabs o punto y coma)
        with open(file_path, 'r', encoding='utf-16') as f: # ESET suele exportar en UTF-16
            sample = f.read(1024)
            dialect = csv.Sniffer().sniff(sample)
            f.seek(0)
            reader = csv.DictReader(f, dialect=dialect)
            
            count = 0
            for row in reader:
                # Mapeo de columnas (ajustar según el header real si es necesario)
                hostname = row.get('Nombre') or row.get('FQDN')
                grupo_path = row.get('Grupo')
                ip = row.get('Direcciones IP')
                os_name = row.get('Nombre del sistema operativo')
                os_ver_raw = row.get('Versión de sistema operativo')
                operador = row.get('Usuarios registrados')
                
                if not hostname:
                    continue
                
                # Simplificar versión
                os_version = simplify_os_version(os_ver_raw)
                
                # Buscar o crear la ubicación bajo PFA/ESET CLOUD/
                full_path = f"PFA/ESET CLOUD/{grupo_path.strip('/')}"
                location_node = crud_location.get_or_create_by_path(db, path=full_path)
                
                # Buscar si el asset ya existe por hostname
                asset = db.query(Asset).filter(Asset.hostname == hostname).first()
                
                if not asset:
                    asset = Asset(hostname=hostname)
                    db.add(asset)
                
                asset.ip_address = ip
                asset.os_name = os_name
                asset.os_version = os_version
                asset.location_node_id = location_node.id
                asset.source_system = "ESET"
                asset.av_product = "ESET"
                asset.observations = f"Operador: {operador}" if operador else ""
                
                count += 1
                if count % 50 == 0:
                    db.commit()
                    print(f"Procesados {count} activos...")
            
            db.commit()
            print(f"IMPORTACIÓN FINALIZADA: {count} activos procesados correctamente.")
            
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python import_eset_assets.py <archivo.csv>")
    else:
        import_eset_csv(sys.argv[1])
