# Academic AI Platform

A comprehensive AI-powered platform for educational institutions featuring workflow automation, multi-LLM chat interfaces, and academic tools.

## 🚀 Features

- **Visual Workflow Builder** - Drag-and-drop interface for creating AI workflows
- **Multi-LLM Chat Interface** - Support for OpenAI, Google Gemini, and Anthropic Claude
- **AI Agents** - Create and manage autonomous AI agents for various academic tasks
- **Google Workspace Integration** - Connect with Gmail, Sheets, Drive, and Calendar
- **Role-Based Access Control** - Admin, teacher, and student roles with granular permissions
- **Academic Tools** - Q&A generation, grading assistance, and content creation
- **Real-time Collaboration** - WebSocket support for live updates

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (or a Neon database account)
- **Git**

Optional:
- **Docker** (for containerized deployment)

## 🛠️ Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/academic-ai-platform.git
cd academic-ai-platform
```

### Step 2: Environment Setup

#### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# LLM API Keys (At least one is required)
GOOGLE_API_KEY=your-google-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
```

### Step 3: Database Setup

#### Option A: Using Neon (Recommended)

1. Sign up for a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy your connection string from the Neon dashboard
4. Update `DATABASE_URL` in your backend `.env` file

#### Option B: Local PostgreSQL

```bash
# Create database
createdb academic_ai

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://username:password@localhost:5432/academic_ai
```

### Step 4: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 5: Initialize Database

```bash
# Navigate to backend directory
cd backend

# Run database setup script
node scripts/setup-neon-database.js

# Create test users
node scripts/create-test-user.js
```

### Step 6: Start the Application

#### Development Mode

Start both servers in separate terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Start production servers
cd ../backend
npm start

# In another terminal
cd frontend
npm start
```

## 👥 Default Login Credentials

After running the setup scripts, you can login with:

### Admin Account
- **Email:** `admin@example.com`
- **Password:** `password123`

### Test User Account
- **Email:** `test@example.com`
- **Password:** `test123`

## 🔧 Configuration Details

### LLM Providers

The platform supports multiple LLM providers. You need at least one API key configured:

- **Google Gemini** - Set `GOOGLE_API_KEY`
- **OpenAI** - Set `OPENAI_API_KEY`
- **Anthropic Claude** - Set `ANTHROPIC_API_KEY`

### Database Schema

The platform uses the following main tables:
- `users` - User accounts with roles
- `workflows` - Visual workflow definitions
- `ai_agents` - AI agent configurations
- `chat_sessions` - Chat conversation history
- `integrations` - External service connections
- `llm_models` - Available LLM models

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### AI Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `POST /api/agents/:id/execute` - Execute agent

### Chat
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/sessions` - Create chat session
- `POST /api/chat/sessions/:id/messages` - Send message

### LLM
- `GET /api/llm/models` - List available models
- `POST /api/llm/complete` - Direct completion
- `POST /api/llm/chat` - Chat completion

## 🚀 Deployment

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

#### Backend (Node.js)

1. Set production environment variables
2. Build and start:
```bash
cd backend
NODE_ENV=production npm start
```

#### Frontend (Next.js)

1. Build the application:
```bash
cd frontend
npm run build
```

2. Start the production server:
```bash
npm start
```

### Deployment Platforms

#### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL`
3. Deploy

#### Railway/Render (Backend)
1. Connect your GitHub repository
2. Set all environment variables from `.env`
3. Deploy with start command: `npm start`

#### Neon (Database)
Already configured if you followed the setup steps above.

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Check Setup
```bash
cd backend
node scripts/check-setup.js
```

## 📚 Project Structure

```
academic-ai-platform/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities and API client
│   └── package.json
│
├── backend/               # Node.js backend API
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── config/        # Configuration files
│   ├── scripts/           # Setup and utility scripts
│   └── package.json
│
└── database/              # Database schemas and migrations
    └── schema.sql
```

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting on API endpoints
- Input validation and sanitization
- SSL/TLS encryption for database connections

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Database Connection Issues
- Ensure your `DATABASE_URL` is correct
- Check if SSL is required (add `?sslmode=require`)
- Verify Neon service is active

### API Key Issues
- Ensure at least one LLM API key is configured
- Check API key validity and quotas
- Verify environment variables are loaded

### CORS Issues
- Update `FRONTEND_URL` in backend `.env`
- Ensure backend is running on expected port

### Port Conflicts
- Backend defaults to port 5000
- Frontend defaults to port 3000
- Change ports in respective configuration files if needed

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check existing issues for solutions
- Review the logs in `backend/logs/` directory

---

Happy coding! 🎉
