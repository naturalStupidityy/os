#!/usr/bin/env bash
###############################################################################
# VKumbh AWS Deployment Script
# 
# Usage:
#   export AWS_ACCESS_KEY_ID=your_key
#   export AWS_SECRET_ACCESS_KEY=your_secret
#   export AWS_REGION=ap-south-1
#   ./deploy.sh
#
# This script deploys:
#   - Backend (Hono API) -> EC2 instance with PM2
#   - Frontend (React/Vite) -> S3 + CloudFront
#   - PostgreSQL -> RDS (or EC2 self-hosted)
###############################################################################

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURATION - customize these as needed
# ---------------------------------------------------------------------------
AWS_REGION="${AWS_REGION:-ap-south-1}"
PROJECT_NAME="${PROJECT_NAME:-vkumbh}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# EC2 Configuration
EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.medium}"
EC2_KEY_NAME="${EC2_KEY_NAME:-vkumbh-key}"

# RDS Configuration (set USE_RDS=true to use managed PostgreSQL)
USE_RDS="${USE_RDS:-false}"
RDS_INSTANCE_CLASS="${RDS_INSTANCE_CLASS:-db.t3.micro}"
RDS_DB_NAME="${RDS_DB_NAME:-vkumbh}"
RDS_USERNAME="${RDS_USERNAME:-vkumbh_admin}"
RDS_PASSWORD="${RDS_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)}"

# Domain (optional - leave empty to use CloudFront domain)
DOMAIN_NAME="${DOMAIN_NAME:-}"

# Backend
BACKEND_PORT="${BACKEND_PORT:-3001}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"

# ---------------------------------------------------------------------------
# COLORS
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# ---------------------------------------------------------------------------
# PREREQUISITE CHECKS
# ---------------------------------------------------------------------------
check_prerequisites() {
  log_step "Checking Prerequisites"

  command -v aws >/dev/null 2>&1 || { log_error "AWS CLI not installed. Install: https://docs.aws.amazon.com/cli/"; exit 1; }
  command -v node >/dev/null 2>&1 || { log_error "Node.js not installed. Need v20+"; exit 1; }
  command -v npm >/dev/null 2>&1 || { log_error "npm not installed"; exit 1; }

  # Check AWS credentials
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    log_error "AWS credentials not configured. Run 'aws configure' or set env vars."
    exit 1
  fi

  local account_id
  account_id=$(aws sts get-caller-identity --query Account --output text)
  log_ok "AWS authenticated (Account: $account_id)"

  # Check Node version (need 20+)
  local node_version
  node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$node_version" -lt 20 ]]; then
    log_error "Node.js 20+ required. Found: $(node -v)"
    exit 1
  fi
  log_ok "Node.js $(node -v)"

  log_ok "All prerequisites satisfied"
}

# ---------------------------------------------------------------------------
# GENERATE EC2 KEY PAIR
# ---------------------------------------------------------------------------
setup_key_pair() {
  log_step "Setting up EC2 Key Pair"

  if aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    log_warn "Key pair '$EC2_KEY_NAME' already exists"
    if [[ ! -f "${EC2_KEY_NAME}.pem" ]]; then
      log_warn "Private key file ${EC2_KEY_NAME}.pem not found locally. You must have it to SSH."
    fi
  else
    aws ec2 create-key-pair \
      --key-name "$EC2_KEY_NAME" \
      --region "$AWS_REGION" \
      --query 'KeyMaterial' \
      --output text > "${EC2_KEY_NAME}.pem"
    chmod 400 "${EC2_KEY_NAME}.pem"
    log_ok "Created key pair: ${EC2_KEY_NAME}.pem"
  fi
}

# ---------------------------------------------------------------------------
# CREATE SECURITY GROUPS
# ---------------------------------------------------------------------------
setup_security_groups() {
  log_step "Creating Security Groups"

  # Backend Security Group
  BACKEND_SG_NAME="${PROJECT_NAME}-backend-sg"
  BACKEND_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$BACKEND_SG_NAME" \
    --region "$AWS_REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "none")

  if [[ "$BACKEND_SG_ID" == "none" || "$BACKEND_SG_ID" == "None" ]]; then
    BACKEND_SG_ID=$(aws ec2 create-security-group \
      --group-name "$BACKEND_SG_NAME" \
      --description "VKumbh Backend Security Group" \
      --region "$AWS_REGION" \
      --query 'GroupId' \
      --output text)
    log_ok "Created backend security group: $BACKEND_SG_ID"
  else
    log_ok "Using existing backend security group: $BACKEND_SG_ID"
  fi

  # Add rules
  aws ec2 authorize-security-group-ingress \
    --group-id "$BACKEND_SG_ID" \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

  aws ec2 authorize-security-group-ingress \
    --group-id "$BACKEND_SG_ID" \
    --protocol tcp \
    --port "$BACKEND_PORT" \
    --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

  aws ec2 authorize-security-group-ingress \
    --group-id "$BACKEND_SG_ID" \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

  aws ec2 authorize-security-group-ingress \
    --group-id "$BACKEND_SG_ID" \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" 2>/dev/null || true

  log_ok "Security group rules configured"
}

