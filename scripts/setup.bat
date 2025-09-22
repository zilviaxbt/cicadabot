@echo off
REM GalaSwap Bot Setup Script for Windows

echo 🚀 Setting up GalaSwap Bot...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file with your private key and wallet address
) else (
    echo ✅ .env file already exists
)

REM Build the project
echo 🔨 Building project...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build project
    pause
    exit /b 1
)

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your private key and wallet address
echo 2. Run: npm run dev examples/basic-usage.ts
echo 3. Or run: npm run dev src/index.ts
echo.
echo ⚠️  Remember to test with small amounts first!
pause
