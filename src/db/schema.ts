import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -------------------------------------------------------------
// Better Auth Core Table
// -------------------------------------------------------------
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
});

// -------------------------------------------------------------
// SaaS, Bot Automation & E-commerce Tables
// -------------------------------------------------------------

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    fbPageId: text("fb_page_id").notNull().unique(),
    name: text("name").notNull(),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    tokenIv: text("token_iv").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("pages_user_id_idx").on(table.userId),
  })
);

export const botConfigs = pgTable("bot_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().unique().references(() => pages.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(true).notNull(),
  businessInfo: text("business_info"),
  tone: text("tone").default("friendly").notNull(),
  language: text("language").default("auto").notNull(),
  workingHours: jsonb("working_hours"),
  customInstructions: text("custom_instructions"),
});

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => ({
    pageIdIsActiveIdx: index("faqs_page_id_is_active_idx").on(table.pageId, table.isActive),
  })
);

// 🆕 NEW: Products table for AI Image/Catalog Search
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }), // Which page owns this product
    name: text("name").notNull(), // e.g., "Black Formal Shirt"
    keywords: text("keywords").notNull(), // e.g., "black, kalo, shirt, formal" (Helps AI search)
    imageUrl: text("image_url").notNull(), // Link to the image
    price: integer("price"), 
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdIdx: index("products_page_id_idx").on(table.pageId),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    psid: text("psid").notNull(),
    summary: text("summary"),
    summarizedUpto: timestamp("summarized_upto", { withTimezone: true }),
    status: text("status").default("bot").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdPsidUnique: unique("conversations_page_id_psid_unique").on(table.pageId, table.psid),
    pageIdLastMessageIdx: index("conversations_page_id_last_message_idx").on(table.pageId, table.lastMessageAt),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), 
    content: text("content").notNull(),
    fbMessageId: text("fb_message_id"), 
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    convIdCreatedAtIdx: index("messages_conv_id_created_at_idx").on(table.conversationId, table.createdAt),
  })
);

// -------------------------------------------------------------
// Billing & Quota Tables
// -------------------------------------------------------------
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerTxnId: text("provider_txn_id").notNull().unique(),
  providerPaymentId: text("provider_payment_id"),
  plan: text("plan").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("BDT").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastPaymentId: uuid("last_payment_id").references(() => payments.id, { onDelete: "set null" }),
});

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), 
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdCreatedAtIdx: index("usage_logs_user_id_created_at_idx").on(table.userId, table.createdAt),
  })
);

// -------------------------------------------------------------
// Drizzle Relations 
// -------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  pages: many(pages),
  payments: many(payments),
  usageLogs: many(usageLogs),
  subscription: one(subscriptions),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(users, { fields: [pages.userId], references: [users.id] }),
  botConfig: one(botConfigs),
  faqs: many(faqs),
  products: many(products), // 🆕 Relation added
  conversations: many(conversations),
  usageLogs: many(usageLogs),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  page: one(pages, { fields: [conversations.pageId], references: [pages.id] }),
  messages: many(messages),
}));