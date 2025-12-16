#!/bin/bash

# Prisma Database Setup Script
# This script starts the PostgreSQL container and runs the initial migration

set -e

echo "Starting PostgreSQL container..."
docker-compose up -d

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Running Prisma migration..."
pnpm --filter @radio-inventar/backend exec prisma migrate dev --name init

echo "Database setup complete!"
echo "You can now start the backend application."
