// Simple Database Layer using sql.js (pure JS, no native compilation needed)
// Supports SQLite syntax, easy to migrate to PostgreSQL later

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path
const dataDir = join(__dirname, '../../data');
const dbPath = join(dataDir, 'jynk.db');

// Ensure data directory exists
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let db: any;
let isInitialized = false;

async function initDatabase() {
  // Prevent double initialization
  if (isInitialized) {
    console.log('Database already initialized, skipping...');
    return;
  }

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    console.log('Loading existing database from:', dbPath);
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Database loaded successfully');
  } else {
    console.log('Creating new database...');
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      wallet_type TEXT NOT NULL CHECK(wallet_type IN ('evm', 'solana')),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS store_profiles (
      address TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      display_name TEXT,
      bio TEXT DEFAULT '',
      avatar TEXT,
      theme TEXT DEFAULT 'midnight',
      views INTEGER DEFAULT 0,
      total_earned REAL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);
  
  // Migration: Add username column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE store_profiles ADD COLUMN username TEXT UNIQUE');
    console.log('Migration: Added username column to store_profiles');
  } catch (e) {
    // Column already exists, ignore error
  }
  
  // Migration: Copy display_name to username for existing records
  try {
    db.run(`
      UPDATE store_profiles 
      SET username = LOWER(REPLACE(REPLACE(display_name, '@', ''), ' ', ''))
      WHERE username IS NULL AND display_name IS NOT NULL
    `);
    console.log('Migration: Copied display_name to username for existing records');
  } catch (e) {
    console.log('Migration: No records needed updating or error:', e);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      FOREIGN KEY (address) REFERENCES store_profiles(address) ON DELETE CASCADE,
      UNIQUE(address, platform)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      target_url TEXT NOT NULL,
      encrypted_url TEXT NOT NULL,
      creator_address TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      sold_count INTEGER DEFAULT 0,
      max_quantity INTEGER,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (creator_address) REFERENCES store_profiles(address) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      network TEXT NOT NULL CHECK(network IN ('base', 'solana')),
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_creator ON products(creator_address)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_address)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_purchases_tx_hash ON purchases(tx_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_social_links_address ON social_links(address)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_store_profiles_username ON store_profiles(username)`);

  saveDatabase();
  isInitialized = true;
  console.log('Database initialized successfully');
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Helper functions
function getOne(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: unknown[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql: string, params: unknown[] = []) {
  db.run(sql, params);
  saveDatabase();
}

// ============ Product Functions ============

export async function getProductById(id: string, includeInactive = false) {
  if (includeInactive) {
    return getOne('SELECT * FROM products WHERE id = ?', [id]);
  }
  return getOne('SELECT * FROM products WHERE id = ? AND is_active = 1', [id]);
}

export async function getProductByIdInternal(id: string) {
  // Internal use only - bypasses is_active check for payment verification
  return getOne('SELECT * FROM products WHERE id = ?', [id]);
}

export async function getProductsByCreator(address: string, includeInactive = false) {
  if (includeInactive) {
    return getAll('SELECT * FROM products WHERE creator_address = ? ORDER BY created_at DESC', [address]);
  }
  return getAll('SELECT * FROM products WHERE creator_address = ? AND is_active = 1 ORDER BY created_at DESC', [address]);
}

export async function createProduct(data: Record<string, unknown>) {
  // Ensure all values are defined (sql.js doesn't handle undefined)
  const values = [
    data.id,
    data.name,
    data.description || '',
    data.price ?? 0,
    data.targetUrl,
    data.encryptedUrl || '',
    data.creatorAddress,
    0, // sold_count
    data.maxQuantity ?? null,
    1, // is_active
  ];
  console.log('Inserting product with values:', values);
  run(
    `INSERT INTO products (id, name, description, price, target_url, encrypted_url, creator_address, sold_count, max_quantity, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  // Map camelCase keys to snake_case column names
  const columnMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    price: 'price',
    is_active: 'is_active',
    isActive: 'is_active',
  };
  
  const entries = Object.entries(data).filter(([k]) => columnMap[k]);
  if (entries.length === 0) return;
  
  const sets = entries.map(([k]) => `${columnMap[k]} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  
  console.log('updateProduct SQL:', `UPDATE products SET ${sets} WHERE id = ?`, [...values, id]);
  run(`UPDATE products SET ${sets} WHERE id = ?`, [...values, id]);
}

export async function updateProductSales(id: string) {
  const product = await getProductByIdInternal(id);
  if (product) {
    run('UPDATE products SET sold_count = ? WHERE id = ?', [(product.sold_count || 0) + 1, id]);
  }
}

export async function deleteProduct(id: string) {
  run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
}

// ============ Store Profile Functions ============

export async function getProfile(address: string) {
  console.log('getProfile called with address:', address);
  const result = getOne('SELECT * FROM store_profiles WHERE address = ?', [address]);
  console.log('getProfile result:', result);
  return result;
}

export async function upsertProfile(address: string, displayName: string, username?: string) {
  const existing = await getProfile(address);
  // Extract username from displayName if not provided
  const normalizedUsername = username || displayName.toLowerCase().replace(/^@/, '').replace(/\s/g, '');
  
  if (existing) {
    run('UPDATE store_profiles SET display_name = ?, username = ? WHERE address = ?', [displayName, normalizedUsername, address]);
  } else {
    const now = Date.now();
    run(
      'INSERT INTO store_profiles (address, username, display_name, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [address, normalizedUsername, displayName, 'midnight', now, now]
    );
  }
}

export async function updateProfile(address: string, data: Record<string, unknown>) {
  // Filter out undefined values and socials (handled separately)
  const filteredData = Object.entries(data).filter(([key, value]) => 
    value !== undefined && key !== 'socials'
  );
  
  if (filteredData.length === 0) return;
  
  const sets = filteredData.map(([k]) => {
    // Convert camelCase to snake_case
    const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return `${snakeKey} = ?`;
  }).join(', ');
  const values = filteredData.map(([, value]) => value);
  run(`UPDATE store_profiles SET ${sets}, updated_at = ? WHERE address = ?`, [...values, Date.now(), address]);
}

export async function incrementViews(address: string) {
  run('UPDATE store_profiles SET views = views + 1 WHERE address = ?', [address]);
}

export async function findAddressByUsername(username: string) {
  const normalized = username.toLowerCase().replace(/^@/, '').replace(/\s/g, '');
  console.log('findAddressByUsername called with:', username, 'normalized:', normalized);
  const result = getOne(
    'SELECT address FROM store_profiles WHERE LOWER(username) = LOWER(?)',
    [normalized]
  );
  console.log('findAddressByUsername result:', result);
  return result?.address || null;
}

export async function isUsernameTaken(username: string, excludeAddress?: string) {
  const normalized = username.toLowerCase().replace(/^@/, '').replace(/\s/g, '');
  
  console.log('isUsernameTaken called with:', username, 'normalized:', normalized, 'excludeAddress:', excludeAddress);
  
  if (excludeAddress) {
    const result = getOne(
      'SELECT address FROM store_profiles WHERE LOWER(username) = LOWER(?) AND address != ?',
      [normalized, excludeAddress]
    );
    console.log('isUsernameTaken with exclude result:', result);
    return result;
  }
  
  const result = getOne(
    'SELECT address FROM store_profiles WHERE LOWER(username) = LOWER(?)',
    [normalized]
  );
  console.log('isUsernameTaken result:', result);
  return result;
}

// ============ Social Links Functions ============

export async function getSocialLinks(address: string) {
  return getAll('SELECT platform, url FROM social_links WHERE address = ?', [address]);
}

export async function setSocialLinks(address: string, links: Array<{ platform: string; url: string }>) {
  run('DELETE FROM social_links WHERE address = ?', [address]);
  for (const link of links) {
    run('INSERT INTO social_links (address, platform, url) VALUES (?, ?, ?)', [address, link.platform, link.url]);
  }
}

// ============ Purchase Functions ============

export async function addPurchase(data: Record<string, unknown>) {
  run(
    'INSERT INTO purchases (id, product_id, buyer_address, tx_hash, network, amount) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.productId, data.buyerAddress, data.txHash, data.network, data.amount]
  );
}

export async function getPurchaseByTxHash(txHash: string) {
  return getOne('SELECT * FROM purchases WHERE tx_hash = ? LIMIT 1', [txHash]);
}

export async function updateProfileEarnings(address: string, amount: number) {
  run('UPDATE store_profiles SET total_earned = total_earned + ? WHERE address = ?', [amount, address]);
}

export async function getPurchasesByProduct(productId: string) {
  return getAll('SELECT * FROM purchases WHERE product_id = ? ORDER BY created_at DESC', [productId]);
}

export async function getPurchasesByBuyer(buyerAddress: string) {
  return getAll(
    'SELECT p.*, pr.name as product_name FROM purchases p JOIN products pr ON p.product_id = pr.id WHERE p.buyer_address = ? ORDER BY p.created_at DESC',
    [buyerAddress]
  );
}

// ============ User Functions ============

export async function getUser(address: string) {
  return getOne('SELECT * FROM users WHERE address = ?', [address]);
}

export async function upsertUser(address: string, walletType: 'evm' | 'solana') {
  const existing = await getUser(address);
  if (!existing) {
    run('INSERT INTO users (id, address, wallet_type, created_at) VALUES (?, ?, ?, ?)', [address, address, walletType, Date.now()]);
  }
}

// Initialize on import
initDatabase().catch(console.error);

// Export for migrations
export { initDatabase };
