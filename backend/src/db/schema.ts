import { pgTable, uuid, varchar, boolean, timestamp, integer, time, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex("email_idx").on(table.email),
    };
  }
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }), // hex color
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const blockedSites = pgTable(
  "blocked_sites",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    url: varchar("url", { length: 500 }).notNull(),
    isActive: boolean("is_active").default(true),
    unlockRequestedAt: timestamp("unlock_requested_at"), // When user requested to delete/deactivate (6-hour delay)
    accessAttempts: integer("access_attempts").default(0), // How many times user tried to access this site
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const timeWindows = pgTable(
  "time_windows",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    blockedSiteId: uuid("blocked_site_id")
      .notNull()
      .references(() => blockedSites.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday), NULL for all days
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" }), // nullable for system quotes
    text: varchar("text", { length: 1000 }).notNull(),
    author: varchar("author", { length: 100 }).notNull(),
    isActive: boolean("is_active").default(true),
    isSystem: boolean("is_system").default(false), // true for pre-populated quotes
    createdAt: timestamp("created_at").defaultNow(),
  }
);

// Types for exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type BlockedSite = typeof blockedSites.$inferSelect;
export type NewBlockedSite = typeof blockedSites.$inferInsert;

export type TimeWindow = typeof timeWindows.$inferSelect;
export type NewTimeWindow = typeof timeWindows.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
