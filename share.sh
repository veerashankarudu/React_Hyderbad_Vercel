#!/usr/bin/env bash
# share.sh — expose the app to your team via Cloudflare Quick Tunnels (no account needed)
# Usage: ./share.sh
# Press Ctrl+C when done — it restores your original files automatically.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_JS="$ROOT/frontend/src/api.js"
APP_YML="$ROOT/backend/src/main/resources/application.yml"
BACKEND_JAR="$ROOT/backend/target/backend-1.0.0.jar"

ORIG_API=$(cat "$API_JS")
ORIG_CORS=$(grep "allowed-origins:" "$APP_YML" | head -1 | sed 's/.*allowed-origins: //')

cleanup() {
  echo ""
  echo "Restoring original files..."

  # Restore api.js
  cat > "$API_JS" <<JSEOF
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

export default API;
JSEOF

  # Restore CORS in application.yml
  sed -i '' "s|allowed-origins: .*|allowed-origins: http://localhost:3000|g" "$APP_YML"

  # Kill tunnel processes
  kill "$BACKEND_TUNNEL_PID" 2>/dev/null || true
  kill "$FRONTEND_TUNNEL_PID" 2>/dev/null || true

  # Kill any restarted backend
  lsof -ti:8080 | xargs kill -9 2>/dev/null || true

  echo "Done. Run the backend normally to resume local dev."
  exit 0
}
trap cleanup EXIT INT TERM

echo "======================================"
echo "  Smart Quiz AI Hub — Team Share Mode"
echo "======================================"
echo ""
echo "Step 1/4: Starting backend tunnel (port 8080)..."
cloudflared tunnel --url http://localhost:8080 --no-autoupdate > /tmp/cf-backend.log 2>&1 &
BACKEND_TUNNEL_PID=$!

echo "Step 2/4: Starting frontend tunnel (port 3000)..."
cloudflared tunnel --url http://localhost:3000 --no-autoupdate > /tmp/cf-frontend.log 2>&1 &
FRONTEND_TUNNEL_PID=$!

echo "Waiting for tunnels to establish (15s)..."
sleep 15

# Extract tunnel URLs from cloudflared log output
BACKEND_URL=$(grep -oE 'https://[a-z0-9\-]+\.trycloudflare\.com' /tmp/cf-backend.log | head -1)
FRONTEND_URL=$(grep -oE 'https://[a-z0-9\-]+\.trycloudflare\.com' /tmp/cf-frontend.log | head -1)

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
  echo ""
  echo "ERROR: Could not detect tunnel URLs. Check logs:"
  echo "  Backend: /tmp/cf-backend.log"
  echo "  Frontend: /tmp/cf-frontend.log"
  exit 1
fi

echo ""
echo "Step 3/4: Updating frontend API base URL to: $BACKEND_URL"
cat > "$API_JS" <<JSEOF
import axios from 'axios';

const API = axios.create({
  baseURL: '${BACKEND_URL}/api/v1',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

export default API;
JSEOF

echo "Step 4/4: Updating backend CORS to allow: $FRONTEND_URL"
sed -i '' "s|allowed-origins: .*|allowed-origins: http://localhost:3000,$FRONTEND_URL|g" "$APP_YML"

echo ""
echo "Rebuilding backend with new CORS config..."
cd "$ROOT/backend" && mvn package -q -DskipTests
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1
java -jar "$BACKEND_JAR" > /tmp/backend.log 2>&1 &
echo "Backend restarted."

echo ""
echo "=============================================="
echo ""
echo "  SHARE THIS LINK WITH YOUR TEAM:"
echo ""
echo "  $FRONTEND_URL"
echo ""
echo "  (Backend API: $BACKEND_URL)"
echo ""
echo "  Login: divya.madhanasekar / Admin@123"
echo "  SME login: gaurav.a.bhola / Sme@1234"
echo ""
echo "  Press Ctrl+C to stop sharing and restore"
echo "  original config automatically."
echo ""
echo "=============================================="

# Keep running until Ctrl+C
wait
