# Jynk Backend

Bun.js 后端服务，使用纯 JS 数据库 (sql.js)，无需原生编译。

## 快速开始

```bash
cd backend

# 安装依赖
bun install

# 启动服务器 (会自动创建数据库)
bun run dev
```

## 启动成功输出

```
🦊 Jynk Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server: http://localhost:3000
📊 Health:  http://localhost:3000/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database initialized
```

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/x402/verify/:productId` | x402 支付验证 |
| POST | `/api/pay/direct` | 直接转账 |
| GET | `/api/products/:id` | 获取产品 |
| POST | `/api/products` | 创建产品 |
| PUT | `/api/products/:id` | 更新产品 |
| DELETE | `/api/products/:id` | 删除产品 |
| GET | `/api/stores/:address` | 获取商店 |
| PUT | `/api/stores/:address` | 更新商店 |
| GET | `/api/username/:username/check` | 检查用户名 |
| POST | `/api/username/claim` | 认领用户名 |

## 技术栈

- **运行时**: Bun.js
- **框架**: Elysia
- **数据库**: sql.js (SQLite in JS, 纯 JS 实现)
- **支付协议**: x402

## PostgreSQL 迁移 (可选)

未来需要生产环境时，可切换到 PostgreSQL：

```bash
# 1. 安装 PostgreSQL 驱动
bun add drizzle-orm postgres
bun remove sql.js

# 2. 修改 src/db/index.ts 使用 postgres
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);

# 3. 更新环境变量
DATABASE_URL=postgresql://user:pass@localhost:5432/jynk
```

切换成本约 10-20 行代码修改。
