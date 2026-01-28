import sys
import os

# Simular la lógica del backend
def normalize_mac(mac):
    import re
    if not mac: return None
    cleaned = re.sub(r'[^a-fA-F0-9]', '', str(mac)).lower()
    if len(cleaned) != 12: return str(mac).lower()
    return ":".join(cleaned[i:i+2] for i in range(0, 12, 2))

def test_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]
    
    if not lines: return "Archivo vacío"
    
    # Detectar delimitador
    header_line = lines[0]
    delimiter = ';' if header_line.count(';') > header_line.count(',') else ','
    headers = [h.strip().lower() for h in header_line.split(delimiter)]
    
    print(f"--- DIAGNÓSTICO ---")
    print(f"Delimitador detectado: '{delimiter}'")
    print(f"Cabeceras: {headers}")
    print("-" * 20)

    for i, line in enumerate(lines[1:4]): # Probar las primeras 3 filas
        values = [v.strip() for v in line.split(delimiter)]
        item = {headers[j]: values[j] if j < len(values) else "" for j in range(len(headers))}
        
        # Mapeo
        hostname = item.get("nombre") or item.get("hostname")
        ip = item.get("direcciones ip") or item.get("ip_address")
        os_name = item.get("nombre del sistema operativo")
        
        print(f"FILA {i+1}:")
        print(f"  > Original: {line[:50]}...")
        print(f"  > Hostname extraído: '{hostname}'")
        print(f"  > IP extraída: '{ip}'")
        print(f"  > OS extraído: '{os_name}'")
        print("-" * 10)

test_file('/home/ticket/Equipos.csv')
