import { App } from "@tinyhttp/app";
import { sanitizeUrl } from "@braintree/sanitize-url";
import https from "https";
import http from "http";
import sirv from "sirv";

const app = new App();

app.use("/pdf-viewer/", sirv("pdf-viewer"));

app.get("/pdf-viewer/file", async (req, res) => {
  const fPath = sanitizeUrl(req.query.l);
  console.log(`fetching: ${fPath}`);

  if (!fPath.startsWith("http")) {
    res.status(403).end();
    return;
  }

  const httpx = fPath.startsWith("https") ? https : http;

  return new Promise((resolve, reject) => {
    try {
      httpx.get(fPath, async (stream) => {
        if (stream.headers["content-type"] !== "application/pdf") {
          res.status(403).end();
          resolve();
          return;
        }
        stream.pipe(res);
        stream.on("end", resolve);
      });
    } catch (e) {
      console.error(e);
      reject();
    }
  });
});

app.listen(process.env.PORT || 3000);
