@echo off
REM Stylique Store Panel - Setup Script for Windows

echo 🚀 Setting up Stylique Store Panel...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)

echo ✅ Node.js version: 
node --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Copy env file
if not exist .env.local (
    echo 📝 Creating .env.local from .env.example...
    copy .env.example .env.local
    echo ⚠️  Please update .env.local with your configuration
) else (
    echo ✅ .env.local already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update .env.local with your backend URL
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:3000 in your browser
echo.
