# KODO Platform - Setup Instructions

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ (local installation or Docker)
- **Docker Desktop** (optional, for containerized setup)
- **Git**

---

## Option 1: Quick Start with Docker (Recommended)

### 1. Start Database Services

```powershell
# Start PostgreSQL, Redis, and Adminer
docker compose up -d postgres redis adminer

# Check if services are running
docker compose ps
```

### 2. Setup Database

```powershell
# Navigate to server directory
cd server

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

### 3. Start Development Server

```powershell
# Start server with nodemon (auto-reload)
npm run dev

# Or use the quick start script from project root
cd ..
.\start.ps1
```

---

## Option 2: Manual PostgreSQL Setup

### 1. Install PostgreSQL

Download and install PostgreSQL from: https://www.postgresql.org/download/

### 2. Create Database

```sql
-- Connect to PostgreSQL (psql or pgAdmin)
CREATE DATABASE kododb;
CREATE USER kodo_user WITH PASSWORD 'kodo_password';
GRANT ALL PRIVILEGES ON DATABASE kododb TO kodo_user;
```

### 3. Configure Environment

```powershell
cd server

# Copy environment template
copy .env.example .env

# Edit .env and update DATABASE_URL:
# DATABASE_URL=postgresql://kodo_user:kodo_password@localhost:5432/kododb
```

### 4. Install Dependencies

```powershell
# Install server dependencies
npm install
```

### 5. Setup Database

```powershell
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
node prisma/seed/seed.js
```

### 6. Start Server

```powershell
npm run dev
```

---

## Available Services

Once running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| API Server | http://localhost:4000 | Main backend API |
| Adminer (Docker only) | http://localhost:8080 | Database management UI |
| Prisma Studio | Run `npm run db:studio` | Interactive database browser |

---

## Test Credentials

All test accounts use password: **Password123!**

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@example.com | Full platform access |
| Seller | seller1@example.com | Can create/manage products |
| Buyer | buyer1@example.com | Can post requests and bids |
| Courier | courier1@example.com | Can manage deliveries |

---

## Testing the API

### 1. Register a New User

```powershell
curl -X POST http://localhost:4000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "role": "buyer"
  }'
```

### 2. Login

```powershell
curl -X POST http://localhost:4000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "emailOrUsername": "seller1@example.com",
    "password": "Password123!"
  }'
```

Copy the `token` from the response for authenticated requests.

### 3. Get All Products

```powershell
curl http://localhost:4000/api/products
```

### 4. Create a Product (Seller only)

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

curl -X POST http://localhost:4000/api/products `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{
    "title": "New Product",
    "description": "Product description",
    "price": 99.99
  }'
```

### 5. Get User Profile

```powershell
curl http://localhost:4000/api/auth/profile `
  -H "Authorization: Bearer $token"
```

---

## Database Management

### View Database with Prisma Studio

```powershell
cd server
npm run db:studio
```

This opens an interactive UI at http://localhost:5555

### Reset Database

```powershell
# Warning: This deletes all data
npm run db:reset
```

### Create New Migration

```powershell
npx prisma migrate dev --name your_migration_name
```

---

## Troubleshooting

### Port Already in Use

If port 4000 is busy:
```powershell
# Change PORT in server/.env
PORT=5000
```

### Database Connection Failed

1. Check PostgreSQL is running:
   ```powershell
   # For Docker
   docker compose ps
   
   # For local PostgreSQL
   Get-Service postgresql*
   ```

2. Verify DATABASE_URL in `.env`

3. Check network connectivity:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 5432
   ```

### Prisma Client Not Generated

```powershell
cd server
npx prisma generate
```

### Migration Errors

```powershell
# Reset database and migrations
npm run db:reset

# Or apply migrations manually
npx prisma migrate deploy
```

---

## Project Structure

```
KODO/
├── server/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── lib/             # Utilities (prisma, logger)
│   │   └── utils/           # Helper functions
│   ├── middleware/          # Express middleware
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed/            # Seed scripts
│   ├── app.js               # Express app
│   ├── server.js            # Server entry point
│   └── package.json
├── client/                  # Vue.js frontend (TBD)
├── docker-compose.yml       # Docker services
└── README.md
```

---

## Next Steps

1. ✅ Complete Products API
2. 🔄 Build Bids & Requests API
3. 🔄 Implement Socket.IO for real-time features
4. 🔄 Create Orders & Escrow system
5. 🔄 Build Vue.js frontend
6. 🔄 Add comprehensive tests
7. 🔄 Deploy to production

---

## Support

For issues or questions:
1. Check the RUNBOOK.md (coming soon)
2. Review logs: Server logs are in console output
3. Check database: Use Prisma Studio or Adminer

---

## Development Commands

```powershell
# Server
npm run dev          # Start with auto-reload
npm start            # Production mode
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm test             # Run tests (TBD)

# Docker
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f server     # View server logs
docker compose restart server     # Restart server
```
