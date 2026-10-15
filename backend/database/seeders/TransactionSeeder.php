<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class TransactionSeeder extends Seeder
{
    /**
     * Seeds the initial demonstration transactions into MySQL.
     */
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first() ?? User::first();
        $adminId = $admin ? $admin->id : 1;

        $batch = Batch::where('product_id', 'CLEAN-AC-01')->first();
        $batchId = $batch ? $batch->batch_id : null;

        $transactions = [
            [
                'transaction_id'   => 'TXN-2026-001',
                'product_id'       => 'AC-PORT-01',
                'user_id'          => $adminId,
                'transaction_type' => 'RECEIVE',
                'type'             => 'Orders',
                'status'           => 'Completed',
                'quantity'         => 45,
                'quantity_changed' => 45,
                'location'         => 'RACK-A-01',
                'supplier_id'      => 'SUP-001',
                'reference_number' => 'PO-2026-001',
                'notes'            => 'Initial stock receipt for Portable Air Conditioner 1.0HP.',
                'created_at'       => now()->subDays(5),
                'updated_at'       => now()->subDays(5),
            ],
            [
                'transaction_id'   => 'TXN-2026-002',
                'product_id'       => 'PURIF-AIR-01',
                'user_id'          => $adminId,
                'transaction_type' => 'RECEIVE',
                'type'             => 'Orders',
                'status'           => 'Completed',
                'quantity'         => 30,
                'quantity_changed' => 30,
                'location'         => 'RACK-B-01',
                'supplier_id'      => 'SUP-002',
                'reference_number' => 'PO-2026-002',
                'notes'            => 'Initial stock receipt for HEPA Air Purifier.',
                'created_at'       => now()->subDays(4),
                'updated_at'       => now()->subDays(4),
            ],
            [
                'transaction_id'   => 'TXN-2026-003',
                'product_id'       => 'CLEAN-AC-01',
                'batch_id'         => $batchId,
                'user_id'          => $adminId,
                'transaction_type' => 'RECEIVE',
                'type'             => 'Orders',
                'status'           => 'Completed',
                'quantity'         => 50,
                'quantity_changed' => 50,
                'location'         => 'RACK-C-01',
                'expiry_date'      => now()->addDays(270)->toDateString(),
                'supplier_id'      => 'SUP-001',
                'reference_number' => 'PO-2026-003',
                'notes'            => 'Initial Class C lot receipt in Cold Storage.',
                'created_at'       => now()->subDays(3),
                'updated_at'       => now()->subDays(3),
            ],
            [
                'transaction_id'   => 'TXN-2026-004',
                'product_id'       => 'AC-PORT-01',
                'user_id'          => $adminId,
                'transaction_type' => 'COMMIT',
                'type'             => 'Sale',
                'status'           => 'Processing',
                'quantity'         => 2,
                'quantity_changed' => -2,
                'reference_number' => 'SO-2026-001',
                'notes'            => 'Customer online sales order in progress.',
                'created_at'       => now()->subHours(6),
                'updated_at'       => now()->subHours(6),
            ],
        ];

        foreach ($transactions as $txn) {
            Transaction::updateOrCreate(
                ['transaction_id' => $txn['transaction_id']],
                $txn
            );
        }

        $this->command->info('  Transactions seeded: 4 representative records loaded in MySQL.');
    }
}
