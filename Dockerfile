FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ✅ Kluczowy krok — ręczne wymuszenie instalacji przeglądarek
RUN npx playwright install chromium --with-deps

# Render używa CMD, ale my dodatkowo zadbamy o fallback
CMD npx playwright install chromium && node index.js
