import "dotenv/config";
import { db } from "./index";
import { users, categories, blockedSites, timeWindows } from "./schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create a test user
    const hashedPassword = await bcrypt.hash("password123", 10);

    const [user] = await db
      .insert(users)
      .values({
        email: "test@example.com",
        passwordHash: hashedPassword,
      })
      .returning();

    console.log("Created user:", user.email);

    // Create categories
    const [socialCategory] = await db
      .insert(categories)
      .values({
        userId: user.id,
        name: "Social Media",
        color: "#FF6B6B",
      })
      .returning();

    const [entertainmentCategory] = await db
      .insert(categories)
      .values({
        userId: user.id,
        name: "Entertainment",
        color: "#4ECDC4",
      })
      .returning();

    console.log("Created categories");

    // Create blocked sites
    const [redditSite] = await db
      .insert(blockedSites)
      .values({
        userId: user.id,
        categoryId: socialCategory.id,
        url: "reddit.com",
        isActive: true,
      })
      .returning();

    const [tiktokSite] = await db
      .insert(blockedSites)
      .values({
        userId: user.id,
        categoryId: socialCategory.id,
        url: "tiktok.com",
        isActive: true,
      })
      .returning();

    const [youtubeSite] = await db
      .insert(blockedSites)
      .values({
        userId: user.id,
        categoryId: entertainmentCategory.id,
        url: "youtube.com",
        isActive: true,
      })
      .returning();

    console.log("Created blocked sites");

    // Create time windows (allow access 2-2:30pm and 6-6:30pm daily)
    await db
      .insert(timeWindows)
      .values({
        blockedSiteId: redditSite.id,
        dayOfWeek: null, // all days
        startTime: "14:00",
        endTime: "14:30",
      })
      .returning();

    await db
      .insert(timeWindows)
      .values({
        blockedSiteId: redditSite.id,
        dayOfWeek: null,
        startTime: "18:00",
        endTime: "18:30",
      })
      .returning();

    // TikTok - only on weekends (5=Saturday, 6=Sunday)
    await db
      .insert(timeWindows)
      .values({
        blockedSiteId: tiktokSite.id,
        dayOfWeek: 5, // Saturday
        startTime: "19:00",
        endTime: "21:00",
      })
      .returning();

    console.log("Created time windows");
    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
