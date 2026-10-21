# VKumbh Deployment Guide

This guide covers how to deploy the VKumbh Volunteer Management System to various environments using the `deploy.sh` script.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Deployment Scenarios](#deployment-scenarios)
   - [Local Development](#local-development)
   - [VPS / Cloud Server](#vps--cloud-server)
   - [Docker Deployment](#docker-deployment)
4. [Script Commands Reference](#script-commands-reference)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
8. [SSL / HTTPS](#ssl--https)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Prerequisites

### Minimum Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 1 core  | 2 cores     |
| RAM      | 1 GB    | 2 GB        |
| Disk     | 10 GB   | 20 GB SSD   |
| OS       | Ubuntu 20.04+, Debian 11+, CentOS 8+ | Ubuntu 22.04 LTS |

### Required Software

- **Node.js** 20+ (auto-installed by script if missing)
- **PostgreSQL** 14+ (can use Docker)
- **npm** or **yarn**
- **Git** (for updates)

### Required Access

- SSH access to the server
- Root or sudo privileges (for setup)
- PostgreSQL database credentials

---

## Quick Start

The fastest way to get running:

```bash
# 1. Clone the repository
git clone https://github.com/naturalStupidityy/vkumb.git
cd vkumb/app

# 2. Run initial setup (installs Node.js, dependencies, creates .env)
./deploy.sh setup

# 3. Edit .env with your database credentials
nano .env
# Set: DATABASE_URL=postgres://user:password@host:5432/dbname

# 4. Run database migrations
./deploy.sh migrate

# 5. Full deployment (build + migrate + start)
./deploy.sh full
```

The application will be available at `http://your-server-ip:3000`.

---

## Deployment Scenarios

### Local Development

For local development, use the included `start.sh` which sets up PostgreSQL in Docker:

```bash
cd vkumb/app
./start.sh
```

This will:
1. Start PostgreSQL in a Docker container (or use local PostgreSQL)
2. Install dependencies
3. Push database schema
4. Seed demo data (300 volunteers, 12 sessions, 2 exams)
5. Start the dev server with hot reload

Access the app at `http://localhost:3000`.

Demo login accounts (click the quick login buttons):
- **Admin**: Full system access
- **Instructor**: Can generate QR codes, mark attendance
- **Volunteer**: Can scan QR, take exams, view certificates
- **Assessment Admin**: Manages exams and grading

### VPS / Cloud Server

For production deployment on a VPS (DigitalOcean, Linode, AWS EC2, etc.):

#### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Create app directory
sudo mkdir -p /opt/vkumbh
sudo chown $USER:$USER /opt/vkumbh
cd /opt/vkumbh

# Clone repository
git clone https://github.com/naturalStupidityy/vkumb.git .
cd app
```

#### Step 2: Run Setup

```bash
./deploy.sh setup
```

This will:
- Install Node.js 20 (if not present)
- Install npm dependencies
- Create required directories (`logs/`, `tmp/`, `dist/`)
- Generate `.env` file with secure secrets
- Configure firewall (ufw/firewalld/iptables)

#### Step 3: Configure Database

Edit the `.env` file:

```bash
nano .env
```

Update the `DATABASE_URL` with your PostgreSQL credentials:

```env
DATABASE_URL=postgres://vkumbh_user:your_secure_password@your-db-host:5432/vkumbh
```

If you need to set up PostgreSQL, see the [Database Setup](#database-setup) section.

#### Step 4: Deploy

```bash
./deploy.sh full
```

This performs a full deployment:
1. Builds the application (`vite build` + `esbuild`)
2. Pushes database schema
3. Seeds initial data
4. Starts the production server

#### Step 5: Verify

```bash
./deploy.sh status
```

Check that the server is running and the health endpoint responds.

#### Step 6: Set Up Reverse Proxy (Recommended)

See the [Reverse Proxy](#reverse-proxy-nginx) section to configure Nginx for domain-based access.

### Docker Deployment

You can also deploy using Docker:

```bash
# Build the Docker image
docker build -t vkumbh-app .

# Run with environment variables
docker run -d \
  --name vkumbh \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/vkumbh \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  vkumbh-app
```

Or use Docker Compose:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://vkumbh:vkumbh@db:5432/vkumbh
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=vkumbh
      - POSTGRES_PASSWORD=vkumbh
      - POSTGRES_DB=vkumbh
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Script Commands Reference

| Command | Description | When to Use |
|---------|-------------|-------------|
| `./deploy.sh setup` | Initial server setup | First time on a new server |
| `./deploy.sh build` | Build application | After code changes |
| `./deploy.sh migrate` | Run DB migrations | After schema changes, first setup |
| `./deploy.sh start` | Start server | After build/migrate |
| `./deploy.sh stop` | Stop server | Maintenance, upgrades |
| `./deploy.sh restart` | Restart server | Quick restart without rebuild |
| `./deploy.sh status` | Check server health | Monitoring |
| `./deploy.sh logs [n]` | View logs (last n lines) | Debugging |
| `./deploy.sh full` | Build + migrate + restart | Complete redeployment |
| `./deploy.sh update` | Git pull + full deploy | Updating to latest code |

---

## Environment Variables

All configuration is done through the `.env` file.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/vkumbh` |

### Important Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | (auto-generated) | Secret for JWT tokens |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `APP_ID` | External app ID for integrations |
| `APP_SECRET` | External app secret |
| `PGSSLMODE` | PostgreSQL SSL mode (`require`, `disable`) |

### Example .env File

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

DATABASE_URL=postgres://vkumbh:secure_password@db.example.com:5432/vkumbh
JWT_SECRET=your-very-long-secret-key-here-change-in-production
```

---

## Database Setup

### Option 1: PostgreSQL with Docker (Recommended for single server)

```bash
# Run PostgreSQL container
docker run -d \
  --name vkumbh-postgres \
  -e POSTGRES_USER=vkumbh \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=vkumbh \
  -p 5432:5432 \
  -v vkumbh_data:/var/lib/postgresql/data \
  postgres:16-alpine

# Set DATABASE_URL in .env
# DATABASE_URL=postgres://vkumbh:your_secure_password@localhost:5432/vkumbh
```

### Option 2: Managed PostgreSQL (AWS RDS, etc.)

1. Create a PostgreSQL instance in your cloud provider
2. Allow connections from your app server
3. Set the `DATABASE_URL` in `.env`

### Option 3: Existing PostgreSQL Server

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER vkumbh_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE vkumbh OWNER vkumbh_user;
GRANT ALL PRIVILEGES ON DATABASE vkumbh TO vkumbh_user;
EOF

# Set DATABASE_URL in .env
# DATABASE_URL=postgres://vkumbh_user:your_secure_password@localhost:5432/vkumbh
```

---

## Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy:

```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/vkumbh`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/vkumbh /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now the app is accessible at `http://your-domain.com`.

---

## SSL / HTTPS

Use Certbot for free SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

This automatically configures HTTPS and redirects HTTP to HTTPS.

Auto-renewal is set up automatically. Test it with:

```bash
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Server won't start

```bash
# Check logs
./deploy.sh logs 100

# Check if port is in use
sudo lsof -i :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Database connection errors

```bash
# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check if PostgreSQL is running
sudo systemctl status postgresql
# or
docker ps | grep postgres

# Check firewall
curl -v telnet://localhost:5432
```

### Build errors

```bash
# Clean and rebuild
rm -rf node_modules dist
npm ci
./deploy.sh full
```

### Port already in use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Change port in .env
PORT=3001
```

### Permission denied errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/vkumbh
chmod +x deploy.sh start.sh
```

### "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Maintenance

### Regular Updates

```bash
# Update to latest code and redeploy
cd /opt/vkumbh/app
./deploy.sh update
```

### Database Backup

```bash
# Backup
cd /opt/vkumbh/app
source .env
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql "$DATABASE_URL" < backup_file.sql
```

### Log Rotation

Logs are written to `logs/vkumbh.log`. Set up log rotation:

```bash
sudo tee /etc/logrotate.d/vkumbh << EOF
/opt/vkumbh/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
}
EOF
```

### Monitoring

Set up a simple health check cron job:

```bash
# Add to crontab
crontab -e

# Add this line to check every 5 minutes
*/5 * * * * curl -f http://localhost:3000/health || /opt/vkumbh/app/deploy.sh restart
```

---

## Security Checklist

- [ ] Change default JWT_SECRET in production
- [ ] Use strong PostgreSQL password
- [ ] Configure firewall (only allow ports 22, 80, 443)
- [ ] Enable SSL/HTTPS
- [ ] Set up regular database backups
- [ ] Keep system packages updated
- [ ] Review and update dependencies regularly
- [ ] Use environment variables for secrets (never commit to git)

---

## Support

For issues or questions:
1. Check the logs: `./deploy.sh logs 100`
2. Check server status: `./deploy.sh status`
3. Review this guide
4. Check the GitHub repository for known issues
