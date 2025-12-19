#!/bin/bash

# DealScope Startup Script
# Usage: ./start.sh [backend|frontend|all]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   ██████╗ ███████╗ █████╗ ██╗     ███████╗ ██████╗ ██████╗   ║"
echo "║   ██╔══██╗██╔════╝██╔══██╗██║     ██╔════╝██╔════╝██╔═══██╗  ║"
echo "║   ██║  ██║█████╗  ███████║██║     ███████╗██║     ██║   ██║  ║"
echo "║   ██║  ██║██╔══╝  ██╔══██║██║     ╚════██║██║     ██║   ██║  ║"
echo "║   ██████╔╝███████╗██║  ██║███████╗███████║╚██████╗╚██████╔╝  ║"
echo "║   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝   ║"
echo "║                                                               ║"
echo "║       Real Estate Investment Analytics Platform               ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

MODE=${1:-all}

start_backend() {
    echo -e "${YELLOW}Starting Backend (FastAPI)...${NC}"
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    echo "Installing dependencies..."
    pip install -r requirements.txt -q
    
    # Start server
    echo -e "${GREEN}Backend running at http://localhost:8000${NC}"
    echo -e "${GREEN}API Docs at http://localhost:8000/docs${NC}"
    uvicorn app.main:app --reload --port 8000
}

start_frontend() {
    echo -e "${YELLOW}Starting Frontend (Next.js)...${NC}"
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Start development server
    echo -e "${GREEN}Frontend running at http://localhost:3000${NC}"
    npm run dev
}

start_docker() {
    echo -e "${YELLOW}Starting with Docker Compose...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}Services started:${NC}"
    echo "  • Frontend:  http://localhost:3000"
    echo "  • Backend:   http://localhost:8000"
    echo "  • API Docs:  http://localhost:8000/docs"
    echo "  • Database:  postgresql://localhost:5432/dealscope"
    echo "  • Redis:     redis://localhost:6379"
    echo ""
    echo -e "${YELLOW}View logs: docker-compose logs -f${NC}"
    echo -e "${YELLOW}Stop all:  docker-compose down${NC}"
}

case $MODE in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    docker)
        start_docker
        ;;
    all)
        echo -e "${YELLOW}Starting both services...${NC}"
        echo "Run in separate terminals:"
        echo "  Terminal 1: ./start.sh backend"
        echo "  Terminal 2: ./start.sh frontend"
        echo ""
        echo "Or use Docker:"
        echo "  ./start.sh docker"
        ;;
    *)
        echo "Usage: ./start.sh [backend|frontend|docker|all]"
        exit 1
        ;;
esac
