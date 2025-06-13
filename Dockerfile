FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Ręczna instalacja przeglądarek (chromium)
RUN npx playwright install chromium --with-deps

CMD ["node", "index.js"]
