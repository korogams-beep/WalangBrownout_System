<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * GET /api/v1/users
     *
     * Returns list of all accounts for Account Management.
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'active', 'created_at')
                     ->orderBy('id', 'asc')
                     ->get();

        return response()->json([
            'success' => true,
            'data'    => $users,
            'total'   => $users->count(),
        ], 200);
    }

    /**
     * POST /api/v1/users
     *
     * Creates a new user in the MySQL database.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'nullable|email|max:150',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:admin,manager,staff',
            'active'   => 'nullable|boolean',
        ]);

        $username = trim($validated['name']);
        $rawEmail = isset($validated['email']) ? trim($validated['email']) : '';
        $email = !empty($rawEmail)
            ? $rawEmail
            : strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', $username)) . '@walangbrownout.com';

        // Check if username or email already exists
        if (User::where('name', $username)->orWhere('email', $email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'An account with this username or email already exists.',
            ], 422);
        }

        $user = User::create([
            'name'     => $username,
            'email'    => $email,
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'],
            'active'   => $validated['active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data'    => $user,
        ], 201);
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $user,
        ], 200);
    }

    /**
     * PUT/PATCH /api/v1/users/{id}
     *
     * Updates an existing user's role, active status, name, or password.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'     => 'nullable|string|max:100',
            'role'     => 'nullable|in:admin,manager,staff',
            'active'   => 'nullable|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        // Prevent deactivating own account
        if (isset($validated['active']) && !$validated['active'] && $request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot deactivate your own logged-in account.',
            ], 422);
        }

        if (isset($validated['name'])) {
            $newName = trim($validated['name']);
            if (empty($newName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Username cannot be blank.',
                ], 422);
            }
            if (User::where('name', $newName)->where('id', '!=', $user->id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Username "' . $newName . '" is already taken.',
                ], 422);
            }
            $user->name = $newName;
        }
        if (isset($validated['role'])) {
            $user->role = $validated['role'];
        }
        if (isset($validated['active'])) {
            $user->active = (bool) $validated['active'];
        }
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data'    => $user,
        ], 200);
    }

    /**
     * DELETE /api/v1/users/{id}
     *
     * Removes an account from MySQL.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent self-deletion
        if ($request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own logged-in account.',
            ], 422);
        }

        // Prevent deletion of primary system administrator
        if ($user->email === 'ais@walangbrownout.com' || strtolower($user->name) === 'ais') {
            return response()->json([
                'success' => false,
                'message' => 'The default system administrator account ("Ais") cannot be deleted.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ], 200);
    }
}
