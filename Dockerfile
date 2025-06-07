FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

# Skopiuj pliki
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# ✅ Kluczowy krok – instalacja przeglądarek
RUN npx playwright install --with-deps

# Otwórz port
EXPOSE 10000

CMD ["node", "index.js"]
