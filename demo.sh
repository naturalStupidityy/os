#!/usr/bin/env bash
###############################################################################
# VKumbh Demo Startup Script
#
# Usage:
#   chmod +x demo.sh
#   ./demo.sh
#
# This script:
#   1. Checks prerequisites (Node.js 20+, npm)
#   2. Installs all dependencies
#   3. Starts the backend server (port 3001)
#   4. Starts the frontend dev server (port 3000)
#   5. Opens the browser when ready
#
# Press Ctrl+C to stop both servers.
###############################################################################

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
APP_DIR="${APP_DIR:-./app}"
OPEN_BROWSER="${OPEN_BROWSER:-true}"

# ---------------------------------------------------------------------------
# COLORS
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------
log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}${BOLD}━━━ $* ━━━${NC}"; }
log_demo()  { echo -e "${MAGENTA}${BOLD}[DEMO]${NC}  $*"; }

# ---------------------------------------------------------------------------
# TERMINATION HANDLER
# ---------------------------------------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo
  log_warn "Shutting down servers..."

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    log_info "Stopping backend (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    log_info "Stopping frontend (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  log_ok "All servers stopped. Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ---------------------------------------------------------------------------
# CHECK PREREQUISITES
# ---------------------------------------------------------------------------
check_prerequisites() {
  log_step "Checking Prerequisites"

  # Check Node.js
  if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js is not installed."
    echo
    echo "Install Node.js 20+ using one of these methods:"
    echo "  - Official:    https://nodejs.org/"
    echo "  - nvm:         nvm install 20"
    echo "  - Homebrew:    brew install node@20"
    echo "  - apt:         curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
  fi

  local node_version
  node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$node_version" -lt 20 ]]; then
    log_error "Node.js 20+ required. Found: $(node -v)"
    log_info "Your version: $(node -v)"
    echo
    echo "To upgrade:"
    echo "  nvm install 20 && nvm use 20"
    exit 1
  fi
  log_ok "Node.js $(node -v)"

  # Check npm
  if ! command -v npm >/dev/null 2>&1; then
    log_error "npm is not installed"
    exit 1
  fi
  log_ok "npm $(npm -v)"

  # Check if ports are available
  local port_in_use=false
  if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi ":$BACKEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
      log_error "Port $BACKEND_PORT is already in use"
      port_in_use=true
    fi
    if lsof -Pi ":$FRONTEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
      log_error "Port $FRONTEND_PORT is already in use"
      port_in_use=true
    fi
  elif command -v ss >/dev/null 2>&1; then
    if ss -tln | grep -q ":$BACKEND_PORT "; then
      log_error "Port $BACKEND_PORT is already in use"
      port_in_use=true
    fi
    if ss -tln | grep -q ":$FRONTEND_PORT "; then
      log_error "Port $FRONTEND_PORT is already in use"
      port_in_use=true
    fi
  fi

  if [[ "$port_in_use" == true ]]; then
    echo
    echo "Free up the ports or change them with environment variables:"
    echo "  FRONTEND_PORT=3002 BACKEND_PORT=3003 ./demo.sh"
    exit 1
  fi

  log_ok "All prerequisites satisfied"
}

# ---------------------------------------------------------------------------
# INSTALL DEPENDENCIES
# ---------------------------------------------------------------------------
install_dependencies() {
  log_step "Installing Dependencies"

  if [[ ! -d "$APP_DIR" ]]; then
    log_error "App directory not found: $APP_DIR"
    log_info "Make sure you're running this script from the project root"
    exit 1
  fi

  cd "$APP_DIR"

  if [[ -d "node_modules" ]]; then
    log_warn "node_modules already exists. Skipping full install."
    log_info "To force reinstall: rm -rf app/node_modules && ./demo.sh"
  else
    log_info "Running npm ci (this may take a minute)..."
    npm ci
  fi

  log_ok "Dependencies installed"
}

# ---------------------------------------------------------------------------
# CREATE DEMO ENVIRONMENT CONFIG
# ---------------------------------------------------------------------------
setup_environment() {
  log_step "Setting up Demo Environment"

  # Only create .env if it doesn't exist
  if [[ ! -f ".env" ]]; then
    cat > .env <<EOF
# VKumbh Demo Environment
PORT=$BACKEND_PORT
NODE_ENV=development
VITE_API_URL=http://localhost:$BACKEND_PORT/api
EOF
    log_ok "Created .env file"
  else
    log_ok ".env file already exists"
  fi

  log_ok "Environment configured"
}

# ---------------------------------------------------------------------------
# START BACKEND
# ---------------------------------------------------------------------------
start_backend() {
  log_step "Starting Backend Server"

  log_info "Backend will start on port $BACKEND_PORT"
  log_info "API Base URL: http://localhost:$BACKEND_PORT/api"

  # Set environment variables for backend
  export PORT="$BACKEND_PORT"
  export NODE_ENV="development"

  # Start backend in background
  npm run server > /tmp/vkumbh-backend.log 2>&1 &
  BACKEND_PID=$!

  log_info "Backend starting (PID: $BACKEND_PID)..."

  # Wait for backend to be ready
  local retries=0
  local max_retries=30
  while ! curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; do
    retries=$((retries + 1))
    if [[ $retries -ge $max_retries ]]; then
      log_error "Backend failed to start after 60 seconds"
      log_info "Check logs: /tmp/vkumbh-backend.log"
      cat /tmp/vkumbh-backend.log
      exit 1
    fi
    sleep 2
  done

  log_ok "Backend is ready! (PID: $BACKEND_PID)"
}

# ---------------------------------------------------------------------------
# START FRONTEND
# ---------------------------------------------------------------------------
start_frontend() {
  log_step "Starting Frontend Dev Server"

  log_info "Frontend will start on port $FRONTEND_PORT"
  log_info "URL: http://localhost:$FRONTEND_PORT"

  # Start frontend in background
  npx vite --port "$FRONTEND_PORT" --host > /tmp/vkumbh-frontend.log 2>&1 &
  FRONTEND_PID=$!

  log_info "Frontend starting (PID: $FRONTEND_PID)..."

  # Wait for frontend to be ready
  local retries=0
  local max_retries=30
  while ! curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; do
    retries=$((retries + 1))
    if [[ $retries -ge $max_retries ]]; then
      log_error "Frontend failed to start after 60 seconds"
      log_info "Check logs: /tmp/vkumbh-frontend.log"
      cat /tmp/vkumbh-frontend.log
      exit 1
    fi
    sleep 2
  done

  log_ok "Frontend is ready! (PID: $FRONTEND_PID)"
}

# ---------------------------------------------------------------------------
# OPEN BROWSER
# ---------------------------------------------------------------------------
open_browser() {
  if [[ "$OPEN_BROWSER" != "true" ]]; then
    return 0
  fi

  local url="http://localhost:$FRONTEND_PORT"
  log_info "Opening browser..."

  sleep 2

  case "$(uname -s)" in
    Linux*)     xdg-open "$url" 2>/dev/null || true ;;
    Darwin*)    open "$url" 2>/dev/null || true ;;
    CYGWIN*|MINGW*|MSYS*) start "$url" 2>/dev/null || true ;;
    *)          log_warn "Please open $url manually" ;;
  esac
}

