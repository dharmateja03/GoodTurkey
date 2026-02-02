import { Router } from "express";
import { db } from "../db/index.js";
import { categories } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const userCategories = await db.query.categories.findMany({
      where: eq(categories.userId, req.userId!),
    });

    res.json(userCategories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { name, color } = req.body;

    if (!name) {
      res.status(400).json({ error: "Category name required" });
      return;
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: req.userId!,
        name,
        color: color || "#6B7280",
      })
      .returning();

    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.userId, req.userId!)
      ),
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const [updated] = await db
      .update(categories)
      .set({
        name: name || category.name,
        color: color !== undefined ? color : category.color,
      })
      .where(eq(categories.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.userId, req.userId!)
      ),
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    await db.delete(categories).where(eq(categories.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
