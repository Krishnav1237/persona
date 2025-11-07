# 🚀 PersonaOS Quick Start Guide

Get PersonaOS up and running in 5 minutes!

---

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd personaos

# Install dependencies
npm install
```

---

## Step 2: Start Infrastructure

Start PostgreSQL, Redis, and Qdrant:

```bash
npm run docker:up
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Qdrant on `localhost:6333`

---

## Step 3: Configure Backend

```bash
cd apps/backend

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

Required environment variables:
```env
DATABASE_URL=postgresql://personaos:personaos_dev_password@localhost:5432/personaos
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-your-openai-key-here  # ⚠️ REQUIRED
JWT_SECRET=your-secret-key-change-in-production
```

---

## Step 4: Run Database Migrations

```bash
# From apps/backend directory
npm run db:migrate
```

---

## Step 5: Configure Frontend

```bash
cd ../frontend

# Copy environment template
cp .env.local.example .env.local
```

The frontend will automatically connect to `http://localhost:3001/api/v1`

---

## Step 6: Start the Application

Open **two terminal windows**:

### Terminal 1: Backend
```bash
cd apps/backend
npm run dev
```

Backend will start on: `http://localhost:3001`
API Docs available at: `http://localhost:3001/api/docs`

### Terminal 2: Frontend
```bash
cd apps/frontend
npm run dev
```

Frontend will start on: `http://localhost:3000`

---

## Step 7: Create Your First Persona

1. Open `http://localhost:3000` in your browser
2. Click "Get Started" and create an account
3. You'll be redirected to the dashboard
4. Click "Create Persona"
5. Fill in:
   - Name: "My Brand AI"
   - Description: "AI assistant for my brand"
   - Configure tone sliders (formality, humor, etc.)
6. Upload training documents (PDF, DOCX, TXT)
7. Start chatting!

---

## 🎉 You're Ready!

Your PersonaOS instance is now running with:
- ✅ Backend API at `http://localhost:3001`
- ✅ Frontend at `http://localhost:3000`
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Qdrant vector database
- ✅ OpenAI integration

---

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Create a Persona
```bash
curl -X POST http://localhost:3001/api/v1/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "TechBrand AI",
    "description": "AI assistant for TechBrand",
    "toneConfig": {
      "formality": 7,
      "humor": 5,
      "technical": 8,
      "empathy": 6,
      "energy": 7
    }
  }'
```

### Chat with Your Persona
```bash
curl -X POST http://localhost:3001/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "your-persona-id",
    "message": "Hello! What can you help me with?"
  }'
```

---

## Stopping the Application

```bash
# Stop frontend and backend (Ctrl+C in terminals)

# Stop infrastructure
npm run docker:down
```

---

## Troubleshooting

### Backend won't start
- Check if port 3001 is available
- Verify PostgreSQL is running: `docker ps`
- Check `.env` file has valid `OPENAI_API_KEY`

### Frontend won't start
- Check if port 3000 is available
- Verify backend is running
- Clear Next.js cache: `rm -rf .next`

### Database connection error
- Restart Docker containers: `npm run docker:down && npm run docker:up`
- Wait 10 seconds for PostgreSQL to be ready
- Run migrations again: `npm run db:migrate`

### "Invalid API Key" error
- Get a valid OpenAI API key from https://platform.openai.com/api-keys
- Ensure it starts with `sk-`
- Update `OPENAI_API_KEY` in `apps/backend/.env`
- Restart the backend

---

## Next Steps

- 📖 Read the [Full Documentation](README.md)
- 🏗️ Review the [Product Blueprint](PRODUCT_BLUEPRINT_ENHANCED.md)
- 📊 Check the [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- 🔧 Explore the [API Documentation](http://localhost:3001/api/docs)

---

## Need Help?

- Check [README.md](README.md) for detailed information
- Review [GitHub Issues](https://github.com/yourusername/personaos/issues)
- Join our community (Discord link)

---

**Happy Building! 🚀**

PersonaOS Team
