#!/bin/bash

# VKumbh Volunteer Management System - Production Deployment Script
# Usage: ./deploy.sh [command] [options]
#
# Commands:
#   setup       - Initial server setup (install deps, configure env)
#   build       - Build the application for production
#   migrate     - Run database migrations and seed
#   start       - Start the production server
#   stop        - Stop the production server
#   restart     - Restart the production server
#   status      - Check server status
#   logs        - View server logs
#   full        - Run full deployment (build + migrate + restart)
#   update      - Update from git and redeploy
#
# Examples:
#   ./deploy.sh setup
#   ./deploy.sh full
#   ./deploy.sh logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default configuration
APP_NAME="vkumbh"
NODE_VERSION="20"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
LOG_FILE="${SCRIPT_DIR}/logs/${APP_NAME}.log"
PID_FILE="${SCRIPT_DIR}/tmp/${APP_NAME}.pid"
ENV_FILE="${SCRIPT_DIR}/.env"

# Parse command
COMMAND="${1:-help}"
shift || true

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  VKumbh Deployment Tool${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_step() { echo -e "${BOLD}$1${NC}"; }

check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Installing Node.js ${NODE_VERSION}..."

        if command -v apt &> /dev/null; then
            # Debian/Ubuntu
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
            apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            # RHEL/CentOS/Fedora
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
            yum install -y nodejs
        elif command -v apk &> /dev/null; then
            # Alpine
            apk add --no-cache nodejs npm
        else
            print_error "Cannot install Node.js automatically. Please install Node.js ${NODE_VERSION}+ manually."
            exit 1
        fi
    fi

    local node_version
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "$NODE_VERSION" ]; then
        print_error "Node.js ${NODE_VERSION}+ required, found $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v)"
}

check_postgres() {
    print_step "Checking PostgreSQL connection..."

    if [ -z "$DATABASE_URL" ]; then
        if [ -f "$ENV_FILE" ]; then
            # shellcheck source=/dev/null
            source "$ENV_FILE"
        fi
    fi

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set"
        print_info "Please set it in .env file or export it:"
        echo "  export DATABASE_URL=postgres://user:pass@localhost:5432/vkumbh"
        return 1
    fi

    print_success "DATABASE_URL is configured"
    return 0
}

create_directories() {
    print_step "Creating required directories..."
    mkdir -p "${SCRIPT_DIR}/logs"
    mkdir -p "${SCRIPT_DIR}/tmp"
    mkdir -p "${SCRIPT_DIR}/dist"
    print_success "Directories created"
}

generate_env() {
    if [ -f "$ENV_FILE" ]; then
        print_warning ".env file already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi

    print_step "Creating .env configuration file..."

    # Generate secure secrets
    local jwt_secret
    jwt_secret=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)

    cat > "$ENV_FILE" << EOF
# VKumbh Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# Database (REQUIRED - update with your PostgreSQL credentials)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vkumbh

# Security (auto-generated, change if needed)
JWT_SECRET=${jwt_secret}

# Optional: App credentials for external integrations
# APP_ID=your_app_id
# APP_SECRET=your_app_secret

# Optional: PostgreSQL SSL (recommended for production)
# PGSSLMODE=require
EOF

    print_success ".env file created at ${ENV_FILE}"
    print_warning "IMPORTANT: Edit .env and update DATABASE_URL with your actual database credentials"
}

setup_firewall() {
    print_step "Configuring firewall..."

    if command -v ufw &> /dev/null; then
        # UFW (Ubuntu/Debian)
        ufw allow 22/tcp comment 'SSH'
        ufw allow ${PORT}/tcp comment 'VKumbh App'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        print_success "UFW rules added"
    elif command -v firewall-cmd &> /dev/null; then
        # firewalld (RHEL/CentOS/Fedora)
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-port=${PORT}/tcp
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        print_success "firewalld rules added"
    elif command -v iptables &> /dev/null; then
        # iptables fallback
        iptables -A INPUT -p tcp --dport 22 -j ACCEPT
        iptables -A INPUT -p tcp --dport ${PORT} -j ACCEPT
        iptables -A INPUT -p tcp --dport 80 -j ACCEPT
        iptables -A INPUT -p tcp --dport 443 -j ACCEPT
        print_success "iptables rules added"
    else
        print_warning "No firewall tool found (ufw/firewalld/iptables)"
    fi
}

cmd_setup() {
    print_header
    print_step "=== SETUP MODE ==="
    echo ""

    # Install Node.js
    check_nodejs

    # Install npm dependencies
    print_step "Installing npm dependencies..."
    npm ci
    print_success "Dependencies installed"

    # Create directories
    create_directories

    # Generate .env
    generate_env

    # Setup firewall
    setup_firewall

    echo ""
    print_success "Setup complete!"
    echo ""
    print_info "Next steps:"
    echo "  1. Edit .env and set your DATABASE_URL"
    echo "  2. Run: ./deploy.sh migrate"
    echo "  3. Run: ./deploy.sh full"
    echo ""
}

cmd_build() {
    print_header
    print_step "=== BUILD MODE ==="
    echo ""

    check_nodejs
    create_directories

    # Load env
    if [ -f "$ENV_FILE" ]; then
        # shellcheck source=/dev/null
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    print_step "Building application..."
    npm run build

    print_success "Build complete!"
    print_info "Output: ${SCRIPT_DIR}/dist/"
    echo ""
}

