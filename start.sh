#!/bin/bash

# DealGapIQ Startup Script
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

    # Pin 3.11 to match CI and pyproject's requires-python. Naming the version
    # explicitly matters: a bare `python3` is 3.9 on stock macOS, which builds a
    # venv the app cannot run.
    if [ ! -d ".venv" ]; then
        echo "Creating virtual environment (Python 3.11)..."
        # --seed installs pip, so the `pip install` below always resolves inside
        # the venv rather than falling through to the system Python.
        if command -v uv >/dev/null 2>&1; then
            uv venv --python 3.11 --seed .venv
        elif command -v python3.11 >/dev/null 2>&1; then
            python3.11 -m venv .venv
        else
            echo -e "${RED}No Python 3.11 found.${NC}"
            echo "Install one of:"
            echo "  brew install uv            # manages its own interpreters"
            echo "  brew install python@3.11"
            exit 1
        fi
    fi

    # Activate virtual environment
    source .venv/bin/activate

    # Install dependencies
    echo "Installing dependencies..."
    if command -v uv >/dev/null 2>&1; then
        uv pip install -r requirements.txt -q
    else
        pip install -r requirements.txt -q
    fi
    
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
    echo "  • Database:  postgresql://localhost:5432/dealgapiq"
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
