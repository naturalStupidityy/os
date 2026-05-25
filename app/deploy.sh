#!/bin/bash

# VKumbh Volunteer Management System - AWS Deployment Script
# This script deploys the full-stack application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VKumbh AWS Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}ERROR: AWS credentials not found.${NC}"
    echo -e "${YELLOW}Please set your AWS credentials:${NC}"
    echo -e "  export AWS_ACCESS_KEY_ID=your_access_key"
    echo -e "  export AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo -e "  export AWS_REGION=ap-south-1  # optional, defaults to ap-south-1"
    exit 1
fi

# Set defaults
AWS_REGION=${AWS_REGION:-"ap-south-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}ERROR: Unable to get AWS account ID. Check your credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}AWS Account: $AWS_ACCOUNT_ID${NC}"
echo -e "${GREEN}AWS Region:  $AWS_REGION${NC}"
echo ""

# Configuration
PROJECT_NAME="vkumbh"
DB_NAME="vkumbh"
DB_USER="vkumbh_admin"
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 64)}
ECR_REPO="$PROJECT_NAME-app"
ECS_CLUSTER="$PROJECT_NAME-cluster"
ECS_SERVICE="$PROJECT_NAME-service"
TASK_FAMILY="$PROJECT_NAME-task"

# ============================================
# STEP 1: Create ECR Repository
# ============================================
echo -e "${YELLOW}[1/8] Setting up ECR repository...${NC}"
aws ecr describe-repositories --repository-names $ECR_REPO --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION > /dev/null
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"
echo -e "${GREEN}ECR Repository: $ECR_URI${NC}"

# ============================================
# STEP 2: Login to ECR
# ============================================
echo -e "${YELLOW}[2/8] Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI 2>/dev/null || {
    echo -e "${RED}ERROR: Failed to login to ECR. Make sure Docker is running.${NC}"
    exit 1
}

# ============================================
# STEP 3: Build and Push Docker Image
# ============================================
echo -e "${YELLOW}[3/8] Building Docker image...${NC}"

# Create Dockerfile
cat > Dockerfile << 'DOCKERFILE_EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db
COPY drizzle.config.ts .
EXPOSE 3000
CMD ["node", "dist/boot.js"]
DOCKERFILE_EOF

docker build -t $ECR_REPO:latest .
docker tag $ECR_REPO:latest $ECR_URI:latest
echo -e "${YELLOW}Pushing image to ECR...${NC}"
docker push $ECR_URI:latest
echo -e "${GREEN}Image pushed!${NC}"

# ============================================
# STEP 4: Create RDS PostgreSQL
# ============================================
echo -e "${YELLOW}[4/8] Setting up RDS PostgreSQL...${NC}"

DB_INSTANCE_ID="$PROJECT_NAME-db"
DB_SG_NAME="$PROJECT_NAME-db-sg"

# Create DB security group
DB_SG_ID=$(aws ec2 describe-security-groups --group-names $DB_SG_NAME --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$DB_SG_ID" ]; then
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
    DB_SG_ID=$(aws ec2 create-security-group --group-name $DB_SG_NAME --description "VKumbh DB security group" --vpc-id $VPC_ID --query 'GroupId' --output text --region $AWS_REGION)
    aws ec2 authorize-security-group-ingress --group-id $DB_SG_ID --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region $AWS_REGION 2>/dev/null || true
fi

# Check if RDS instance exists
DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text --region $AWS_REGION 2>/dev/null || echo "not-found")

if [ "$DB_STATUS" == "not-found" ]; then
    echo -e "${YELLOW}Creating RDS PostgreSQL instance (this may take 10-15 minutes)...${NC}"
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 16 \
        --allocated-storage 20 \
        --db-name $DB_NAME \
        --master-username $DB_USER \
        --master-user-password $DB_PASSWORD \
        --vpc-security-group-ids $DB_SG_ID \
        --publicly-accessible \
        --region $AWS_REGION \
        --no-multi-az \
        --storage-encrypted \
        > /dev/null

    echo -e "${YELLOW}Waiting for database to be available...${NC}"
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID --region $AWS_REGION
else
    echo -e "${GREEN}RDS instance already exists (status: $DB_STATUS)${NC}"
fi

DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)
DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"
echo -e "${GREEN}Database URL: $DATABASE_URL${NC}"

# ============================================
# STEP 5: Create ECS Cluster
# ============================================
echo -e "${YELLOW}[5/8] Setting up ECS cluster...${NC}"

aws ecs describe-clusters --clusters $ECS_CLUSTER --query 'clusters[0].clusterName' --output text --region $AWS_REGION 2>/dev/null || \
    aws ecs create-cluster --cluster-name $ECS_CLUSTER --region $AWS_REGION > /dev/null

# Create task execution role
TASK_ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole"
aws iam get-role --role-name ecsTaskExecutionRole --region $AWS_REGION > /dev/null 2>&1 || {
    echo -e "${YELLOW}Creating ECS task execution role...${NC}"
    aws iam create-role --role-name ecsTaskExecutionRole \
        --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
        --region $AWS_REGION > /dev/null 2>&1 || true
    aws iam attach-role-policy --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
        --region $AWS_REGION > /dev/null 2>&1 || true
}

