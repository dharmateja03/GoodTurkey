import { Router } from "express";
import { db } from "../db/index";
import { quotes } from "../db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

// Get all quotes for user (includes system quotes)
router.get("/", async (req: AuthRequest, res) => {
  try {
    const allQuotes = await db
      .select()
      .from(quotes)
      .where(
        or(
          eq(quotes.userId, req.userId!), // user's own quotes
          eq(quotes.isSystem, true) // system quotes for everyone
        )
      );

    res.json(allQuotes);
  } catch (error) {
    console.error("Get quotes error:", error);
    res.status(500).json({ error: "Failed to get quotes" });
  }
});

// Create new quote
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { text, author } = req.body;

    if (!text || !author) {
      res.status(400).json({ error: "Text and author are required" });
      return;
    }

    const [newQuote] = await db
      .insert(quotes)
      .values({
        userId: req.userId!,
        text,
        author,
      })
      .returning();

    res.status(201).json(newQuote);
  } catch (error) {
    console.error("Create quote error:", error);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// Update quote
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { text, author, isActive } = req.body;

    const [updated] = await db
      .update(quotes)
      .set({ text, author, isActive })
      .where(and(eq(quotes.id, id), eq(quotes.userId, req.userId!)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error("Update quote error:", error);
    res.status(500).json({ error: "Failed to update quote" });
  }
});

// Delete quote (cannot delete system quotes)
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Only allow deleting user's own quotes (not system quotes)
    const [deleted] = await db
      .delete(quotes)
      .where(
        and(
          eq(quotes.id, id),
          eq(quotes.userId, req.userId!),
          eq(quotes.isSystem, false)
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Quote not found or cannot be deleted" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete quote error:", error);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

// Get random active quote for extension (includes system quotes)
router.get("/random", async (req: AuthRequest, res) => {
  try {
    const activeQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.isActive, true),
          or(
            eq(quotes.userId, req.userId!), // user's own quotes
            eq(quotes.isSystem, true) // system quotes
          )
        )
      );

    if (activeQuotes.length === 0) {
      res.status(404).json({ error: "No active quotes found" });
      return;
    }

    const randomQuote = activeQuotes[Math.floor(Math.random() * activeQuotes.length)];
    res.json(randomQuote);
  } catch (error) {
    console.error("Get random quote error:", error);
    res.status(500).json({ error: "Failed to get quote" });
  }
});

export default router;