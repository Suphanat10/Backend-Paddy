#!/bin/sh

echo "⏳ Waiting for MySQL at db:3306..."
until nc -z db 3306; do
  sleep 2
done

echo "🧬 Running Prisma migrate..."
npx prisma migrate deploy

echo "🚀 Starting Node server..."
node server.js
