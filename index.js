import { App } from "@tinyhttp/app"
import https from "https"
import http from "http"
import { logger } from "@tinyhttp/logger"
import sirv from "sirv"

const app = new App()

app.use("/pdf-viewer/", sirv("pdf-viewer"))

app.get("/pdf-viewer/file", async (req, res) => {
  const httpx = req.query.l.startsWith("https") ? https : http

  console.log(`fetching: ${req.query.l}`)

  return new Promise((resolve, reject) => {
    try {
      httpx.get(req.query.l, async (stream) => {
        if (stream.headers["content-type"] !== "application/pdf") {
          res.status(403).end()
          resolve()
          return
        }
        stream.pipe(res)
        stream.on("end", resolve)
      })
    } catch (e) {
      console.error(e)
      reject()
    }
  })
})

app.listen(process.env.PORT || 3000)
