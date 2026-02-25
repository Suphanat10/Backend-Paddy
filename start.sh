#!/bin/sh

set -e

echo "⏳ Waiting for MySQL at db:3306..."

until nc -z db 3306; do
  sleep 2
done

echo "✅ Database is ready"

echo "🚀 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔥 Starting application..."
node server.js
