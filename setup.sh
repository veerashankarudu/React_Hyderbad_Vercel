#!/bin/bash
# ============================================================
# QuizHub AI — Automated Setup Script
# Run this once after extracting the zip:  bash setup.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     QuizHub AI — Automated Setup Script      ║${NC}"
echo -e "${BLUE}║     Valkey Hack-N-Stack 2026               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---------- Check Prerequisites ----------
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

check_tool() {
  if command -v $1 &>/dev/null; then
    echo -e "  ${GREEN}✅ $1 found: $(command $1 --version 2>&1 | head -1)${NC}"
  else
    echo -e "  ${RED}❌ $1 not found — please install it first${NC}"
    exit 1
  fi
}

check_tool java
check_tool mvn
check_tool node
check_tool npm
check_tool mysql

echo ""

# ---------- Create MySQL Database ----------
echo -e "${YELLOW}[2/5] Creating MySQL database 'quizhub'...${NC}"
if mysql -u root -e "CREATE DATABASE IF NOT EXISTS quizhub;" 2>/dev/null; then
  echo -e "  ${GREEN}✅ Database 'quizhub' ready${NC}"
else
  echo -e "  ${RED}❌ Could not create database.${NC}"
  echo -e "  ${YELLOW}   → If MySQL needs a password, run manually:${NC}"
  echo -e "  ${YELLOW}     mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS quizhub;\"${NC}"
  echo -e "  ${YELLOW}   → Then update username/password in backend/src/main/resources/application.yml${NC}"
fi

echo ""

# ---------- Backend Setup ----------
echo -e "${YELLOW}[3/5] Installing backend dependencies (Maven)...${NC}"
cd backend
mvn clean install -DskipTests -q
echo -e "  ${GREEN}✅ Backend dependencies installed${NC}"
cd ..

echo ""

# ---------- Frontend Setup ----------
echo -e "${YELLOW}[4/5] Installing frontend dependencies (npm)...${NC}"
cd frontend
npm install --silent
echo -e "  ${GREEN}✅ Frontend dependencies installed${NC}"
cd ..

echo ""

# ---------- Done ----------
echo -e "${YELLOW}[5/5] Setup complete!${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Setup Complete! Next steps:                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Terminal 1 — Start Backend:                        ║${NC}"
echo -e "${GREEN}║    cd backend && mvn spring-boot:run                 ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Terminal 2 — Start Frontend:                       ║${NC}"
echo -e "${GREEN}║    cd frontend && npm start                          ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  App URL:   http://localhost:3000                    ║${NC}"
echo -e "${GREEN}║  API Docs:  http://localhost:8080/swagger-ui/        ║${NC}"
echo -e "${GREEN}║  Health:    http://localhost:8080/actuator/health    ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Login Credentials:                                  ║${NC}"
echo -e "${GREEN}║    Admin:  divya.madhanasekar / Admin@123            ║${NC}"
echo -e "${GREEN}║    SME:    arjun.krishna      / Sme@123              ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Run Tests:                                          ║${NC}"
echo -e "${GREEN}║    Backend:  cd backend && mvn test                  ║${NC}"
echo -e "${GREEN}║    Frontend: cd frontend && npm test -- --watchAll=false ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
