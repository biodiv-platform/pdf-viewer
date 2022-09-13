import { sanitizeUrl } from "@braintree/sanitize-url";
import { App } from "@tinyhttp/app";
import request from "follow-redirects";
import sirv from "sirv";

const app = new App();

const getReqObject = (reqURL) => {
  const fPath = sanitizeUrl(reqURL);
  console.log(`fetching: ${fPath}`);

  if (!fPath.startsWith("http")) return;

  return {
    fPath,
    httpx: fPath.startsWith("https") ? request.https : request.http,
  };
};

app.use("/pdf-viewer/", sirv("pdf-viewer"));

app.get("/pdf-viewer/file", async (req, res) => {
  const { httpx, fPath } = getReqObject(req.query.l);

  if (!httpx) {
    res.send({ pdf: false });
    return;
  }

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

app.get("/pdf-viewer/validate", async (req, res) => {
  const { httpx, fPath } = getReqObject(req.query.l);

  if (!httpx) {
    res.send({ pdf: false });
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      httpx.get(fPath, async (stream) => {
        res.send({ pdf: stream.headers["content-type"] === "application/pdf" });
        resolve();
      });
    } catch (e) {
      console.error(e);
      res.send({ pdf: false });
      reject();
    }
  });
});

app.listen(process.env.PORT || 3000);
