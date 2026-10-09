<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
| Walang Brownout Appliances — Inventory System
|--------------------------------------------------------------------------
|
| Allows the decoupled React SPA (Vite dev + Railway production) to consume
| the Laravel REST API with credentials (Sanctum Bearer tokens).
|
| Allowed origins:
|   - http://localhost:5173       → Vite local development
|   - http://localhost:3000       → Alternate dev port
|   - FRONTEND_URL env variable   → Set to Railway frontend domain on deploy
|   - *.railway.app wildcard      → Covers all Railway preview branches
|   - walangbrownoutui.vercel.app → Current Vercel frontend deployment
|
*/

return [

    /*
    | Routes that should handle CORS headers.
    | Covers all API routes and the Sanctum CSRF cookie endpoint.
    */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    | HTTP methods accepted from cross-origin requests.
    */
    'allowed_methods' => ['*'],

    /*
    | Explicit origins allowed. The wildcard pattern below covers *.railway.app.
    */
    'allowed_origins' => [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://walangbrownoutui.vercel.app',
        env('FRONTEND_URL', 'http://localhost:5173'),
    ],

    /*
    | Regex patterns for dynamic origins (Railway preview deployments).
    */
    'allowed_origins_patterns' => [
        '#^https://.*\.railway\.app$#',
    ],

    /*
    | Allow all request headers (Content-Type, Accept, Authorization, X-Requested-With).
    */
    'allowed_headers' => ['*'],

    /*
    | Headers exposed to the browser JS (none needed beyond defaults).
    */
    'exposed_headers' => [],

    /*
    | Preflight cache lifetime in seconds (24 hours).
    */
    'max_age' => 86400,

    /*
    | Must be true so Axios can send the Bearer token in Authorization header.
    | NOTE: When supports_credentials = true, allowed_origins cannot contain '*'.
    |       Always list origins explicitly above.
    */
    'supports_credentials' => true,

];
