# Usa una imagen base de Python
FROM python:3.9-slim-buster

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Establece el PYTHONPATH para que Python pueda encontrar el módulo 'app'
ENV PYTHONPATH /app

# Copia el archivo de requisitos e instala las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --force-reinstall -r requirements.txt

# Copia los archivos de Alembic explícitamente
COPY alembic.ini .
COPY alembic alembic

# Copia el resto del código de la aplicación
COPY . .

# Copia el entrypoint y lo hace ejecutable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expone el puerto en el que la aplicación FastAPI se ejecutará
EXPOSE 8000

# Establece el entrypoint y el comando por defecto
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
