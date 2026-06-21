#!/usr/bin/env bash
# ============================================================
# QuizHub AI — ONE-COMMAND FULL STACK STARTER
#   bash start.sh           → starts everything
#   bash start.sh --stop    → stops everything
#   bash start.sh --status  → shows status
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

banner() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║          QuizHub AI — Full Stack Starter         ║${NC}"
  echo -e "${BLUE}║          Valkey Hack-N-Stack 2026             ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "  ${RED}❌ $1${NC}"; }
step() { echo -e "\n${CYAN}━━ $1${NC}"; }

# ─────────────────────────────────────────────────────────
# STOP
# ─────────────────────────────────────────────────────────
if [[ "${1:-}" == "--stop" ]]; then
  banner
  echo -e "${YELLOW}Stopping all QuizHub services...${NC}"

  # Kill backend
  if pgrep -f "spring-boot:run" > /dev/null 2>&1; then
    pkill -f "spring-boot:run" 2>/dev/null || true
    ok "Backend stopped"
  fi
  if pgrep -f "backend-1.0.0.jar" > /dev/null 2>&1; then
    pkill -f "backend-1.0.0.jar" 2>/dev/null || true
    ok "Backend JAR stopped"
  fi

  # Kill frontend
  if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    pkill -f "react-scripts start" 2>/dev/null || true
    ok "Frontend stopped"
  fi

  # Stop Docker stack
  if command -v docker-compose &>/dev/null; then
    docker-compose -f "$ROOT/docker-compose.observability.yml" down 2>/dev/null && ok "Prometheus + Grafana stopped"
  fi

  echo ""
  ok "All services stopped."
  exit 0
fi

# ─────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────
if [[ "${1:-}" == "--status" ]]; then
  banner
  echo -e "${BOLD}Service Health Check${NC}"
  echo ""

  check_http() {
    local name=$1 url=$2
    if curl -s --max-time 3 "$url" &>/dev/null; then
      ok "$name → $url"
    else
      err "$name → NOT running"
    fi
  }

  check_http "Backend   " "http://localhost:8080/actuator/health"
  check_http "Frontend  " "http://localhost:3000"
  check_http "Swagger   " "http://localhost:8080/swagger-ui/index.html"
  check_http "Prometheus" "http://localhost:9090/-/healthy"
  check_http "Grafana   " "http://localhost:3001/api/health"

  if redis-cli ping &>/dev/null 2>&1; then
    ok "Redis     → localhost:6379"
  else
    err "Redis     → NOT running"
  fi

  if mysql -u root -e "SELECT 1;" &>/dev/null 2>&1; then
    ok "MySQL     → localhost:3306"
  else
    warn "MySQL     → check credentials"
  fi

  echo ""
  exit 0
fi

# ─────────────────────────────────────────────────────────
# START
# ─────────────────────────────────────────────────────────
banner

# ── Step 1: Prerequisites ─────────────────────────────────
step "1/6  Checking prerequisites"
for tool in java mvn node npm; do
  if command -v "$tool" &>/dev/null; then
    ok "$tool → $(command "$tool" --version 2>&1 | head -1)"
  else
    err "$tool not found — install it first"; exit 1
  fi
done

# ── Step 2: MySQL Database ───────────────────────────────
step "2/6  MySQL — creating 'quizhub' database"
if mysql -u root -e "CREATE DATABASE IF NOT EXISTS quizhub;" 2>/dev/null; then
  ok "Database 'quizhub' ready"
elif mysql -u root -p'' -e "CREATE DATABASE IF NOT EXISTS quizhub;" 2>/dev/null; then
  ok "Database 'quizhub' ready (empty password)"
else
  warn "Could not auto-create DB. If MySQL needs a password, run:"
  warn "  mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS quizhub;\""
  warn "Continuing — backend will show a clear error if DB is unavailable"
fi

# ── Step 3: Prometheus + Grafana (Docker) ────────────────
step "3/6  Observability — Prometheus + Grafana"
if command -v docker-compose &>/dev/null; then
  if docker-compose -f "$ROOT/docker-compose.observability.yml" up -d 2>"$LOG_DIR/docker.log"; then
    ok "Prometheus started → http://localhost:9090"
    ok "Grafana started   → http://localhost:3001  (admin / quizhub)"
  else
    warn "Docker stack failed — see $LOG_DIR/docker.log"
    warn "Continuing without observability"
  fi
