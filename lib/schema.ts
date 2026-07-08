import { pgTable, uuid, varchar, boolean, timestamp, bigint, text, date, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  bePartnerPhone: varchar("be_partner_phone", { length: 20 }),
  bePartnerMonthlyTarget: bigint("be_partner_monthly_target", { mode: "number" }),
  bePartnerSavingsBuffer: bigint("be_partner_savings_buffer", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  target: varchar("target", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  note: text("note").default("").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  lenderType: varchar("lender_type", { length: 30 }).notNull(),
  principal: bigint("principal", { mode: "number" }).notNull(),
  monthlyPayment: bigint("monthly_payment", { mode: "number" }),
  totalMonths: integer("total_months"),
  monthsPaid: integer("months_paid").default(0).notNull(),
  startMonth: varchar("start_month", { length: 7 }).notNull(),
  dueDay: integer("due_day"),
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beDailyTargets = pgTable("be_daily_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beeFixedItems = pgTable("bee_fixed_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 10 }).notNull(), // 'income' | 'expense'
  name: varchar("name", { length: 100 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
export type BeDailyTarget = typeof beDailyTargets.$inferSelect;
export type BeeFixedItem = typeof beeFixedItems.$inferSelect;
