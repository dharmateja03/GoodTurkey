import { Router } from "express";
import { db } from "../db/index.js";
import { timeWindows, blockedSites } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.post("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { blockedSiteId, dayOfWeek, startTime, endTime } = req.body;

    if (!blockedSiteId || !startTime || !endTime) {
      res.status(400).json({ error: "blockedSiteId, startTime, and endTime required" });
      return;
    }

    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, blockedSiteId),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(404).json({ error: "Blocked site not found" });
      return;
    }

    const [newWindow] = await db
      .insert(timeWindows)
      .values({
        blockedSiteId,
        dayOfWeek: dayOfWeek ?? null,
        startTime,
        endTime,
      })
      .returning();

    res.status(201).json(newWindow);
  } catch (error) {
    console.error("Create time window error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the time window
    const window = await db.query.timeWindows.findFirst({
      where: eq(timeWindows.id, id),
    });

    if (!window) {
      res.status(404).json({ error: "Time window not found" });
      return;
    }

    // Find the associated blocked site to check ownership
    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, window.blockedSiteId),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    await db.delete(timeWindows).where(eq(timeWindows.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Delete time window error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