# ---------------------------------------------------------------------------
# CREATE RDS POSTGRESQL (OPTIONAL)
# ---------------------------------------------------------------------------
setup_rds() {
  if [[ "$USE_RDS" != "true" ]]; then
    log_warn "USE_RDS=false - Skipping RDS. Will use local PostgreSQL on EC2."
    return 0
  fi

  log_step "Creating RDS PostgreSQL Instance"

  # RDS Subnet Group
  RDS_SUBNET_GROUP="${PROJECT_NAME}-db-subnet"

  # Get default VPC
  local vpc_id
  vpc_id=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=true" \
    --region "$AWS_REGION" \
    --query 'Vpcs[0].VpcId' \
    --output text)

  # Get subnets
  local subnets
  subnets=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$vpc_id" \
    --region "$AWS_REGION" \
    --query 'Subnets[*].SubnetId' \
    --output text)

  # Create DB subnet group
  aws rds create-db-subnet-group \
    --db-subnet-group-name "$RDS_SUBNET_GROUP" \
    --db-subnet-group-description "VKumbh DB subnet group" \
    --subnet-ids $(echo "$subnets" | head -2) \
    --region "$AWS_REGION" 2>/dev/null || log_warn "DB subnet group may already exist"

  # Create RDS instance
  local rds_id="${PROJECT_NAME}-db"
  if aws rds describe-db-instances \
    --db-instance-identifier "$rds_id" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    log_warn "RDS instance $rds_id already exists"
  else
    log_info "Creating RDS instance (this takes ~10 minutes)..."
    aws rds create-db-instance \
      --db-instance-identifier "$rds_id" \
      --db-instance-class "$RDS_INSTANCE_CLASS" \
      --engine postgres \
      --engine-version 16 \
      --allocated-storage 20 \
      --storage-type gp2 \
      --db-name "$RDS_DB_NAME" \
      --master-username "$RDS_USERNAME" \
      --master-user-password "$RDS_PASSWORD" \
      --vpc-security-group-ids "$BACKEND_SG_ID" \
      --db-subnet-group-name "$RDS_SUBNET_GROUP" \
      --publicly-accessible \
      --region "$AWS_REGION" \
      --no-multi-az \
      --auto-minor-version-upgrade

    log_info "Waiting for RDS to become available..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$rds_id" \
      --region "$AWS_REGION"
    log_ok "RDS instance is available"
  fi

  # Get endpoint
  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$rds_id" \
    --region "$AWS_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

  export DATABASE_URL="postgres://${RDS_USERNAME}:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}"
  log_ok "RDS Endpoint: $RDS_ENDPOINT"
}

