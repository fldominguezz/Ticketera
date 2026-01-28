import os
import sys

def process_groups(input_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return

    try:
        with open(input_file, 'r', encoding='latin-1') as f:
            lines = [line.strip() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # 1. Limpiar ruidos y prefijos
    cleaned_paths = []
    prefixes = ["Todos\\Empresas\\", "All Groups\\", "Everything\\"]
    
    for line in lines:
        p = line
        for pref in prefixes:
            if p.startswith(pref):
                p = p[len(pref):]
        
        # El último componente es el host/user, lo quitamos
        parts = p.split('\\')
        if len(parts) > 1:
            clean_path = '\\'.join(parts[:-1])
            cleaned_paths.append(clean_path)

    # 2. Quedarse solo con las rutas más profundas (hojas de la jerarquía)
    # Eliminamos duplicados primero
    unique_paths = sorted(list(set(cleaned_paths)), key=len, reverse=True)
    final_paths = []
    
    for p in unique_paths:
        # Si esta ruta no es un prefijo de alguna ruta que ya aceptamos como 'más larga'
        is_subset = False
        for longer_path in final_paths:
            if longer_path.startswith(p + '\\'):
                is_subset = True
                break
        if not is_subset:
            final_paths.append(p)

    # 3. Mostrar resultados
    print(f"--- RUTAS MÁS LARGAS DETECTADAS ({len(final_paths)}) ---")
    for path in sorted(final_paths):
        print(path)

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else '/app/ESETGRUPOS.txt'
    process_groups(path)
