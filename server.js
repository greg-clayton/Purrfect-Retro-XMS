const express = require("express");
const path = require("path");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_BASE = "api.jsonbin.io";

function jsonbinRequest(method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: JSONBIN_BASE,
      path: `/v3/b/${JSONBIN_BIN_ID}${method === "GET" ? "/latest" : ""}`,
      method,
      headers: {
        "X-Master-Key": JSONBIN_API_KEY,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON from JSONBin"));
        }
      });
    });
    req.on("error", reject);
    if (body !== null) req.write(JSON.stringify(body));
    req.end();
  });
}

async function readSubmissions() {
  const result = await jsonbinRequest("GET");
  return result.record?.submissions || [];
}

async function writeSubmissions(data) {
  await jsonbinRequest("PUT", { submissions: data });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/submissions", async (req, res) => {
  try {
    res.json(await readSubmissions());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to read submissions" });
  }
});

app.post("/api/submissions", async (req, res) => {
  const submissions = req.body;
  if (!Array.isArray(submissions)) return res.status(400).json({ error: "Expected array" });
  try {
    await writeSubmissions(submissions);
    res.json(submissions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save submissions" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Purrfect Retro running on port ${PORT}`));