# ---------------------------------------------------------------------------
# LAUNCH EC2 INSTANCE FOR BACKEND
# ---------------------------------------------------------------------------
launch_backend_ec2() {
  log_step "Launching EC2 Instance for Backend"

  local ami_id
  ami_id=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=virtualization-type,Values=hvm" \
    --region "$AWS_REGION" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

  log_info "Using AMI: $ami_id"

  # Check if instance already exists
  local existing_instance
  existing_instance=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-backend" "Name=instance-state-name,Values=running,pending" \
    --region "$AWS_REGION" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null || echo "none")

  if [[ "$existing_instance" != "None" && "$existing_instance" != "none" ]]; then
    log_warn "Backend EC2 instance already exists: $existing_instance"
    EC2_INSTANCE_ID="$existing_instance"
  else
    # User data script for EC2 setup
    local user_data
    user_data=$(cat <<'EOF'
#!/bin/bash
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs git nginx postgresql16-server

# Setup PostgreSQL (local)
postgresql-setup initdb 2>/dev/null || true
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER vkumbh WITH PASSWORD 'vkumbh_password';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE vkumbh OWNER vkumbh;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vkumbh TO vkumbh;" 2>/dev/null || true

# Install PM2
npm install -g pm2

# Setup app directory
mkdir -p /opt/vkumbh
chown ec2-user:ec2-user /opt/vkumbh

# Nginx config
cat > /etc/nginx/conf.d/vkumbh.conf <<'NGINX'
server {
    listen 80;
    location / {
        proxy_pass http://localhost:3001;
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
NGINX

systemctl enable nginx
systemctl restart nginx
EOF
)

    EC2_INSTANCE_ID=$(aws ec2 run-instances \
      --image-id "$ami_id" \
      --instance-type "$EC2_INSTANCE_TYPE" \
      --key-name "$EC2_KEY_NAME" \
      --security-group-ids "$BACKEND_SG_ID" \
      --user-data "$user_data" \
      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-backend},{Key=Project,Value=$PROJECT_NAME},{Key=Environment,Value=$ENVIRONMENT}]" \
      --region "$AWS_REGION" \
      --query 'Instances[0].InstanceId' \
      --output text)

    log_info "Waiting for EC2 instance to be running..."
    aws ec2 wait instance-running \
      --instance-ids "$EC2_INSTANCE_ID" \
      --region "$AWS_REGION"
    log_ok "EC2 instance running: $EC2_INSTANCE_ID"
  fi

  # Get public IP
  EC2_PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$EC2_INSTANCE_ID" \
    --region "$AWS_REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

  log_ok "Backend will be available at: http://$EC2_PUBLIC_IP"
  export BACKEND_URL="http://$EC2_PUBLIC_IP"
}

# ---------------------------------------------------------------------------
# BUILD FRONTEND
# ---------------------------------------------------------------------------
build_frontend() {
  log_step "Building Frontend"

  cd app

  # Install dependencies
  log_info "Installing npm dependencies..."
  npm ci

  # Create production .env
  cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
EOF

  log_info "Building for production..."
  npm run build

  cd ..
  log_ok "Frontend build complete: app/dist/"
}

# ---------------------------------------------------------------------------
# DEPLOY FRONTEND TO S3 + CLOUDFRONT
# ---------------------------------------------------------------------------
setup_s3_cloudfront() {
  log_step "Setting up S3 and CloudFront"

  local bucket_name="${PROJECT_NAME}-frontend-${AWS_REGION}"

  # Create S3 bucket
  if aws s3api head-bucket --bucket "$bucket_name" --region "$AWS_REGION" 2>/dev/null; then
    log_ok "S3 bucket already exists: $bucket_name"
  else
    aws s3 mb "s3://${bucket_name}" --region "$AWS_REGION"
    log_ok "Created S3 bucket: $bucket_name"
  fi

  # Configure bucket for static hosting
  aws s3api put-bucket-policy --bucket "$bucket_name" --policy "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${bucket_name}/*"
    }
  ]
}
EOF
)" 2>/dev/null || true

  aws s3 website "s3://${bucket_name}" --index-document index.html --error-document index.html 2>/dev/null || true

  # Sync build files
  log_info "Uploading frontend to S3..."
  aws s3 sync app/dist/ "s3://${bucket_name}/" \
    --delete \
    --cache-control "max-age=31536000,immutable" \
    --exclude "index.html" \
    --region "$AWS_REGION"

  aws s3 cp app/dist/index.html "s3://${bucket_name}/index.html" \
    --cache-control "no-cache" \
    --region "$AWS_REGION"

  log_ok "Frontend uploaded to S3"

  # CloudFront Distribution
  local caller_ref="${PROJECT_NAME}-$(date +%s)"

  # Check for existing distribution
  local existing_cf
  existing_cf=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${PROJECT_NAME}-frontend'].Id | [0]" \
    --output text 2>/dev/null || echo "none")

  if [[ "$existing_cf" != "None" && "$existing_cf" != "none" ]]; then
    log_warn "CloudFront distribution already exists: $existing_cf"
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
      --id "$existing_cf" \
      --query 'Distribution.DomainName' \
      --output text)

    # Invalidate cache
    log_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
      --distribution-id "$existing_cf" \
      --paths "/*" \
      --region "$AWS_REGION" >/dev/null
  else
    log_info "Creating CloudFront distribution..."

    local origin_domain="${bucket_name}.s3.${AWS_REGION}.amazonaws.com"

    local dist_config
    dist_config=$(cat <<EOF
{
  "CallerReference": "${caller_ref}",
  "Comment": "${PROJECT_NAME}-frontend",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${bucket_name}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${bucket_name}",
        "DomainName": "${origin_domain}",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_All",
  "Enabled": true
}
EOF
)

    local create_result
    create_result=$(aws cloudfront create-distribution \
      --distribution-config "$dist_config" \
      --region "$AWS_REGION")

    CLOUDFRONT_DOMAIN=$(echo "$create_result" | grep -o '"DomainName": "[^"]*"' | head -1 | cut -d'"' -f4)
    log_ok "CloudFront distribution created"
  fi

  log_ok "Frontend URL: https://${CLOUDFRONT_DOMAIN}"
}

