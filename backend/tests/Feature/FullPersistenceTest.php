<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\Inventory;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FullPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::firstOrCreate(
            ['name' => 'Ais'],
            [
                'email'    => 'ais@walangbrownout.com',
                'password' => bcrypt('Admin@WB2026!'),
                'role'     => 'admin',
                'active'   => true,
            ]
        );
        Sanctum::actingAs($this->admin);
    }

    public function test_supplier_add_edit_delete_persistence(): void
    {
        // 1. ADD
        $addResponse = $this->postJson('/api/v1/suppliers', [
            'name'          => 'Test Supplier Co.',
            'contactPerson' => 'Maria Clara',
            'phone'         => '09991234567',
            'email'         => 'maria@testsupplier.com',
            'address'       => 'Makati City',
        ]);
        $addResponse->assertStatus(201);
        $supplierId = $addResponse->json('data.id');
        $this->assertNotNull($supplierId);
        $this->assertDatabaseHas('suppliers', ['id' => $supplierId, 'name' => 'Test Supplier Co.']);

        // 2. EDIT
        $editResponse = $this->putJson("/api/v1/suppliers/{$supplierId}", [
            'name'          => 'Updated Supplier Co.',
            'contactPerson' => 'Maria Santos',
            'phone'         => '09997654321',
        ]);
        $editResponse->assertStatus(200);
        $this->assertDatabaseHas('suppliers', ['id' => $supplierId, 'name' => 'Updated Supplier Co.', 'contact_person' => 'Maria Santos']);

        // 3. DELETE
        $delResponse = $this->deleteJson("/api/v1/suppliers/{$supplierId}");
        $delResponse->assertStatus(200);
        $this->assertDatabaseMissing('suppliers', ['id' => $supplierId]);
    }

    public function test_product_add_edit_delete_persistence(): void
    {
        $testPid = 'TEST-PROD-01';
        // 1. ADD
        $addResponse = $this->postJson('/api/v1/products', [
            'product_id'    => $testPid,
            'name'          => 'Smart Portable AC Unit',
            'sku'           => 'WB-SMART-AC-01',
            'abc_class'     => 'A',
            'unit_price'    => 24999.00,
            'unit_cost'     => 17500.00,
            'initial_stock' => 12,
            'is_perishable' => false,
            'is_seasonal'   => true,
        ]);
        $addResponse->assertStatus(201);
        $this->assertDatabaseHas('products', ['product_id' => $testPid, 'name' => 'Smart Portable AC Unit']);
        $this->assertDatabaseHas('inventories', ['product_id' => $testPid, 'quantity_on_hand' => 12]);

        // 2. EDIT
        $editResponse = $this->putJson("/api/v1/products/{$testPid}", [
            'name'         => 'Smart Portable AC Unit Pro',
            'unit_price'   => 26999.00,
            'qty_on_hand'  => 15,
        ]);
        $editResponse->assertStatus(200);
        $this->assertDatabaseHas('products', ['product_id' => $testPid, 'name' => 'Smart Portable AC Unit Pro']);
        $this->assertDatabaseHas('inventories', ['product_id' => $testPid, 'quantity_on_hand' => 15]);

        // 3. DELETE
        $delResponse = $this->deleteJson("/api/v1/products/{$testPid}");
        $delResponse->assertStatus(200);
        $this->assertDatabaseMissing('products', ['product_id' => $testPid]);
        $this->assertDatabaseMissing('inventories', ['product_id' => $testPid]);
    }

    public function test_transaction_add_edit_delete_persistence(): void
    {
        // First create a product
        $product = Product::create([
            'product_id'  => 'TXN-TEST-PROD',
            'name'        => 'Transaction Test Product',
            'sku'         => 'TXN-TEST-SKU',
            'abc_class'   => 'B',
            'unit_price'  => 5000,
            'unit_cost'   => 3500,
        ]);
        Inventory::create([
            'product_id'         => $product->product_id,
            'quantity_on_hand'   => 50,
            'quantity_committed' => 0,
            'safety_stock'       => 10,
        ]);

        // 1. ADD Transaction
        $addResponse = $this->postJson('/api/v1/transactions', [
            'type'      => 'Orders',
            'productId' => $product->product_id,
            'qty'       => 10,
            'status'    => 'Open',
            'location'  => 'Bay 4',
        ]);
        $addResponse->assertStatus(201);
        $txnId = $addResponse->json('data.id');
        $this->assertNotNull($txnId);
        $this->assertDatabaseHas('transactions', [
            'transaction_id' => $txnId,
            'product_id'     => $product->product_id,
            'type'           => 'Orders',
            'status'         => 'Open',
            'quantity'       => 10,
        ]);

        // 2. EDIT (Advance status)
        $editResponse = $this->putJson("/api/v1/transactions/{$txnId}", [
            'status'   => 'Received',
            'quantity' => 10,
        ]);
        $editResponse->assertStatus(200);
        $this->assertDatabaseHas('transactions', [
            'transaction_id' => $txnId,
            'status'         => 'Received',
        ]);

        // 3. DELETE
        $delResponse = $this->deleteJson("/api/v1/transactions/{$txnId}");
        $delResponse->assertStatus(200);
        $this->assertDatabaseMissing('transactions', ['transaction_id' => $txnId]);
    }
}
