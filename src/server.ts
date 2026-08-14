import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env";
import { auth } from "./config/auth";
import { webhookRouter } from "./routes/webhook";
import { apiRouter } from "./routes/api";
import { processDueFollowUps } from "./services/followUpService";

const app = express();

app.use(cors({ origin: env.dashboardUrl, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/webhook", webhookRouter);
app.use("/api", apiRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("unhandled error:", err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});

setInterval(() => {
  processDueFollowUps().catch((err) => console.error("follow-up scheduler error:", err));
}, 60_000);
