import {
  pgTable,
  serial,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const conflictLog = pgTable("conflict_log", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  operationId: varchar("operation_id", { length: 255 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 255 }).notNull(),
  localData: jsonb("local_data"),
  remoteData: jsonb("remote_data"),
  reason: text("reason"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
