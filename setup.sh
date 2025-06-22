#!/bin/bash

echo "🚀 Academic AI Platform Setup Script"
echo "===================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }

echo "✅ Prerequisites checked"

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..

# Setup environment files
echo "🔧 Setting up environment files..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file - Please update with your values"
fi

if [ ! -f frontend/.env.local ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
    echo "✅ Created frontend/.env.local"
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database setup
echo "🗄️ Setting up database..."
docker-compose exec postgres psql -U academicai -d academic_ai -f /docker-entrypoint-initdb.d/01-schema.sql

# Create test data
echo "🌱 Creating test data..."
cd backend && npm run db:seed
cd ..

# Generate test PDF
echo "📄 Generating test PDF..."
cd backend && npm run generate:pdf
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend: cd backend && npm run dev"
echo "2. Start the frontend: cd frontend && npm run dev"
echo "3. Login with: admin@example.com / admin123"
echo ""
echo "🔗 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000/api"
echo "- Database: postgresql://localhost:5432/academic_ai"
echo ""
echo "Happy coding! 🎉"