import {
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const syncQueue = pgTable("sync_queue", {
  id: serial("id").primaryKey(),
  operationId: varchar("operation_id", { length: 255 }).notNull().unique(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 255 }).notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  payload: jsonb("payload").notNull(),
  processed: integer("processed").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