# ---------------------------------------------------------------------------
# DEPLOY BACKEND TO EC2
# ---------------------------------------------------------------------------
deploy_backend() {
  log_step "Deploying Backend to EC2"

  local key_file="${EC2_KEY_NAME}.pem"

  # Wait for SSH to be available
  log_info "Waiting for SSH on $EC2_PUBLIC_IP..."
  local retries=0
  while ! ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$key_file" "ec2-user@${EC2_PUBLIC_IP}" "echo ok" 2>/dev/null; do
    retries=$((retries + 1))
    if [[ $retries -gt 30 ]]; then
      log_error "SSH not available after 5 minutes"
      exit 1
    fi
    sleep 10
  done
  log_ok "SSH available"

  # Prepare backend archive
  log_info "Preparing backend archive..."
  local tmp_dir
  tmp_dir=$(mktemp -d)
  mkdir -p "$tmp_dir/backend"
  cp -r app/backend/* "$tmp_dir/backend/"
  cp app/package*.json "$tmp_dir/"

  # Create production package.json (server-only)
  cat > "$tmp_dir/package.json" <<EOF
{
  "name": "vkumbh-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx backend/src/server.ts",
    "migrate": "echo 'Run migrations manually'"
  },
  "dependencies": {
    "@hono/node-server": "^2.0.4",
    "bcryptjs": "^3.0.3",
    "dotenv": "^17.4.2",
    "drizzle-orm": "^0.45.2",
    "hono": "^4.12.22",
    "jose": "^6.2.3",
    "postgres": "^3.4.9",
    "uuid": "^14.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^24.10.1",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.22.3",
    "typescript": "~5.9.3"
  }
}
EOF

  # Create .env for backend
  cat > "$tmp_dir/.env" <<EOF
PORT=${BACKEND_PORT}
NODE_ENV=production
DATABASE_URL=${DATABASE_URL:-postgres://vkumbh:vkumbh_password@localhost:5432/vkumbh}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${CLOUDFRONT_DOMAIN}
EOF

  # Create PM2 ecosystem file
  cat > "$tmp_dir/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: 'vkumbh-backend',
    script: 'tsx',
    args: 'backend/src/server.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: ${BACKEND_PORT}
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};
EOF

  # Create startup script
  cat > "$tmp_dir/start.sh" <<'EOF'
#!/bin/bash
cd /opt/vkumbh
mkdir -p logs
source .env
export PATH="$PATH:$(npm bin -g)"
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup systemd -u ec2-user --hp /home/ec2-user
EOF
  chmod +x "$tmp_dir/start.sh"

  # Archive and upload
  local archive="/tmp/vkumbh-backend.tar.gz"
  tar -czf "$archive" -C "$tmp_dir" .

  log_info "Uploading backend to EC2..."
  scp -o StrictHostKeyChecking=no -i "$key_file" "$archive" "ec2-user@${EC2_PUBLIC_IP}:/tmp/"

  # Deploy on server
  log_info "Extracting and starting backend..."
  ssh -o StrictHostKeyChecking=no -i "$key_file" "ec2-user@${EC2_PUBLIC_IP}" <<DEPLOY
    sudo rm -rf /opt/vkumbh/*
    sudo tar -xzf /tmp/vkumbh-backend.tar.gz -C /opt/vkumbh/
    sudo chown -R ec2-user:ec2-user /opt/vkumbh
    cd /opt/vkumbh
    npm install
    npx pm2 delete vkumbh-backend 2>/dev/null || true
    bash start.sh
DEPLOY

  rm -rf "$tmp_dir" "$archive"
  log_ok "Backend deployed and running on $EC2_PUBLIC_IP"
}

# ---------------------------------------------------------------------------
# UPDATE FRONTEND API URL
# ---------------------------------------------------------------------------
update_frontend_api() {
  log_step "Updating Frontend API Configuration"

  # Rebuild with correct backend URL
  cd app

  cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}/api
EOF

  npm run build

  # Re-upload to S3
  local bucket_name="${PROJECT_NAME}-frontend-${AWS_REGION}"

  aws s3 sync dist/ "s3://${bucket_name}/" \
    --delete \
    --cache-control "max-age=31536000,immutable" \
    --exclude "index.html" \
    --region "$AWS_REGION"

  aws s3 cp dist/index.html "s3://${bucket_name}/index.html" \
    --cache-control "no-cache" \
    --region "$AWS_REGION"

  # Invalidate CloudFront
  local existing_cf
  existing_cf=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${PROJECT_NAME}-frontend'].Id | [0]" \
    --output text 2>/dev/null || echo "none")

  if [[ "$existing_cf" != "None" && "$existing_cf" != "none" ]]; then
    aws cloudfront create-invalidation \
      --distribution-id "$existing_cf" \
      --paths "/*" \
      --region "$AWS_REGION" >/dev/null
    log_ok "CloudFront cache invalidated"
  fi

  cd ..
}

# ---------------------------------------------------------------------------
# SAVE DEPLOYMENT INFO
# ---------------------------------------------------------------------------
save_deployment_info() {
  log_step "Saving Deployment Information"

  cat > "deployment-info.json" <<EOF
{
  "project": "$PROJECT_NAME",
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backend": {
    "instanceId": "$EC2_INSTANCE_ID",
    "publicIp": "$EC2_PUBLIC_IP",
    "url": "$BACKEND_URL",
    "port": $BACKEND_PORT,
    "securityGroup": "$BACKEND_SG_ID",
    "sshKey": "${EC2_KEY_NAME}.pem"
  },
  "frontend": {
    "cloudfrontDomain": "$CLOUDFRONT_DOMAIN",
    "url": "https://$CLOUDFRONT_DOMAIN",
    "s3Bucket": "${PROJECT_NAME}-frontend-${AWS_REGION}"
  },
  "database": {
    "type": "$([[ "$USE_RDS" == "true" ]] && echo "rds" || echo "local")",
    "connectionString": "${DATABASE_URL:-local}"
  },
  "security": {
    "jwtSecretConfigured": true
  }
}
EOF

  log_ok "Deployment info saved to: deployment-info.json"
}

# ---------------------------------------------------------------------------
# PRINT SUMMARY
# ---------------------------------------------------------------------------
print_summary() {
  echo
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║                 DEPLOYMENT COMPLETE                          ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${BOLD}Frontend (S3 + CloudFront):${NC}"
  echo -e "  URL: ${CYAN}https://${CLOUDFRONT_DOMAIN}${NC}"
  echo
  echo -e "${BOLD}Backend (EC2):${NC}"
  echo -e "  URL: ${CYAN}${BACKEND_URL}${NC}"
  echo -e "  SSH: ${CYAN}ssh -i ${EC2_KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}${NC}"
  echo
  echo -e "${BOLD}EC2 Instance:${NC}"
  echo -e "  ID:   $EC2_INSTANCE_ID"
  echo -e "  IP:   $EC2_PUBLIC_IP"
  echo
  echo -e "${BOLD}To SSH into the server:${NC}"
  echo -e "  ${YELLOW}chmod 400 ${EC2_KEY_NAME}.pem${NC}"
  echo -e "  ${YELLOW}ssh -i ${EC2_KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}${NC}"
  echo
  echo -e "${BOLD}View backend logs:${NC}"
  echo -e "  ${YELLOW}ssh -i ${EC2_KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP} "pm2 logs"${NC}"
  echo
  echo -e "${BOLD}Deployment info saved to:${NC} ${CYAN}deployment-info.json${NC}"
  echo
  echo -e "${YELLOW}NOTE: If using a custom domain, point your DNS to:${NC}"
  echo -e "  ${CYAN}${CLOUDFRONT_DOMAIN}${NC}"
  echo
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
  echo -e "${BOLD}AWS Deployment Script${NC}"
  echo

  check_prerequisites
  setup_key_pair
  setup_security_groups

  if [[ "$USE_RDS" == "true" ]]; then
    setup_rds
  fi

  launch_backend_ec2
  build_frontend
  setup_s3_cloudfront
  deploy_backend
  update_frontend_api
  save_deployment_info
  print_summary
}

# Allow overriding any function and running individually
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
