<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    $dbStatus = 'disconnected';
    try {
        if (DB::connection()->getPdo()) {
            $dbStatus = 'connected';
        }
    } catch (\Throwable $e) {
        $dbStatus = 'disconnected';
    }

    $frontendUrl = env('FRONTEND_URL', 'https://wbimsfrontend-production.up.railway.app');

    return response('<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Walang Brownout Appliances — REST API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #151c2c;
      border: 1px solid #1e293b;
      border-radius: 16px;
      max-width: 580px;
      width: 100%;
      padding: 36px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    p.subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .status-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .status-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 14px;
      border-radius: 10px;
    }
    .status-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
    .status-val { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .dot-green { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
    .links-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; font-weight: 600; }
    .link-btns { display: flex; flex-direction: column; gap: 10px; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-primary { background: #f59e0b; color: #0b0f19; font-weight: 600; }
    .btn-primary:hover { background: #d97706; }
    .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .btn-secondary:hover { background: #334155; color: #fff; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">⚡ Walang Brownout Appliances</div>
    <h1>Inventory Control REST API</h1>
    <p class="subtitle">Decoupled Laravel 11 backend service running live on Railway with MySQL persistent storage.</p>
    
    <div class="status-row">
      <div class="status-box">
        <div class="status-label">API Status</div>
        <div class="status-val"><span class="dot-green"></span> Online (PHP 8.3)</div>
      </div>
      <div class="status-box">
        <div class="status-label">MySQL Database</div>
        <div class="status-val"><span class="dot-green"></span> ' . ucfirst($dbStatus) . '</div>
      </div>
    </div>

    <div class="links-title">Quick Navigation</div>
    <div class="link-btns">
      <a href="' . $frontendUrl . '" class="btn btn-primary">
        <span>Go to Frontend Application</span>
        <span>&rarr;</span>
      </a>
      <a href="/api/v1/health" class="btn btn-secondary">
        <span>Health Check Endpoint (/api/v1/health)</span>
        <span>GET &rarr;</span>
      </a>
      <a href="/api/v1/products" class="btn btn-secondary">
        <span>Products Catalog (/api/v1/products)</span>
        <span>GET &rarr;</span>
      </a>
    </div>

    <div class="footer">
      CCS112 Applications Development &bull; Pamantasan ng Cabuyao
    </div>
  </div>
</body>
</html>', 200, ['Content-Type' => 'text/html']);
});
