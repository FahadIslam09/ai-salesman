import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { events } from "../../utils/events";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// SSE stream of page events for the dashboard inbox (one-way, per user choice).
eventsRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  const listener = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  events.on(`page:${pageId}`, listener);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    events.off(`page:${pageId}`, listener);
  });
});
