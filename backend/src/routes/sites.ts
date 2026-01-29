import { Router } from "express";
import { db } from "../db/index";
import { blockedSites, timeWindows } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import type { BlockedSite, TimeWindow } from "../db/schema";

const router = Router();

router.use(authMiddleware);

const UNLOCK_DELAY_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function isUnlockReady(unlockRequestedAt: Date | null): boolean {
  if (!unlockRequestedAt) return false;
  return Date.now() - unlockRequestedAt.getTime() >= UNLOCK_DELAY_MS;
}

function getUnlockTimeRemaining(unlockRequestedAt: Date | null): number {
  if (!unlockRequestedAt) return UNLOCK_DELAY_MS;
  const elapsed = Date.now() - unlockRequestedAt.getTime();
  return Math.max(0, UNLOCK_DELAY_MS - elapsed);
}

router.get("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const sites = await db
      .select()
      .from(blockedSites)
      .where(eq(blockedSites.userId, req.userId!));

    const sitesWithWindows = await Promise.all(
      sites.map(async (site) => {
        const windows = await db
          .select()
          .from(timeWindows)
          .where(eq(timeWindows.blockedSiteId, site.id));

        return {
          ...site,
          timeWindows: windows,
          unlockReady: isUnlockReady(site.unlockRequestedAt),
          timeRemaining: site.unlockRequestedAt
            ? getUnlockTimeRemaining(site.unlockRequestedAt)
            : null,
        };
      })
    );

    res.json(sitesWithWindows);
  } catch (error) {
    console.error("Get sites error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { url, categoryId, isActive } = req.body;

    if (!url) {
      res.status(400).json({ error: "URL required" });
      return;
    }

    const [newSite] = await db
      .insert(blockedSites)
      .values({
        userId: req.userId!,
        categoryId: categoryId || null,
        url,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json(newSite);
  } catch (error) {
    console.error("Create site error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { url, categoryId, isActive } = req.body;

    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, id),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(404).json({ error: "Site not found" });
      return;
    }

    // Check if trying to deactivate (make less restrictive)
    const isDeactivating = isActive === false && site.isActive === true;

    if (isDeactivating) {
      // Requires 6-hour unlock period
      if (!site.unlockRequestedAt) {
        res.status(403).json({
          error: "Unlock not requested",
          message: "You must request unlock first and wait 6 hours before deactivating"
        });
        return;
      }

      if (!isUnlockReady(site.unlockRequestedAt)) {
        const timeRemaining = getUnlockTimeRemaining(site.unlockRequestedAt);
        res.status(403).json({
          error: "Unlock not ready",
          message: "6-hour waiting period not complete",
          timeRemaining,
        });
        return;
      }
    }

    // If activating or other changes, clear the unlock request
    const shouldClearUnlock = isActive === true || !isDeactivating;

    const [updated] = await db
      .update(blockedSites)
      .set({
        url: url || site.url,
        categoryId: categoryId !== undefined ? categoryId : site.categoryId,
        isActive: isActive !== undefined ? isActive : site.isActive,
        unlockRequestedAt: shouldClearUnlock ? null : site.unlockRequestedAt,
      })
      .where(eq(blockedSites.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update site error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Request unlock (start 6-hour countdown for delete/deactivate)
router.post("/:id/request-unlock", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, id),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(404).json({ error: "Site not found" });
      return;
    }

    // If already requested, return current status
    if (site.unlockRequestedAt) {
      const timeRemaining = getUnlockTimeRemaining(site.unlockRequestedAt);
      res.json({
        ...site,
        unlockRequestedAt: site.unlockRequestedAt,
        unlockReady: isUnlockReady(site.unlockRequestedAt),
        timeRemaining,
      });
      return;
    }

    // Set unlock request timestamp
    const [updated] = await db
      .update(blockedSites)
      .set({ unlockRequestedAt: new Date() })
      .where(eq(blockedSites.id, id))
      .returning();

    res.json({
      ...updated,
      unlockReady: false,
      timeRemaining: UNLOCK_DELAY_MS,
    });
  } catch (error) {
    console.error("Request unlock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel unlock request
router.post("/:id/cancel-unlock", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, id),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(404).json({ error: "Site not found" });
      return;
    }

    const [updated] = await db
      .update(blockedSites)
      .set({ unlockRequestedAt: null })
      .where(eq(blockedSites.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Cancel unlock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete site (only allowed after 6-hour unlock period)
router.delete("/:id", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    const site = await db.query.blockedSites.findFirst({
      where: and(
        eq(blockedSites.id, id),
        eq(blockedSites.userId, req.userId!)
      ),
    });

    if (!site) {
      res.status(404).json({ error: "Site not found" });
      return;
    }

    // Check if unlock was requested and 6 hours have passed
    if (!site.unlockRequestedAt) {
      res.status(403).json({
        error: "Unlock not requested",
        message: "You must request unlock first and wait 6 hours before deleting"
      });
      return;
    }

    if (!isUnlockReady(site.unlockRequestedAt)) {
      const timeRemaining = getUnlockTimeRemaining(site.unlockRequestedAt);
      res.status(403).json({
        error: "Unlock not ready",
        message: "6-hour waiting period not complete",
        timeRemaining,
      });
      return;
    }

    await db.delete(blockedSites).where(eq(blockedSites.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Delete site error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
