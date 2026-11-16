# Contenedor para extraer y normalizar datos de combustión de NASA PSI
FROM python:3.12-slim

# Evita archivos .pyc y muestra los mensajes de Python al instante
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATOS_DIR=/datos

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ /app/scripts/
COPY web/ /app/web/
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Carpeta compartida con tu computadora (se monta al ejecutar)
VOLUME ["/datos"]
EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["ayuda"]
