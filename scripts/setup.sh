#!/bin/bash

# GalaSwap Bot Setup Script

echo "🚀 Setting up GalaSwap Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your private key and wallet address"
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your private key and wallet address"
echo "2. Run: npm run dev examples/basic-usage.ts"
echo "3. Or run: npm run dev src/index.ts"
echo ""
echo "⚠️  Remember to test with small amounts first!"
