import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('intake'),
  trackId: text('track_id'),
  profile: text('profile').notNull().default('{}'),
  messages: text('messages').notNull().default('[]'),
  recommendations: text('recommendations'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
