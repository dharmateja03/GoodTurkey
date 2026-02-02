import { Router } from "express";
import { db } from "../db/index.js";
import { blockedSites, timeWindows } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const sites = await db
      .select()
      .from(blockedSites)
      .where(eq(blockedSites.userId, req.userId!));

    const rules = await Promise.all(
      sites
        .filter((site) => site.isActive)
        .map(async (site) => {
          const windows = await db
            .select()
            .from(timeWindows)
            .where(eq(timeWindows.blockedSiteId, site.id));

          return {
            id: site.id,
            url: site.url,
            timeWindows: windows.map((tw) => ({
              id: tw.id,
              dayOfWeek: tw.dayOfWeek,
              startTime: tw.startTime,
              endTime: tw.endTime,
            })),
          };
        })
    );

    res.json({
      timestamp: new Date().toISOString(),
      rules,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
