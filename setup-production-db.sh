#!/bin/bash

# Database Setup Script for Production
# Run this after setting up Vercel environment variables

echo "🔍 Setting up production database..."

# Pull production environment variables
vercel env pull .env.production.local

echo "📊 Pushing database schema to production..."
# Push database schema using production DATABASE_URL
npx prisma db push

echo "🌱 Seeding database with initial user..."
# Create initial user (you can modify this)
npx prisma db seed

echo "✅ Database setup complete!"
echo "You can now login to your app with the seeded user."