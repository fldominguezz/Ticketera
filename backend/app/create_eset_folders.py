import os
import logging
logger = logging.getLogger(__name__)
def create_folders():
    """
    Crea la estructura de carpetas para ESET si no existe.
    """
    base_path = "uploads/eset"
    try:
        if not os.path.exists(base_path):
            os.makedirs(base_path)
            logger.info(f"Carpeta creada: {base_path}")
        else:
            pass
    except Exception as e:
        logger.error(f"Error al crear carpetas ESET: {e}")
        pass
if __name__ == "__main__":
    create_folders()
