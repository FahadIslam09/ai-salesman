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
// Better Auth Core Tables
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

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }),
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
  useBusinessInfo: boolean("use_business_info").default(true).notNull(),
  businessName: text("business_name"),
  businessType: text("business_type"),
  contactNumber: text("contact_number"),
  businessInfo: text("business_info"),
  orderInfo: text("order_info"),
  paymentInfo: text("payment_info"),
  deliveryInfo: text("delivery_info"),
  additionalInfo: text("additional_info"),
  returnPolicy: text("return_policy"),
  exchangePolicy: text("exchange_policy"),
  refundPolicy: text("refund_policy"),
  warranty: text("warranty"),
  paymentNumber: text("payment_number"),
  codMessage: text("cod_message"),
  fullMessage: text("full_message"),
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

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keywords: text("keywords").notNull(),
    imageUrl: text("image_url").notNull(),
    price: integer("price"),
    description: text("description"),
    discount: integer("discount"),
    stockStatus: text("stock_status").default("available").notNull(), // available, low_stock, out_of_stock, hidden
    category: text("category"),
    variants: jsonb("variants").$type<string[]>(),
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    deliveryInfo: text("delivery_info"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdIdx: index("products_page_id_idx").on(table.pageId),
  })
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    psid: text("psid").notNull(),
    name: text("name"),
    profilePicUrl: text("profile_pic_url"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    status: text("status").default("new").notNull(), // new, interested, negotiating, purchased, not_interested
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdPsidUnique: unique("customers_page_id_psid_unique").on(table.pageId, table.psid),
    pageIdIdx: index("customers_page_id_idx").on(table.pageId),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    summary: text("summary"),
    summarizedUpto: timestamp("summarized_upto", { withTimezone: true }),
    status: text("status").default("new").notNull(), // new, interested, negotiating, follow_up, purchased, not_interested, closed
    handledBy: text("handled_by").default("bot").notNull(), // bot, human
    attentionReason: text("attention_reason"), // knowledge_request, human_requested, angry, purchase_ready, high_value, follow_up_pending, ai_error
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdCustomerUnique: unique("conversations_page_id_customer_id_unique").on(table.pageId, table.customerId),
    pageIdLastMessageIdx: index("conversations_page_id_last_message_idx").on(table.pageId, table.lastMessageAt),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user, model, human
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    fbMessageId: text("fb_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    convIdCreatedAtIdx: index("messages_conv_id_created_at_idx").on(table.conversationId, table.createdAt),
  })
);

export const knowledgeRequests = pgTable("knowledge_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").default("pending").notNull(), // pending, answered, dismissed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

export const followUps = pgTable("follow_ups", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  reason: text("reason"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, sent, replied, completed, cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  amount: integer("amount").notNull(), // BDT
  source: text("source").default("inbox").notNull(), // inbox, comment, follow_up, direct, other
  aiAssisted: boolean("ai_assisted").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    customerName: text("customer_name"),
    phone: text("phone"),
    address: text("address"),
    productName: text("product_name"),
    sizeVariant: text("size_variant"),
    paymentMethod: text("payment_method"), // cod, full
    totalAmount: integer("total_amount"),
    deliveryCharge: integer("delivery_charge"),
    remainingAmount: integer("remaining_amount"),
    paymentNumber: text("payment_number"),
    screenshotUrl: text("screenshot_url"),
    status: text("status").default("pending").notNull(), // pending, confirmed, rejected
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageIdStatusIdx: index("orders_page_id_status_idx").on(table.pageId, table.status),
    pageIdCreatedAtIdx: index("orders_page_id_created_at_idx").on(table.pageId, table.createdAt),
  })
);

// -------------------------------------------------------------
// Billing & Quota Tables
// -------------------------------------------------------------
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // bkash, manual
  providerTxnId: text("provider_txn_id").notNull().unique(),
  providerPaymentId: text("provider_payment_id"),
  package: text("package").notNull(), // starter, basic, business, pro, enterprise
  creditsGranted: integer("credits_granted").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("BDT").notNull(),
  status: text("status").default("pending").notNull(), // pending, paid, failed, refunded
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const creditBalances = pgTable("credit_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  credits: integer("credits").default(0).notNull(),
  totalPurchased: integer("total_purchased").default(0).notNull(),
  totalUsed: integer("total_used").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    kind: text("kind").notNull(), // inbox_reply, comment_reply, follow_up
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    creditsDeducted: integer("credits_deducted"),
    apiCostPaisa: integer("api_cost_paisa"), // actual API cost in paisa (1 BDT = 100 paisa)
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
  sessions: many(sessions),
  accounts: many(accounts),
  pages: many(pages),
  payments: many(payments),
  usageLogs: many(usageLogs),
  creditBalance: one(creditBalances),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(users, { fields: [pages.userId], references: [users.id] }),
  botConfig: one(botConfigs),
  faqs: many(faqs),
  products: many(products),
  customers: many(customers),
  conversations: many(conversations),
  knowledgeRequests: many(knowledgeRequests),
  followUps: many(followUps),
  sales: many(sales),
  usageLogs: many(usageLogs),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  page: one(pages, { fields: [customers.pageId], references: [pages.id] }),
  conversations: many(conversations),
  followUps: many(followUps),
  sales: many(sales),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  page: one(pages, { fields: [conversations.pageId], references: [pages.id] }),
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  messages: many(messages),
  knowledgeRequests: many(knowledgeRequests),
  followUps: many(followUps),
  sales: many(sales),
}));
