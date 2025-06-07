# Oficjalny obraz Playwright z Ubuntu + wszystkie zależności
FROM mcr.microsoft.com/playwright:focal

# Ustaw katalog roboczy
WORKDIR /app

# Kopiuj package.json i package-lock.json (jeśli masz)
COPY package.json package-lock.json* ./

# Instaluj zależności Node.js
RUN npm install

# Kopiuj resztę plików aplikacji
COPY . .

# Otwórz port, na którym działa aplikacja
EXPOSE 10000

# Start aplikacji
CMD ["node", "index.js"]
