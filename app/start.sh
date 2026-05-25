#!/bin/bash

# VKumbh Volunteer Management System - Local Development Start Script
# This script sets up PostgreSQL and starts the full-stack application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VKumbh Volunteer Management System${NC}"
echo -e "${BLUE}  Local Development Starter${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
DB_NAME="vkumbh"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_PORT="5432"
DB_CONTAINER="vkumbh-postgres"

# Check if Docker is available and PostgreSQL is running
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Checking PostgreSQL...${NC}"

    if docker ps -q -f name=$DB_CONTAINER | grep -q .; then
        echo -e "${GREEN}PostgreSQL container already running.${NC}"
    elif docker ps -aq -f status=exited -f name=$DB_CONTAINER | grep -q .; then
        echo -e "${YELLOW}Starting existing PostgreSQL container...${NC}"
        docker start $DB_CONTAINER
    else
        echo -e "${YELLOW}Creating new PostgreSQL container...${NC}"
        docker run -d \
            --name $DB_CONTAINER \
            -e POSTGRES_USER=$DB_USER \
            -e POSTGRES_PASSWORD=$DB_PASSWORD \
            -e POSTGRES_DB=$DB_NAME \
            -p $DB_PORT:5432 \
            postgres:16-alpine

        echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
        sleep 3

        # Wait for PostgreSQL to accept connections
        for i in {1..30}; do
            if docker exec $DB_CONTAINER pg_isready -U $DB_USER > /dev/null 2>&1; then
                echo -e "${GREEN}PostgreSQL is ready!${NC}"
                break
            fi
            sleep 1
        done
    fi

    # Set DATABASE_URL
    export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
else
    echo -e "${YELLOW}Docker not found. Checking for local PostgreSQL...${NC}"
    if command -v psql &> /dev/null; then
        if pg_isready -q 2>/dev/null; then
            echo -e "${GREEN}Local PostgreSQL is running.${NC}"
            export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"

            # Create database if it doesn't exist
            psql -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
                psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        else
            echo -e "${RED}ERROR: PostgreSQL is not running and Docker is not available.${NC}"
            echo -e "${RED}Please start PostgreSQL manually or install Docker.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}ERROR: Neither Docker nor PostgreSQL found.${NC}"
        echo -e "${RED}Please install one of them:${NC}"
        echo -e "  - Docker: https://docs.docker.com/get-docker/"
        echo -e "  - PostgreSQL: https://www.postgresql.org/download/"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}DATABASE_URL: $DATABASE_URL${NC}"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Push schema to database
echo -e "${YELLOW}Syncing database schema...${NC}"
npx drizzle-kit push

# Seed the database
echo -e "${YELLOW}Seeding database...${NC}"
npx tsx db/seed.ts

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Database ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get the machine's IP address for phone access
IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo -e "${BLUE}Starting VKumbh server...${NC}"
echo ""
echo -e "${GREEN}Access the app at:${NC}"
echo -e "  ${GREEN}Local:   http://localhost:3000${NC}"
echo -e "  ${GREEN}Network: http://$IP_ADDRESS:3000${NC}"
echo ""
echo -e "${YELLOW}Login with demo accounts:${NC}"
echo -e "  Admin:            Click 'Admin' quick login"
echo -e "  Instructor:       Click 'Instructor' quick login"
echo -e "  Volunteer:        Click 'Volunteer' quick login"
echo -e "  Assessment Admin: Click 'Assessment Admin' quick login"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start the dev server
export HOST=0.0.0.0
export PORT=3000
npm run dev
