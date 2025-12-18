#!/bin/bash

# 🚀 Timer App Deployment Script for Vercel

echo "🔍 Pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if required files exist
echo "📁 Checking configuration files..."
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found"
    exit 1
fi

if [ ! -f "next.config.ts" ]; then
    echo "❌ Error: next.config.ts not found"  
    exit 1
fi

if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Prisma schema not found"
    exit 1
fi

echo "✅ Configuration files found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type checking
echo "🔍 Running type check..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Please fix them before deploying."
    exit 1
fi

# Linting
echo "🧹 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ ESLint errors found. Please fix them before deploying."
    exit 1
fi

# Test build
echo "🏗️ Testing build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ All checks passed!"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "🎉 Deployment complete!"
echo ""
echo "📋 Post-deployment tasks:"
echo "1. Set environment variables in Vercel Dashboard"
echo "2. Run database migration: npx prisma db push"
echo "3. Test your app functionality"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"