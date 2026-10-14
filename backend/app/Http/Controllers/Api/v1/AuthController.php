<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/login
     *
     * Accepts email or username + password, validates credentials, checks active status,
     * and returns a Sanctum bearer token.
     */
    public function login(Request $request): JsonResponse
    {
        $input = $request->validate([
            'email'    => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'required|string',
        ]);

        $loginIdentifier = trim($input['email'] ?? $input['username'] ?? '');
        if (empty($loginIdentifier)) {
            throw ValidationException::withMessages([
                'email' => ['Please provide an email or username.'],
            ]);
        }

        $password = $input['password'];

        // Find user by email, name/username, or fallback domain
        $user = User::where('email', $loginIdentifier)
                    ->orWhere('name', $loginIdentifier)
                    ->orWhere('email', $loginIdentifier . '@walangbrownout.com')
                    ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if account has been deactivated
        if (isset($user->active) && !$user->active) {
            return response()->json([
                'success' => false,
                'message' => 'This account has been deactivated. Please contact an administrator.',
            ], 403);
        }

        $token = $user->createToken('wb_api_token', ['*'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'user'       => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'role'   => $user->role,
                    'active' => $user->active ?? true,
                ],
            ],
        ], 200);
    }

    /**
     * POST /api/v1/auth/register
     *
     * Registers a new user account into MySQL and returns an API token.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|min:3|max:50',
            'password' => 'required|string|min:6',
            'email'    => 'nullable|email|max:100',
            'role'     => 'nullable|in:admin,manager,staff',
        ]);

        $username = trim($validated['username']);
        $email    = !empty($validated['email'])
            ? trim($validated['email'])
            : strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', $username)) . '@walangbrownout.com';

        // Check for existing user by name or email
        $existing = User::where('name', $username)->orWhere('email', $email)->first();
        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Username or email already taken.',
            ], 422);
        }

        $role = $validated['role'] ?? 'staff';

        $user = User::create([
            'name'     => $username,
            'email'    => $email,
            'password' => Hash::make($validated['password']),
            'role'     => $role,
            'active'   => true,
        ]);

        $token = $user->createToken('wb_api_token', ['*'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account registered successfully.',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'user'       => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'role'   => $user->role,
                    'active' => $user->active,
                ],
            ],
        ], 201);
    }

    /**
     * POST /api/v1/auth/logout
     *
     * Revokes the current request's Sanctum token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully. Token revoked.',
        ], 200);
    }

    /**
     * GET /api/v1/auth/user
     *
     * Returns the currently authenticated user's profile.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'active'     => $user->active ?? true,
                'created_at' => $user->created_at,
            ],
        ], 200);
    }
}
