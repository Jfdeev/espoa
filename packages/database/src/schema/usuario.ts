import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const usuario = pgTable("usuario", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  authProvider: varchar("auth_provider", { length: 20 }).notNull().default("email"), // 'email' | 'google'
  googleId: varchar("google_id", { length: 128 }).unique(), // sub do Google OAuth
  passwordHash: varchar("password_hash", { length: 255 }), // null para usuários Google
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: varchar("verification_token", { length: 128 }),
  resetToken: varchar("reset_token", { length: 128 }),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
