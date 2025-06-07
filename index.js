const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" })); // limit request body

const LAST_URLS_PATH = path.join(__dirname, "last.json");
const MAX_URLS = 5;

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

function getLastUrls() {
  try {
    const data = fs.readFileSync(LAST_URLS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function addUrlToHistory(url) {
  let urls = getLastUrls();
  urls = urls.filter((u) => u !== url);
  urls.unshift(url);
  if (urls.length > MAX_URLS) {
    urls = urls.slice(0, MAX_URLS);
  }
  fs.writeFileSync(LAST_URLS_PATH, JSON.stringify(urls, null, 2), "utf-8");
}

app.get("/health", (req, res) => {
  console.log("✅ /health ping");
  res.json({ status: "ok" });
});

app.post("/extract", async (req, res) => {
  const { url } = req.body;
  console.log(`📥 Żądanie ekstrakcji: ${url}`);

  if (!url) {
    return res.status(400).json({ error: "Brak URL w żądaniu" });
  }

  const recentUrls = getLastUrls();
  if (recentUrls.includes(url)) {
    console.log("⚠️ URL już był — pomijam.");
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
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    } catch (e) {
      console.warn("⏳ domcontentloaded failed, retrying with load...");
      try {
        await page.goto(url, { waitUntil: "load", timeout: 60000 });
      } catch (e2) {
        console.error("❌ Nie udało się wczytać strony:", e2.message);
        return res.status(500).json({ error: "Nie udało się wczytać strony" });
      }
    }

    await page.waitForTimeout(1000); // krótkie czekanie

    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);

    console.log("✅ Tytuł:", title);
    console.log("📄 Fragment treści:", content.slice(0, 300), "...");

    res.json({
      title,
      content: content.trim(),
    });
  } catch (err) {
    console.error("❌ Błąd podczas ekstrakcji:", err.message);
    res.status(500).json({ error: `Błąd przetwarzania: ${err.message}` });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn("⚠️ Błąd przy zamykaniu przeglądarki:", e.message);
      }
    }
  }
});

app.post("/remember", (req, res) => {
  const { url } = req.body;
  console.log("🧠 Zapamiętuję URL:", url);

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
