import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------
// SAME FUNCTION
// ----------------------
function timeStringToSeconds(str) {
  if (!str) return Number.POSITIVE_INFINITY;
  const clean = str.trim().split(" ")[0];
  const parts = clean.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "")) return Number.POSITIVE_INFINITY;

  if (parts.length === 1) {
    const s = parseFloat(parts[0]);
    return Number.isNaN(s) ? Number.POSITIVE_INFINITY : s;
  }

  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds))
      return Number.POSITIVE_INFINITY;

    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds)
    ) {
      return Number.POSITIVE_INFINITY;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  return Number.POSITIVE_INFINITY;
}

// -------------------------------------
// API ROUTE — http://localhost:4000/scrape
// -------------------------------------
app.get("/scrape", async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    const url =
      "https://www.tfrrs.org/all_performances/TX_college_m_Abilene_Christian.html?list_hnd=5027&season_hnd=681";

    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector("div.row.gender_m", { timeout: 10000 });

    const data = await page.evaluate(() => {
      function timeStringToSeconds(str) {
        if (!str) return Number.POSITIVE_INFINITY;
        const clean = str.trim().split(" ")[0];
        const parts = clean.split(":").map((p) => p.trim());
        if (parts.some((p) => p === "")) return Number.POSITIVE_INFINITY;

        if (parts.length === 1) {
          const s = parseFloat(parts[0]);
          return Number.isNaN(s) ? Number.POSITIVE_INFINITY : s;
        }

        if (parts.length === 2) {
          const minutes = parseInt(parts[0], 10);
          const seconds = parseFloat(parts[1]);
          if (Number.isNaN(minutes) || Number.isNaN(seconds))
            return Number.POSITIVE_INFINITY;
          return minutes * 60 + seconds;
        }

        if (parts.length === 3) {
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parseFloat(parts[2]);
          if (
            Number.isNaN(hours) ||
            Number.isNaN(minutes) ||
            Number.isNaN(seconds)
          ) {
            return Number.POSITIVE_INFINITY;
          }
          return hours * 3600 + minutes * 60 + seconds;
        }
        return Number.POSITIVE_INFINITY;
      }

      const sections = [];
      const eventBlocks = Array.from(document.querySelectorAll("div.row.gender_m"));

      for (const block of eventBlocks) {
        const headerEl = block.querySelector("h3.font-weight-500");
        if (!headerEl) continue;

        const eventName = headerEl.textContent?.trim() || "";
        if (!eventName) continue;

        const rows = Array.from(
          block.querySelectorAll(".performance-list-body .performance-list-row")
        );

        const bestByAthlete = {};

        for (const row of rows) {
          const name =
            row.querySelector('.col-athlete[data-label="Athlete"]')?.textContent.trim() || "";
          const classYear =
            row.querySelector('.col-narrow[data-label="Year"]')?.textContent.trim() || "";
          const prStr =
            row.querySelector('.col-narrow[data-label="Time"]')?.textContent.trim() || "";

          if (!name || !prStr) continue;
          const seconds = timeStringToSeconds(prStr);
          if (!Number.isFinite(seconds)) continue;

          const existing = bestByAthlete[name];
          if (!existing || seconds < existing.seconds) {
            bestByAthlete[name] = { name, classYear, pr: prStr, seconds };
          }
        }

        const athletes = Object.values(bestByAthlete)
          .sort((a, b) => a.seconds - b.seconds)
          .map((a) => ({
            name: a.name,
            classYear: a.classYear,
            pr: a.pr,
          }));

        if (athletes.length > 0) {
          sections.push({ event: eventName, athletes });
        }
      }

      return sections;
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraping failed", details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// START SERVER ON PORT 4000
app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});
