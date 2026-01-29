// Drizzle Schema for Jynk Backend
// Supports SQLite (dev) and PostgreSQL (prod)

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// SQLite Schema
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  address: text('address').notNull().unique(),
  walletType: text('wallet_type', { enum: ['evm', 'solana'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const storeProfiles = sqliteTable('store_profiles', {
  address: text('address').primaryKey(),
  displayName: text('display_name').notNull(),
  bio: text('bio').default(''),
  avatar: text('avatar'),
  theme: text('theme').default('midnight'),
  views: integer('views').default(0),
  totalEarned: real('total_earned').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const socialLinks = sqliteTable('social_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  address: text('address').notNull(),
  platform: text('platform').notNull(),
  url: text('url').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  price: real('price').notNull(),
  targetUrl: text('target_url').notNull(),
  encryptedUrl: text('encrypted_url').notNull(),
  creatorAddress: text('creator_address').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  soldCount: integer('sold_count').default(0),
  maxQuantity: integer('max_quantity'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  buyerAddress: text('buyer_address').notNull(),
  txHash: text('tx_hash').notNull(),
  network: text('network', { enum: ['base', 'solana'] }).notNull(),
  amount: real('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Type exports (inferred from schema)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StoreProfile = typeof storeProfiles.$inferSelect;
export type NewStoreProfile = typeof storeProfiles.$inferInsert;
export type SocialLink = typeof socialLinks.$inferSelect;
export type NewSocialLink = typeof socialLinks.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
