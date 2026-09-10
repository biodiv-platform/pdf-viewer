import { sanitizeUrl } from "@braintree/sanitize-url";
import { App } from "@tinyhttp/app";
import request from "follow-redirects";
import sirv from "sirv";

const app = new App();

app.use("/pdf-viewer/", sirv("pdf-viewer", { dev: process.env.NODE_ENV !== "production" }));

app.get("/pdf-viewer/file", async (req, res) => {
  if (!req.query.l) {
    res.status(400).end();
    return;
  }

  const fPath = sanitizeUrl(req.query.l);
  console.log(`fetching: ${fPath}`);

  if (!fPath.startsWith("http://") && !fPath.startsWith("https://")) {
    res.status(403).end();
    return;
  }

  const httpx = fPath.startsWith("https://") ? request.https : request.http;

  return new Promise((resolve) => {
    try {
      const options = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      };

      if (req.headers.range) {
        options.headers.range = req.headers.range;
      }

      const clientReq = httpx.get(fPath, options, (stream) => {
        const statusCode = stream.statusCode || 200;
        if (statusCode >= 400) {
          res.status(statusCode).end();
          stream.resume();
          resolve();
          return;
        }

        const contentType = (stream.headers["content-type"] || "").toLowerCase();
        const isPdf =
          contentType.includes("pdf") ||
          contentType.includes("octet-stream") ||
          fPath.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          res.status(403).end();
          stream.resume();
          resolve();
          return;
        }

        res.status(statusCode);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Allow-Origin", "*");
        if (stream.headers["content-length"]) {
          res.setHeader("Content-Length", stream.headers["content-length"]);
        }
        if (stream.headers["accept-ranges"]) {
          res.setHeader("Accept-Ranges", stream.headers["accept-ranges"]);
        }
        if (stream.headers["content-range"]) {
          res.setHeader("Content-Range", stream.headers["content-range"]);
        }

        stream.pipe(res);
        stream.on("end", resolve);
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.writableEnded) {
            res.status(500).end();
          }
          resolve();
        });
      });

      clientReq.on("error", (err) => {
        console.error("Request error:", err);
        if (!res.writableEnded) {
          res.status(502).end();
        }
        resolve();
      });
    } catch (e) {
      console.error("Fetch error:", e);
      if (!res.writableEnded) {
        res.status(500).end();
      }
      resolve();
    }
  });
});

app.listen(process.env.PORT || 3000);
