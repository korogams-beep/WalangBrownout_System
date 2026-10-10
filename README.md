# Walang Brownout Appliances — Inventory Management System

A decoupled monorepo web application for inventory control, featuring a React + Vite Single Page Application (SPA) frontend and a Laravel 11 REST API backend.

---

## Repository Structure

```
Walang-Brownout-Appliances-Folder-Structure/
├── frontend/               # React 18 + Vite SPA client
│   ├── src/                # UI components, contexts, pages, styles, and utils
│   ├── index.html          # HTML entry point
│   ├── package.json        # Frontend dependencies and npm scripts
│   ├── vite.config.js      # Vite build configuration
│   ├── nixpacks.toml       # Railway deployment config
│   └── vercel.json         # Vercel deployment routes config
│
├── backend/                # Laravel 11 REST API service
│   ├── app/                # Controllers, Models, and Domain Services
│   ├── routes/             # RESTful API route definitions (api.php)
│   ├── database/           # Migrations & Database Seeders (SQLite/MySQL)
│   ├── config/             # Application, CORS, and Sanctum configurations
│   ├── composer.json       # PHP dependencies
│   └── nixpacks.toml       # Railway deployment config
│
├── test-api.ps1            # Automated REST API test suite (30 end-to-end checks)
├── Testing-Report.md       # Comprehensive full-stack testing report & audit logs
├── Issues.md               # Technical debt & issue registry
├── REVISION-UI.md          # UI revision documentation
├── Report-Change.md        # Change log report
└── Report-Changes2.md      # Full architecture and specification document
```

---

## Getting Started

### 1. Frontend Setup & Local Development
```bash
cd frontend
npm install
npm run dev
```
- Local URL: `http://localhost:5173`
- Build for production: `npm run build`

### 2. Backend Setup & Local Development
```bash
cd backend
composer install
php artisan migrate --seed
php artisan serve
```
- API Base URL: `http://127.0.0.1:8000/api/v1`

---

## Testing

1. **Backend PHPUnit Tests:**
   ```bash
   cd backend
   php artisan test
   ```

2. **Automated REST API Test Suite:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\test-api.ps1
   ```

3. **Frontend Production Build Test:**
   ```bash
   cd frontend
   npm run build
   ```










