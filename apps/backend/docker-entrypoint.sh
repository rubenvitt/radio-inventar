#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma@6 migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec node dist/main
