# 🚀 PersonaOS

**The AI platform that builds, deploys, and evolves intelligent brand personas across channels**

PersonaOS is an AI-powered Brand Intelligence Platform that creates, deploys, and continuously evolves intelligent brand personas. It transforms fragmented marketing tools into a unified, self-learning system that speaks with your brand's voice, engages authentically, and optimizes based on real-world performance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Features

### Core Capabilities

- **🧠 AI Persona Creation**
  - Upload brand documents (PDF, DOCX, TXT) to train your AI
  - 5-dimensional tone configuration (formality, humor, technical depth, empathy, energy)
  - Custom guardrails and brand value enforcement
  - Dynamic system prompt generation

- **💬 Intelligent Conversations (RAG)**
  - Retrieval-Augmented Generation for accurate, context-aware responses
  - Vector database integration with Qdrant
  - Conversation history management with Redis caching
  - Multi-turn dialogue support

- **📡 Multi-Channel Deployment** (Coming Soon)
  - Web chat widget
  - Telegram bot
  - WhatsApp integration
  - Discord bot
  - Instagram DMs
  - Email automation

- **📊 Analytics & Learning**
  - Real-time event tracking
  - Conversation analytics
  - Time-series data visualization
  - Performance metrics per channel

- **🔐 Authentication & Security**
  - JWT-based authentication
  - Role-based access control
  - Secure password hashing with bcrypt
  - API key management

---

## 🏗️ Architecture

PersonaOS follows a modular, microservices-inspired architecture:

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│  Dashboard, Persona Builder, Analytics  │
└─────────────────┬───────────────────────┘
                  │ REST API
┌─────────────────┴───────────────────────┐
│         Backend (NestJS)                │
│  ┌──────────────────────────────────┐   │
│  │  AI Core                         │   │
│  │  • LLM Integration (OpenAI, etc.)│   │
│  │  • Embedding Generation          │   │
│  │  • Document Processing           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Persona Engine                  │   │
│  │  • Context Management            │   │
│  │  • Tone Control                  │   │
│  │  • Memory Management             │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Chat & RAG                      │   │
│  │  • Conversation Management       │   │
│  │  • Vector Search                 │   │
│  │  • Response Generation           │   │
│  └──────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼────┐   ┌───▼────┐
│Postgres│    │ Redis  │   │ Qdrant │
│  (DB)  │    │(Cache) │   │(Vector)│
└────────┘    └────────┘   └────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Docker** & **Docker Compose** (for local development)
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/personaos.git
cd personaos
```

2. **Install dependencies**

```bash
npm install
```

3. **Start infrastructure services (PostgreSQL, Redis, Qdrant)**

```bash
npm run docker:up
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Qdrant on `localhost:6333`

4. **Set up environment variables**

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-key-here

# Optional: Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-here
```

5. **Run database migrations**

```bash
npm run db:migrate
```

6. **Start the development server**

```bash
npm run dev
```

This will start:
- Backend API: `http://localhost:3001`
- API Documentation: `http://localhost:3001/api/docs`

---

## ⚙️ Configuration

### Environment Variables

#### Backend (`apps/backend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://personaos:...` | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `QDRANT_URL` | Qdrant API URL | `http://localhost:6333` | Yes |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | No |
| `JWT_SECRET` | Secret for JWT signing | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` | No |
| `PORT` | API server port | `3001` | No |

---

## 💻 Usage

### 1. Register a User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "FREE"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Create a Persona

```bash
curl -X POST http://localhost:3001/api/v1/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "TechBrand AI",
    "description": "AI assistant for TechBrand company",
    "toneConfig": {
      "formality": 7,
      "humor": 5,
      "technical": 8,
      "empathy": 6,
      "energy": 7
    },
    "guardrails": {
      "topicsToAvoid": ["politics", "religion"],
      "brandValues": ["innovation", "customer-first", "transparency"]
    }
  }'
```

### 3. Upload Training Documents

```bash
curl -X POST http://localhost:3001/api/v1/personas/{personaId}/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

### 4. Chat with Your Persona

```bash
curl -X POST http://localhost:3001/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "your-persona-id",
    "message": "What are your company values?"
  }'
```

Response:
```json
{
  "conversationId": "conversation-uuid",
  "messageId": "message-uuid",
  "response": "Our company is built on three core values...",
  "metadata": {
    "model": "gpt-4-turbo-preview",
    "tokensUsed": 245,
    "contextChunks": 3,
    "processingTime": 1234
  }
}
```

---

## 📚 API Documentation

Once the server is running, visit the interactive API documentation:

**Swagger UI:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### API Endpoints Overview

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

