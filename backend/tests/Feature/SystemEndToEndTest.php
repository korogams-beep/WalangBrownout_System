<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\Batch;
use App\Models\Supplier;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class SystemEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed 4 official accounts
        $this->admin = User::create([
            'name'     => 'Ais',
            'email'    => 'ais@walangbrownout.com',
            'password' => bcrypt('Admin@WB2026!'),
            'role'     => 'admin',
            'active'   => true,
        ]);

        $this->manager = User::create([
            'name'     => 'Brent',
            'email'    => 'brent@walangbrownout.com',
            'password' => bcrypt('WB@Pnc2026!'),
            'role'     => 'manager',
            'active'   => true,
        ]);

        $this->staff = User::create([
            'name'     => 'Emerson',
            'email'    => 'emerson@walangbrownout.com',
            'password' => bcrypt('Staff@WB2026!'),
            'role'     => 'staff',
            'active'   => true,
        ]);

        User::create([
            'name'     => 'Ezra',
            'email'    => 'ezra@walangbrownout.com',
            'password' => bcrypt('Staff@WB2026!'),
            'role'     => 'staff',
            'active'   => true,
        ]);

        // Seed 2 core products
        $p1 = Product::create([
            'product_id'              => 'AC-PORT-01',
            'name'                    => 'Portable Air Conditioner 1.0HP',
            'sku'                     => 'WB-AC-PORT-010HP',
            'abc_class'               => 'A',
            'unit_price'              => 18500.00,
            'unit_cost'               => 13200.00,
            'is_perishable'           => false,
            'is_seasonal'             => true,
            'supplier_lead_time_days' => 14,
        ]);
        Inventory::create([
            'product_id'         => $p1->product_id,
            'quantity_on_hand'   => 45,
            'quantity_committed' => 0,
            'safety_stock'       => 20,
        ]);

        $p2 = Product::create([
            'product_id'              => 'FILT-HEPA-01',
            'name'                    => 'HEPA Replacement Filter (30sqm)',
            'sku'                     => 'WB-FILT-HEPA-30',
            'abc_class'               => 'C',
            'unit_price'              => 899.00,
            'unit_cost'               => 520.00,
            'is_perishable'           => true,
            'shelf_life_days'         => 270,
            'supplier_lead_time_days' => 14,
        ]);
        Inventory::create([
            'product_id'         => $p2->product_id,
            'quantity_on_hand'   => 30,
            'quantity_committed' => 0,
            'safety_stock'       => 15,
        ]);
        Batch::create([
            'batch_id'          => 'BATCH-FILT-001',
            'product_id'        => $p2->product_id,
            'batch_number'      => 'LOT-HEPA-01',
            'date_received'     => now()->subDays(10)->toDateString(),
            'expiry_date'       => now()->addDays(260)->toDateString(),
            'quantity_received' => 30,
            'quantity_remains'  => 30,
            'bin_location'      => 'Cold Storage A-1',
        ]);
    }

    /** 1. Authentication flow tests */
    public function test_auth_login_success_and_failures(): void
    {
        // Success login with username
        $res = $this->postJson('/api/v1/auth/login', [
            'username' => 'Ais',
            'password' => 'Admin@WB2026!',
        ]);
        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('data.token'));
        $this->assertEquals('admin', $res->json('data.user.role'));

        // Wrong password rejection
        $failRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'Ais',
            'password' => 'WrongPassword123!',
        ]);
        $failRes->assertStatus(422);

        // Deactivated user rejection
        $this->staff->update(['active' => false]);
        $deactRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'Emerson',
            'password' => 'Staff@WB2026!',
        ]);
        $deactRes->assertStatus(403);
    }

    /** 2. Public products catalog & diagnostic landing tests */
    public function test_public_catalog_access(): void
    {
        // Unauthenticated GET /api/v1/products must return 200 with catalog
        $res = $this->getJson('/api/v1/products');
        $res->assertStatus(200);
        $res->assertJsonFragment(['name' => 'Portable Air Conditioner 1.0HP']);

        // Health check endpoint
        $healthRes = $this->getJson('/api/v1/health');
        $healthRes->assertStatus(200);
        $this->assertEquals('ok', $healthRes->json('status'));
    }

    /** 3. Account management flow */
    public function test_account_crud_and_permanent_delete(): void
    {
        Sanctum::actingAs($this->admin);

        // Add user
        $addRes = $this->postJson('/api/v1/users', [
            'name'     => 'TemporaryStaff',
            'password' => 'TempPass2026!',
            'role'     => 'staff',
            'email'    => 'temp@walangbrownout.com',
        ]);
        $addRes->assertStatus(201);
        $newId = $addRes->json('data.id');

        // Edit user
        $editRes = $this->putJson("/api/v1/users/{$newId}", [
            'name' => 'RenamedStaff',
            'role' => 'manager',
        ]);
        $editRes->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $newId, 'name' => 'RenamedStaff', 'role' => 'manager']);

        // Delete user
        $delRes = $this->deleteJson("/api/v1/users/{$newId}");
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $newId]);

        // Attempt login with deleted user must fail
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'RenamedStaff',
            'password' => 'TempPass2026!',
        ]);
        $loginRes->assertStatus(422);
    }

    /** 4. Product CRUD & inventory sync flow */
    public function test_product_crud_with_custom_id_and_inventory_sync(): void
    {
        Sanctum::actingAs($this->admin);

        // Add product with custom ID
        $addRes = $this->postJson('/api/v1/products', [
            'product_id'    => 'PURIF-CUSTOM-01',
            'name'          => 'Smart Air Purifier 50sqm',
            'sku'           => 'WB-PURIF-50',
            'abc_class'     => 'B',
            'unit_price'    => 12999.00,
            'unit_cost'     => 8500.00,
            'initial_stock' => 25,
            'is_perishable' => false,
        ]);
        $addRes->assertStatus(201);
        $this->assertDatabaseHas('products', ['product_id' => 'PURIF-CUSTOM-01']);
        $this->assertDatabaseHas('inventories', ['product_id' => 'PURIF-CUSTOM-01', 'quantity_on_hand' => 25]);

        // Edit product price and stock on hand
        $editRes = $this->putJson('/api/v1/products/PURIF-CUSTOM-01', [
            'unit_price'  => 13499.00,
            'qty_on_hand' => 28,
        ]);
        $editRes->assertStatus(200);
        $this->assertDatabaseHas('products', ['product_id' => 'PURIF-CUSTOM-01', 'unit_price' => 13499.00]);
        $this->assertDatabaseHas('inventories', ['product_id' => 'PURIF-CUSTOM-01', 'quantity_on_hand' => 28]);

        // Delete product
        $delRes = $this->deleteJson('/api/v1/products/PURIF-CUSTOM-01');
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('products', ['product_id' => 'PURIF-CUSTOM-01']);
        $this->assertDatabaseMissing('inventories', ['product_id' => 'PURIF-CUSTOM-01']);
    }

    /** 5. Transaction lifecycle (Orders, Sale, Returns) flow */
    public function test_transaction_lifecycle_and_stock_progression(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. Create Sale transaction (should reserve / commit stock)
        $saleRes = $this->postJson('/api/v1/transactions', [
            'type'      => 'Sale',
            'productId' => 'AC-PORT-01',
            'qty'       => 5,
            'status'    => 'Open',
        ]);
        $saleRes->assertStatus(201);
        $saleId = $saleRes->json('data.id');
        $this->assertDatabaseHas('inventories', ['product_id' => 'AC-PORT-01', 'quantity_committed' => 5]);

        // 2. Advance Sale to Shipped (should decrement on hand and committed)
        $shipRes = $this->putJson("/api/v1/transactions/{$saleId}", [
            'status' => 'Shipped',
        ]);
        $shipRes->assertStatus(200);
        $this->assertDatabaseHas('inventories', [
            'product_id'         => 'AC-PORT-01',
            'quantity_on_hand'   => 40, // 45 - 5
            'quantity_committed' => 0,  // committed released
        ]);

        // 3. Create Orders transaction for perishable item
        $orderRes = $this->postJson('/api/v1/transactions', [
            'type'       => 'Orders',
            'productId'  => 'FILT-HEPA-01',
            'qty'        => 20,
            'status'     => 'Open',
            'expiryDate' => now()->addDays(200)->toDateString(),
            'location'   => 'Cold Storage Bay 2',
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');

        // 4. Advance Order to Received (should increase stock on hand and create batch)
        $recvRes = $this->putJson("/api/v1/transactions/{$orderId}", [
            'status' => 'Received',
        ]);
        $recvRes->assertStatus(200);
        $this->assertDatabaseHas('inventories', [
            'product_id'       => 'FILT-HEPA-01',
            'quantity_on_hand' => 50, // 30 + 20
        ]);

        // 5. Delete transaction
        $delRes = $this->deleteJson("/api/v1/transactions/{$orderId}");
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('transactions', ['transaction_id' => $orderId]);
    }

    /** 6. Supplier management flow */
    public function test_supplier_crud(): void
    {
        Sanctum::actingAs($this->admin);

        // Add
        $addRes = $this->postJson('/api/v1/suppliers', [
            'name'          => 'Global Appliance Parts Inc.',
            'contactPerson' => 'Robert Johnson',
            'phone'         => '09181112233',
            'email'         => 'robert@globalparts.com',
            'address'       => 'Pasig City',
        ]);
        $addRes->assertStatus(201);
        $supId = $addRes->json('data.id');

        // Edit
        $editRes = $this->putJson("/api/v1/suppliers/{$supId}", [
            'phone' => '09189998877',
        ]);
        $editRes->assertStatus(200);
        $this->assertDatabaseHas('suppliers', ['id' => $supId, 'phone' => '09189998877']);

        // Delete
        $delRes = $this->deleteJson("/api/v1/suppliers/{$supId}");
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('suppliers', ['id' => $supId]);
    }

    /** 7. FIFO Oldest Batch selection */
    public function test_fifo_oldest_batch(): void
    {
        Sanctum::actingAs($this->staff);

        $res = $this->getJson('/api/v1/batches/oldest/FILT-HEPA-01');
        $res->assertStatus(200);
        $this->assertEquals('BATCH-FILT-001', $res->json('data.batch_id'));
    }
}
