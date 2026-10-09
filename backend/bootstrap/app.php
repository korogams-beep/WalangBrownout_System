<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /*
        |----------------------------------------------------------------------
        | Sanctum Stateful API Middleware
        |----------------------------------------------------------------------
        | Enables cookie-based sessions for SPAs on the same domain while
        | keeping token-based auth available for the decoupled React client.
        */
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        /*
        |----------------------------------------------------------------------
        | RFC 7807 — Uniform JSON Error Envelope for all /api/* routes
        |----------------------------------------------------------------------
        | Every error the React client receives follows the same structure:
        |
        |  {
        |    "error": {
        |      "code":    "MACHINE_READABLE_CODE",
        |      "message": "Human-readable description.",
        |      "fields":  { ... }   // only on validation failures
        |    }
        |  }
        |
        | This prevents the frontend from ever receiving an HTML error page.
        */

        // ── 422 Validation Failure ────────────────────────────────────────────
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code'    => 'VALIDATION_FAILED',
                        'message' => 'The provided request payload was invalid.',
                        'fields'  => $e->errors(),
                    ],
                ], 422);
            }
        });

        // ── 401 Unauthenticated ───────────────────────────────────────────────
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code'    => 'UNAUTHENTICATED',
                        'message' => 'No valid Bearer token provided. Please log in.',
                    ],
                ], 401);
            }
        });

        // ── 403 Forbidden ────────────────────────────────────────────────────
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code'    => 'FORBIDDEN',
                        'message' => 'You do not have permission to perform this action.',
                    ],
                ], 403);
            }
        });

        // ── 404 Resource Not Found ────────────────────────────────────────────
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code'    => 'RESOURCE_NOT_FOUND',
                        'message' => 'The requested product, batch, or transaction does not exist.',
                    ],
                ], 404);
            }
        });

        // ── 405 Method Not Allowed ────────────────────────────────────────────
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code'    => 'METHOD_NOT_ALLOWED',
                        'message' => 'HTTP method not supported for this endpoint.',
                    ],
                ], 405);
            }
        });

        // ── 500 Unhandled Server Error ────────────────────────────────────────
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') && app()->environment('production')) {
                return response()->json([
                    'error' => [
                        'code'    => 'SERVER_ERROR',
                        'message' => 'An unexpected server error occurred. Please contact support.',
                    ],
                ], 500);
            }
        });

    })->create();
