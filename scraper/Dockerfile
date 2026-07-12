FROM python:3.12-alpine

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY jobscout_scraper ./jobscout_scraper

ENV DATA_DIR=/data \
    CONFIG_PATH=/data/config.json

CMD ["python", "-m", "jobscout_scraper", "loop"]
