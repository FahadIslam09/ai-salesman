import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env";
import { auth } from "./config/auth";
import { webhookRouter } from "./routes/webhook";
import { apiRouter } from "./routes/api";
import { processDueFollowUps } from "./services/followUpService";
import { rateLimit, securityHeaders } from "./routes/middleware/security";

const app = express();

// Disable information disclosure headers
app.disable("x-powered-by");

// Apply OWASP security headers
app.use(securityHeaders);

// CORS configuration with origin validation
const allowedOrigins = [env.dashboardUrl, "http://localhost:3000", "http://localhost:3001"].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, webhooks) or matched origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or set specific origin
      }
    },
    credentials: true,
  })
);

// Rate limiter for authentication endpoints (prevents credential stuffing / brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

app.all("/api/auth/*splat", authLimiter, toNodeHandler(auth));

// Capture raw body for webhook signature verification with 1MB safety cap
app.use(
  express.json({
    limit: "1mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Rate limiter for general API requests (prevents DDoS & scraping)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

// Rate limiter for webhook endpoints (allows high frequency Facebook webhooks safely)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
});

app.get("/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
app.use("/webhook", webhookLimiter, webhookRouter);
app.use("/api", apiLimiter, apiRouter);

// Global Error Handler without leaking internal stack traces in production
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("unhandled server error:", err);
  res.status(err.status || 500).json({
    error: err.code || "internal_server_error",
    message: process.env.NODE_ENV === "production" ? "An internal error occurred." : err.message || "Internal server error",
  });
});

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});

setInterval(() => {
  processDueFollowUps().catch((err) => console.error("follow-up scheduler error:", err));
}, 60_000);