# ---------------------------------------------------------------------------
# PRINT DEMO INFO
# ---------------------------------------------------------------------------
print_demo_info() {
  echo
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║                 DEMO IS READY!                               ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${BOLD}Frontend:${NC}  ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
  echo -e "${BOLD}Backend:${NC}   ${CYAN}http://localhost:$BACKEND_PORT${NC}"
  echo -e "${BOLD}Health:${NC}    ${CYAN}http://localhost:$BACKEND_PORT/health${NC}"
  echo
  echo -e "${BOLD}Quick Login Credentials (click any role):${NC}"
  echo -e "  ${MAGENTA}Volunteer${NC}         - Rahul Sharma (VK-2025-1001)"
  echo -e "  ${MAGENTA}Instructor${NC}        - Gp Capt Kulkarni (VK-2025-2001)"
  echo -e "  ${MAGENTA}Assessment Admin${NC}  - Dr. Prachi Joshi (VK-2025-3001)"
  echo -e "  ${MAGENTA}Admin${NC}             - Air Cmde Nitin Sathe (VK-2025-0001)"
  echo
  echo -e "${BOLD}Demo OTP:${NC}  ${CYAN}123456${NC} (any phone number works)"
  echo
  echo -e "${BOLD}Key Features to Demo:${NC}"
  echo -e "  ${YELLOW}1.${NC} Login as Instructor -> Generate QR Code for a session"
  echo -e "  ${YELLOW}2.${NC} Login as Volunteer  -> Scan QR (or paste the QR data)"
  echo -e "  ${YELLOW}3.${NC} Attendance is marked and visible in Roster"
  echo -e "  ${YELLOW}4.${NC} Login as Admin      -> Change config values (exam pass %, etc.)"
  echo -e "  ${YELLOW}5.${NC} Config changes immediately affect exam settings"
  echo -e "  ${YELLOW}6.${NC} Login as Assessment Admin -> View exam results"
  echo
  echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
  echo
}

# ---------------------------------------------------------------------------
# WATCH LOGS
# ---------------------------------------------------------------------------
watch_logs() {
  log_step "Servers Running"
  log_info "Tailing combined logs... (Press Ctrl+C to stop)"
  echo

  # Tail both log files
  tail -f /tmp/vkumbh-backend.log /tmp/vkumbh-frontend.log 2>/dev/null &
  local tail_pid=$!

  # Wait for either process to exit
  while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 2
  done

  # If we get here, one of the servers died
  kill "$tail_pid" 2>/dev/null || true

  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    log_error "Backend server exited unexpectedly"
    log_info "Backend logs:"
    cat /tmp/vkumbh-backend.log
  fi

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    log_error "Frontend server exited unexpectedly"
    log_info "Frontend logs:"
    cat /tmp/vkumbh-frontend.log
  fi
}

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
main() {
  echo -e "${CYAN}${BOLD}"
  echo " __      ____ _    _             _             _           _"
  echo " \ \    / (_) | |  | |           | |           | |         | |"
  echo "  \ \  / / _| | | _| |_ _ __ ___ | |__  _   _  | | ___  ___| |_ _ __ ___  _ __"
  echo "   \ \/ / | | | |/ / __| '_ ' _ \| '_ \| | | | | |/ _ \/ __| __| '__/ _ \| '_ \\"
  echo "    \  /  | | |   <| |_| | | | | | |_) | |_| | | |  __/ (__| |_| | | (_) | | | |"
  echo "     \/   |_|_|_|\_\\__|_| |_| |_|_.__/ \__, | |_|\___|\___|\__|_|  \___/|_| |_|"
  echo "                                         __/ |"
  echo "                                        |___/"
  echo -e "${NC}"
  echo -e "${BOLD}Demo Startup Script${NC} - VKumbh Volunteer Management System"
  echo

  # Get project root
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir"

  check_prerequisites
  install_dependencies
  setup_environment
  start_backend
  start_frontend
  print_demo_info
  open_browser
  watch_logs
}

# Allow running functions individually for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