cmd_migrate() {
    print_header
    print_step "=== DATABASE MIGRATION MODE ==="
    echo ""

    # Load env
    if [ -f "$ENV_FILE" ]; then
        # shellcheck source=/dev/null
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    if ! check_postgres; then
        return 1
    fi

    print_step "Pushing database schema..."
    npx drizzle-kit push
    print_success "Schema pushed"

    print_step "Seeding database..."
    npx tsx db/seed.ts
    print_success "Database seeded"

    echo ""
    print_success "Database migration complete!"
    echo ""
}

cmd_start() {
    print_header
    print_step "=== START MODE ==="
    echo ""

    # Load env
    if [ -f "$ENV_FILE" ]; then
        # shellcheck source=/dev/null
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    if ! check_postgres; then
        return 1
    fi

    # Check if already running
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        print_warning "Server is already running (PID: $(cat "$PID_FILE"))"
        print_info "Use './deploy.sh restart' to restart"
        return 0
    fi

    print_step "Starting VKumbh server on ${HOST}:${PORT}..."
    mkdir -p "$(dirname "$LOG_FILE")"
    nohup node "${SCRIPT_DIR}/dist/boot.js" >> "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"

    # Wait for server to start
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        print_success "Server started (PID: ${pid})"
        print_info "Log file: ${LOG_FILE}"
        print_info "API endpoint: http://${HOST}:${PORT}/api/trpc"
        print_info "Health check: http://${HOST}:${PORT}/health"
    else
        print_error "Server failed to start"
        print_info "Check logs: ${LOG_FILE}"
        rm -f "$PID_FILE"
        return 1
    fi
    echo ""
}

cmd_stop() {
    print_header
    print_step "=== STOP MODE ==="
    echo ""

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            print_step "Stopping server (PID: ${pid})..."
            kill "$pid"
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            print_success "Server stopped"
        else
            print_warning "Server not running"
        fi
        rm -f "$PID_FILE"
    else
        print_warning "No PID file found"
    fi
    echo ""
}

cmd_restart() {
    print_header
    print_step "=== RESTART MODE ==="
    echo ""
    cmd_stop
    sleep 1
    cmd_start
}

cmd_status() {
    print_header
    print_step "=== STATUS MODE ==="
    echo ""

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            print_success "Server is running (PID: ${pid})"
            print_info "Uptime: $(ps -p "$pid" -o etime= 2>/dev/null || echo 'unknown')"
            print_info "Memory: $(ps -p "$pid" -o rss= 2>/dev/null | awk '{print int($1/1024) " MB"}' || echo 'unknown')"
            print_info "Port: ${PORT}"
            print_info "Log: ${LOG_FILE}"

            # Check health endpoint
            local health
            health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || echo "000")
            if [ "$health" = "200" ]; then
                print_success "Health check: OK"
            else
                print_error "Health check: FAILED (HTTP ${health})"
            fi
        else
            print_error "Server not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        print_warning "Server not running"
    fi

    # Check disk space
    echo ""
    print_info "Disk usage:"
    df -h "$SCRIPT_DIR" 2>/dev/null | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'

    echo ""
}

cmd_logs() {
    local lines="${1:-50}"

    if [ -f "$LOG_FILE" ]; then
        echo -e "${CYAN}=== Last ${lines} lines of log ===${NC}"
        tail -n "$lines" "$LOG_FILE"
    else
        print_error "Log file not found: ${LOG_FILE}"
    fi
}

cmd_full() {
    print_header
    print_step "=== FULL DEPLOYMENT MODE ==="
    echo ""

    # Build
    cmd_build

    # Migrate
    cmd_migrate

    # Restart
    cmd_restart

    echo ""
    print_success "========================================"
    print_success "  Full deployment complete!"
    print_success "========================================"
    echo ""
    print_info "Application URL: http://${HOST}:${PORT}"
    print_info "Health Check:    http://${HOST}:${PORT}/health"
    echo ""
}

cmd_update() {
    print_header
    print_step "=== UPDATE & REDEPLOY MODE ==="
    echo ""

    # Check if git repo
    if [ -d "${SCRIPT_DIR}/../.git" ] || [ -d "${SCRIPT_DIR}/.git" ]; then
        print_step "Pulling latest changes..."
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || print_warning "Git pull failed, continuing..."
    else
        print_warning "Not a git repository, skipping git pull"
    fi

    # Full deploy
    cmd_full
}

cmd_help() {
    print_header
    cat << 'EOF'
Usage: ./deploy.sh [command] [options]

Commands:
  setup       Initial server setup (install deps, configure environment)
  build       Build the application for production
  migrate     Run database schema push and seed data
  start       Start the production server
  stop        Stop the production server
  restart     Restart the production server
  status      Check server status and health
  logs [n]    View last n lines of logs (default: 50)
  full        Full deployment: build + migrate + restart
  update      Git pull latest changes and redeploy
  help        Show this help message

Examples:
  # First time setup on a new server
  ./deploy.sh setup

  # Full deployment after code changes
  ./deploy.sh full

  # Quick restart without rebuilding
  ./deploy.sh restart

  # View recent logs
  ./deploy.sh logs 100

  # Update from git and redeploy
  ./deploy.sh update

Environment Variables:
  DATABASE_URL    PostgreSQL connection string (required)
  JWT_SECRET      Secret key for JWT tokens (auto-generated)
  PORT            Server port (default: 3000)
  HOST            Server host (default: 0.0.0.0)

Configuration Files:
  .env            Main configuration file (auto-created by setup)

EOF
}

# Main command dispatcher
case "$COMMAND" in
    setup)
        cmd_setup
        ;;
    build)
        cmd_build
        ;;
    migrate)
        cmd_migrate
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "$@"
        ;;
    full)
        cmd_full
        ;;
    update)
        cmd_update
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        cmd_help
        exit 1
        ;;
esac
