// server.js - dev server đơn giản để test local mà không cần Vercel
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Nạp biến môi trường từ .env (tuỳ chọn)
try { require("dotenv").config(); } catch {}

const apiContact = require("./api/contact.js");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // API route
  if (parsed.pathname === "/api/contact") {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      return res.end();
    }

    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        req.body = JSON.parse(body || "{}");
      } catch {
        req.body = {};
      }
      return apiContact(req, {
        status: (code) => ({
          json: (obj) => {
            res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(obj));
          }
        }),
        setHeader: (k, v) => res.setHeader(k, v)
      });
    });
    return;
  }

  // Static: serve contact.html/css/js
  let filePath = "contact.html";
  if (parsed.pathname !== "/" && parsed.pathname !== "/contact") {
    filePath = parsed.pathname.slice(1);
  }
  const abs = path.join(process.cwd(), filePath);
  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(abs)] || "text/plain; charset=utf-8" });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Dev server chạy: http://localhost:${PORT}`);
});
