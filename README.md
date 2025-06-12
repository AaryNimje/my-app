This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


academic-ai-platform/
├── README.md                                    # Quick setup guide and project overview
├── .env.example                                 # Environment variables template with all required keys
├── docker-compose.yml                           # Simple 3-service setup: frontend, backend, database
├── package.json                                 # Root workspace management
│
├── frontend/                                    # Next.js Frontend (Keep existing structure)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx               # Login with institution selection
│   │   │   │   └── register/page.tsx            # Institution and user registration
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx                     # Main dashboard with metrics
│   │   │   │   ├── ai-playground/page.tsx       # Workflow builder (existing)
│   │   │   │   ├── llm-playground/page.tsx      # Multi-chat interface (existing)
│   │   │   │   ├── agents/page.tsx              # AI agents management
│   │   │   │   ├── data/page.tsx                # Institution data browser (role-based)
│   │   │   │   ├── logs/page.tsx                # System logs (existing)
│   │   │   │   └── layout.tsx                   # Dashboard layout with role-based navigation
│   │   │   └── layout.tsx                       # Root layout with auth
│   │   ├── components/                          # Keep existing UI components
│   │   ├── lib/                                 # Keep existing API clients and hooks
│   │   └── types/                               # Keep existing TypeScript interfaces
│   └── package.json                             # Frontend dependencies
│
├── backend/                                     # Node.js Backend API
│   ├── src/
│   │   ├── models/
│   │   │   ├── Institution.js                   # Institution schema with settings and limits
│   │   │   ├── User.js                          # User schema with institution_id and role
│   │   │   ├── Workflow.js                      # Workflow schema (existing)
│   │   │   ├── Chat.js                          # Chat schema (existing)
│   │   │   ├── Agent.js                         # AI agent configuration and status
│   │   │   ├── AcademicData.js                  # Academic data schema (courses, students, etc.)
│   │   │   └── Log.js                           # System logs (existing)
│   │   ├── routes/
│   │   │   ├── auth.js                          # Authentication with institution context
│   │   │   ├── institutions.js                  # Institution management (admin only)
│   │   │   ├── workflows.js                     # Workflow CRUD (existing, enhanced)
│   │   │   ├── chats.js                         # Chat management (existing, enhanced)
│   │   │   ├── agents.js                        # AI agent management and execution
│   │   │   ├── academic-data.js                 # Role-based academic data access
│   │   │   ├── llm.js                           # LLM providers (existing, add OLLAMA)
│   │   │   └── logs.js                          # System logging (existing)
│   │   ├── services/
│   │   │   ├── WorkflowEngine.js                # Workflow execution (existing)
│   │   │   ├── LLMService.js                    # Multi-provider LLM (add OLLAMA)
│   │   │   ├── AgentManager.js                  # Python agent coordination
│   │   │   ├── MCPService.js                    # Single MCP server management
│   │   │   ├── InstitutionService.js            # Institution and role management
│   │   │   ├── AcademicDataService.js           # Role-based data access
│   │   │   └── NeonDBService.js                 # Neon database operations
│   │   ├── middleware/
│   │   │   ├── auth.js                          # JWT authentication
│   │   │   ├── roleCheck.js                     # Role-based access control
│   │   │   └── institutionContext.js            # Institution context middleware
│   │   ├── utils/
│   │   │   ├── permissions.js                   # Role permission utilities
│   │   │   └── dataFilters.js                   # Role-based data filtering
│   │   └── server.js                            # Main server (existing, enhanced)
│   └── package.json                             # Backend dependencies
│
├── ai-agents/                                   # Python AI Agents (Essential only)
│   ├── requirements.txt                         # Python dependencies
│   ├── core/
│   │   ├── base_agent.py                        # Base agent class
│   │   ├── mcp_client.py                        # MCP client for tools
│   │   ├── llm_interface.py                     # LLM abstraction (OLLAMA + APIs)
│   │   └── data_access.py                       # Role-based data access
│   ├── agents/
│   │   ├── grading_agent.py                     # Automated grading agent
│   │   ├── research_agent.py                    # Research assistance agent
│   │   ├── quiz_generator_agent.py              # Quiz creation agent
│   │   └── data_analysis_agent.py               # Academic data analysis agent
│   ├── utils/
│   │   ├── security.py                          # Basic security utilities
│   │   └── role_checker.py                      # Role-based access validation
│   └── start_agents.py                          # Agent startup script
│
├── mcp-server/                                  # Single Academic MCP Server
│   ├── server.py                                # Main MCP server
│   ├── tools/
│   │   ├── document_tools.py                    # PDF/Word processing tools
│   │   ├── academic_tools.py                    # Citation and academic formatting tools
│   │   ├── data_tools.py                        # Spreadsheet and data analysis tools
│   │   ├── institution_tools.py                 # Role-based institutional data tools
│   │   └── google_workspace_tools.py            # Basic Google Workspace integration
│   ├── config.json                              # MCP server configuration
│   └── requirements.txt                         # MCP server dependencies
│
├── database/                                    # Neon DB Setup
│   ├── schema.sql                               # Complete database schema
│   ├── seed.sql                                 # Initial data and demo content
│   ├── migrations/
│   │   ├── 001_institutions.sql                 # Institution tables
│   │   ├── 002_users_roles.sql                  # Users with roles and permissions
│   │   ├── 003_academic_data.sql                # Academic data structure
│   │   └── 004_workflows_agents.sql             # Workflows and agents tables
│   └── setup.sql                                # Complete database setup script
│
├── config/                                      # Configuration Files
│   ├── database.js                              # Neon DB configuration
│   ├── llm-providers.json                       # LLM provider settings (including OLLAMA)
│   ├── roles-permissions.json                   # Role-based access definitions
│   └── institution-defaults.json                # Default institution settings
│
├── scripts/                                     # Setup Scripts
│   ├── setup-neon-db.sh                         # Neon database initialization
│   ├── install-ollama.sh                        # OLLAMA installation
│   ├── start-dev.sh                             # Development environment startup
│   └── deploy.sh                                # Simple deployment script
│
└── docs/                                        # Essential Documentation
    ├── SETUP.md                                 # Quick setup guide
    ├── API.md                                   # API documentation
    ├── ROLES.md                                 # Role-based access guide
    └── DEPLOYMENT.md                            # Deployment instructions
