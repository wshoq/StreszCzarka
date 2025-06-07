const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const LAST_URLS_PATH = path.join(__dirname, "last.json");
const MAX_URLS = 5;

// Globalne obsługi błędów dla lepszego debugowania
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Funkcja odczytu zapisanych URL-i
function getLastUrls() {
  try {
    const data = fs.readFileSync(LAST_URLS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Funkcja zapisu nowego URL-a
function addUrlToHistory(url) {
  let urls = getLastUrls();

  // Usuń duplikaty
  urls = urls.filter((u) => u !== url);

  // Dodaj nowy na początek
  urls.unshift(url);

  // Ogranicz do MAX_URLS
  if (urls.length > MAX_URLS) {
    urls = urls.slice(0, MAX_URLS);
  }

  fs.writeFileSync(LAST_URLS_PATH, JSON.stringify(urls, null, 2), "utf-8");
}

// Endpoint zdrowotny (do testów)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint ekstrakcji artykułu
app.post("/extract", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Brak URL w żądaniu" });
  }

  const recentUrls = getLastUrls();
  if (recentUrls.includes(url)) {
    return res.status(200).json({ message: "URL już był — pomijam" });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch {
      console.warn("⏳ domcontentloaded failed, retrying with load...");
      await page.goto(url, {
        waitUntil: "load",
        timeout: 60000,
      });
    }

    await page.waitForTimeout(1000);

    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);

    res.json({
      title,
      content: content.trim(),
    });
  } catch (err) {
    console.error("Błąd podczas ekstrakcji:", err);
    res.status(500).json({ error: `Błąd przetwarzania: ${err.message}` });
  } finally {
    if (browser) await browser.close();
  }
});

// Endpoint do zapisywania URL po wysłaniu na Telegram
app.post("/remember", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Brak URL" });
  }

  const recentUrls = getLastUrls();
  if (recentUrls.includes(url)) {
    return res.status(200).json({ message: "URL już zapisany" });
  }

  addUrlToHistory(url);
  res.json({ message: "URL zapisany" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});
