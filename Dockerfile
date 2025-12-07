FROM python:3.11-slim

WORKDIR /app

# Встановлюємо системні залежності для Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо файли
COPY requirements.txt .
COPY bot.py .

# Встановлюємо Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Встановлюємо браузер для Playwright
RUN playwright install chromium
RUN playwright install-deps chromium

# Запускаємо бота
CMD ["python", "bot.py"]