echo -e "${GREEN}ECS Cluster: $ECS_CLUSTER${NC}"

# ============================================
# STEP 6: Register Task Definition
# ============================================
echo -e "${YELLOW}[6/8] Registering task definition...${NC}"

cat > task-def.json << EOF
{
    "family": "$TASK_FAMILY",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "$TASK_ROLE_ARN",
    "containerDefinitions": [
        {
            "name": "$PROJECT_NAME",
            "image": "$ECR_URI:latest",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "production"
                },
                {
                    "name": "DATABASE_URL",
                    "value": "$DATABASE_URL"
                },
                {
                    "name": "JWT_SECRET",
                    "value": "$JWT_SECRET"
                },
                {
                    "name": "HOST",
                    "value": "0.0.0.0"
                },
                {
                    "name": "PORT",
                    "value": "3000"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/$PROJECT_NAME",
                    "awslogs-region": "$AWS_REGION",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-def.json --region $AWS_REGION > /dev/null
rm task-def.json
echo -e "${GREEN}Task definition registered!${NC}"

# ============================================
# STEP 7: Create/Update ECS Service
# ============================================
echo -e "${YELLOW}[7/8] Creating ECS service...${NC}"

# Create CloudWatch log group
aws logs create-log-group --log-group-name "/ecs/$PROJECT_NAME" --region $AWS_REGION 2>/dev/null || true

# Create security group for ECS
ECS_SG_NAME="$PROJECT_NAME-ecs-sg"
ECS_SG_ID=$(aws ec2 describe-security-groups --group-names $ECS_SG_NAME --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$ECS_SG_ID" ]; then
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
    ECS_SG_ID=$(aws ec2 create-security-group --group-name $ECS_SG_NAME --description "VKumbh ECS security group" --vpc-id $VPC_ID --query 'GroupId' --output text --region $AWS_REGION)
    aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $AWS_REGION 2>/dev/null || true
fi

# Get subnets
SUBNETS=$(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[*].SubnetId' --output json --region $AWS_REGION)

# Check if service exists
SERVICE_STATUS=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --query 'services[0].status' --output text --region $AWS_REGION 2>/dev/null || echo "MISSING")

if [ "$SERVICE_STATUS" == "MISSING" ] || [ "$SERVICE_STATUS" == "None" ]; then
    aws ecs create-service \
        --cluster $ECS_CLUSTER \
        --service-name $ECS_SERVICE \
        --task-definition $TASK_FAMILY \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=$SUBNETS,securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
        --region $AWS_REGION \
        > /dev/null
else
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --task-definition $TASK_FAMILY \
        --force-new-deployment \
        --region $AWS_REGION \
        > /dev/null
fi

echo -e "${GREEN}ECS Service created/updated!${NC}"

# ============================================
# STEP 8: Run Migrations
# ============================================
echo -e "${YELLOW}[8/8] Running database migrations...${NC}"
echo -e "${YELLOW}Waiting for service to be stable...${NC}"
aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION 2>/dev/null || {
    echo -e "${YELLOW}Service is starting up. You may need to run migrations manually.${NC}"
}

# Run migrations locally using the RDS URL
echo -e "${YELLOW}Pushing schema to RDS...${NC}"
export DATABASE_URL
npx drizzle-kit push

echo -e "${YELLOW}Seeding database...${NC}"
npx tsx db/seed.ts

# ============================================
# DEPLOYMENT COMPLETE
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get the service public IP
TASK_ARN=$(aws ecs list-tasks --cluster $ECS_CLUSTER --service-name $ECS_SERVICE --query 'taskArns[0]' --output text --region $AWS_REGION)
if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
    ENI_ID=$(aws ecs describe-tasks --cluster $ECS_CLUSTER --tasks $TASK_ARN --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text --region $AWS_REGION)
    PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --query 'NetworkInterfaces[0].Association.PublicIp' --output text --region $AWS_REGION 2>/dev/null || echo "")
    if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
        echo -e "${GREEN}App URL: http://$PUBLIC_IP:3000${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Your AWS Resources:${NC}"
echo -e "  ECR Repository: $ECR_URI"
echo -e "  RDS Database:   $DB_ENDPOINT"
echo -e "  ECS Cluster:    $ECS_CLUSTER"
echo -e "  ECS Service:    $ECS_SERVICE"
echo ""
echo -e "${YELLOW}Environment Variables (save these):${NC}"
echo -e "  DATABASE_URL=$DATABASE_URL"
echo -e "  JWT_SECRET=$JWT_SECRET"
echo ""
echo -e "${YELLOW}To redeploy after code changes:${NC}"
echo -e "  ./deploy.sh"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  aws logs tail /ecs/$PROJECT_NAME --follow --region $AWS_REGION"
echo ""

# Cleanup
rm -f Dockerfile