#### Personas
- `POST /api/v1/personas` - Create persona
- `GET /api/v1/personas` - List all personas
- `GET /api/v1/personas/:id` - Get persona details
- `PATCH /api/v1/personas/:id` - Update persona
- `DELETE /api/v1/personas/:id` - Delete persona
- `GET /api/v1/personas/:id/stats` - Get persona statistics

#### Documents
- `POST /api/v1/personas/:id/documents/upload` - Upload file
- `POST /api/v1/personas/:id/documents/text` - Upload text
- `GET /api/v1/personas/:id/documents` - List documents
- `DELETE /api/v1/personas/:id/documents/:documentId` - Delete document

#### Chat
- `POST /api/v1/chat` - Send message and get response
- `GET /api/v1/chat/conversations/:personaId` - List conversations
- `GET /api/v1/chat/conversation/:id` - Get conversation history
- `POST /api/v1/chat/conversation/:id/end` - End conversation
- `POST /api/v1/chat/message/:id/feedback` - Provide feedback

#### Analytics
- `POST /api/v1/analytics/track` - Track custom event
- `GET /api/v1/analytics/persona/:id` - Get analytics summary
- `GET /api/v1/analytics/persona/:id/timeseries` - Get time-series data

---

## 🛠️ Tech Stack

### Backend
- **Framework:** NestJS (Node.js + TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis with ioredis
- **Vector DB:** Qdrant
- **AI/ML:**
  - OpenAI API (GPT-4, GPT-3.5-Turbo, text-embedding-3-small)
  - Anthropic API (Claude)
  - LangChain (orchestration)
- **Authentication:** JWT with Passport
- **Documentation:** Swagger/OpenAPI

### Frontend (Coming Soon)
- **Framework:** Next.js 14 (React, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query + Zustand
- **Charts:** Recharts

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions

---

## 📁 Project Structure

```
personaos/
├── apps/
│   ├── backend/              # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── ai/       # LLM integration
│   │   │   │   ├── auth/     # Authentication
│   │   │   │   ├── persona/  # Persona management
│   │   │   │   ├── chat/     # Conversation & RAG
│   │   │   │   ├── deployment/ # Channel deployment
│   │   │   │   ├── analytics/  # Analytics tracking
│   │   │   │   ├── database/   # Prisma service
│   │   │   │   ├── cache/      # Redis service
│   │   │   │   └── vector/     # Qdrant service
│   │   │   ├── app.module.ts
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   └── package.json
│   └── frontend/              # Next.js app (coming soon)
├── packages/
│   ├── shared/                # Shared types/utils
│   └── ui/                    # Shared UI components
├── docker-compose.yml         # Local dev infrastructure
├── turbo.json                 # Turborepo config
├── package.json               # Root package.json
├── PRODUCT_BLUEPRINT_ENHANCED.md  # Detailed product spec
└── README.md                  # This file
```

---

## 🧑‍💻 Development

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

### Database Operations

```bash
# Generate Prisma client
npm run db:generate

# Create a new migration
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Stop Infrastructure

```bash
npm run docker:down
```

### Clean Build

```bash
npm run clean
npm run build
```

---

## 🚢 Deployment

### Production Environment Variables

Ensure you set these in production:

```env
NODE_ENV=production
DATABASE_URL=your-production-db-url
REDIS_HOST=your-production-redis-host
QDRANT_URL=your-production-qdrant-url
JWT_SECRET=strong-random-secret
OPENAI_API_KEY=your-openai-key
```

### Database Migrations

```bash
npm run db:migrate:prod
```

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

---

## 🎯 Roadmap

### MVP (Month 0-3) ✅
- [x] Persona creation and management
- [x] Document upload and processing
- [x] RAG-based conversations
- [x] Basic analytics
- [x] Authentication system

### v1.0 (Month 3-6)
- [ ] Multi-channel deployment (Telegram, WhatsApp, Discord)
- [ ] Web chat widget
- [ ] Advanced analytics dashboard
- [ ] A/B testing for responses
- [ ] Team collaboration features

### v2.0 (Month 6-12)
- [ ] Persona marketplace
- [ ] Voice cloning integration
- [ ] Multi-agent orchestration
- [ ] API SDK for developers
- [ ] White-label options

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Documentation:** [Full Product Blueprint](PRODUCT_BLUEPRINT_ENHANCED.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/personaos/issues)
- **Email:** support@personaos.com
- **Discord:** [Join our community](https://discord.gg/personaos)

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- Qdrant team for the vector database
- NestJS and Next.js communities

---

**Built with ❤️ by the PersonaOS Team**

*Turning brands into intelligent, conversational AI*
