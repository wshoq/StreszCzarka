FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 10000

CMD ["node", "index.js"]