else
  warn "docker-compose not found — skipping Prometheus/Grafana"
  warn "Install Docker Desktop to enable observability dashboards"
fi

# ── Step 4: Build Backend (skip if JAR is fresh) ─────────
step "4/6  Backend — build + start"
JAR="$ROOT/backend/target/backend-1.0.0.jar"
POM="$ROOT/backend/pom.xml"

# Only rebuild if JAR is older than pom.xml or source files
NEEDS_BUILD=false
if [[ ! -f "$JAR" ]]; then
  NEEDS_BUILD=true
elif [[ "$POM" -nt "$JAR" ]]; then
  NEEDS_BUILD=true
elif find "$ROOT/backend/src" -name "*.java" -newer "$JAR" 2>/dev/null | grep -q .; then
  NEEDS_BUILD=true
fi

if $NEEDS_BUILD; then
  echo -e "  Building backend JAR (this takes ~30s on first run)..."
  if mvn -f "$ROOT/backend/pom.xml" package -DskipTests -q 2>"$LOG_DIR/backend-build.log"; then
    ok "Backend built successfully"
  else
    err "Backend build failed — see $LOG_DIR/backend-build.log"
    exit 1
  fi
else
  ok "Backend JAR is up to date — skipping build"
fi

# Kill any existing backend process
pkill -f "backend-1.0.0.jar" 2>/dev/null || true
sleep 1

# Start backend as background process
echo -e "  Starting backend..."
nohup java -jar "$JAR" \
  --spring.datasource.url="jdbc:mysql://localhost:3306/quizhub?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend.pid"

# Wait for backend to be healthy (up to 60s)
echo -n "  Waiting for backend"
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://localhost:8080/actuator/health &>/dev/null; then
    echo ""
    ok "Backend ready → http://localhost:8080  (PID $BACKEND_PID)"
    break
  fi
  echo -n "."
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo ""
    err "Backend didn't start in 60s — check $LOG_DIR/backend.log"
    exit 1
  fi
done

# ── Step 5: Frontend ─────────────────────────────────────
step "5/6  Frontend — install + start"

# Install deps only if needed
if [[ ! -d "$ROOT/frontend/node_modules" ]] || [[ "$ROOT/frontend/package.json" -nt "$ROOT/frontend/node_modules/.package-lock.json" ]]; then
  echo -e "  Installing npm packages..."
  npm --prefix "$ROOT/frontend" install --silent 2>"$LOG_DIR/npm-install.log"
  ok "npm packages installed"
else
  ok "node_modules up to date — skipping npm install"
fi

# Kill any existing frontend
pkill -f "react-scripts start" 2>/dev/null || true
sleep 1

# Start frontend
BROWSER=none nohup npm --prefix "$ROOT/frontend" start \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"

# Wait for frontend
echo -n "  Waiting for frontend"
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://localhost:3000 &>/dev/null; then
    echo ""
    ok "Frontend ready → http://localhost:3000  (PID $FRONTEND_PID)"
    break
  fi
  echo -n "."
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo ""
    warn "Frontend still starting — may need another ~15s"
    warn "Check $LOG_DIR/frontend.log if it doesn't load"
  fi
done

# ── Step 6: Summary ──────────────────────────────────────
step "6/6  All systems up"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ QuizHub AI is running! Open in your browser:          ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  App          → http://localhost:3000                     ║${NC}"
echo -e "${GREEN}║  API Docs     → http://localhost:8080/swagger-ui/index.html ║${NC}"
echo -e "${GREEN}║  Health       → http://localhost:8080/actuator/health     ║${NC}"
echo -e "${GREEN}║  Grafana      → http://localhost:3001  (admin / quizhub)  ║${NC}"
echo -e "${GREEN}║  Prometheus   → http://localhost:9090                     ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Login:  divya.madhanasekar / Admin@123  (Admin)          ║${NC}"
echo -e "${GREEN}║          birendra.kumar.singh / Sme@1234 (SME)            ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Logs:   .logs/backend.log   .logs/frontend.log          ║${NC}"
echo -e "${GREEN}║  Stop:   bash start.sh --stop                             ║${NC}"
echo -e "${GREEN}║  Status: bash start.sh --status                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
