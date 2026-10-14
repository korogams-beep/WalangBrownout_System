<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'type')) {
                $table->string('type', 32)->nullable()->after('transaction_type');
            }
            if (!Schema::hasColumn('transactions', 'status')) {
                $table->string('status', 32)->default('Open')->after('type');
            }
            if (!Schema::hasColumn('transactions', 'quantity')) {
                $table->integer('quantity')->default(0)->after('status');
            }
            if (!Schema::hasColumn('transactions', 'location')) {
                $table->string('location', 100)->nullable()->after('quantity');
            }
            if (!Schema::hasColumn('transactions', 'expiry_date')) {
                $table->date('expiry_date')->nullable()->after('location');
            }
            if (!Schema::hasColumn('transactions', 'supplier_id')) {
                $table->string('supplier_id', 36)->nullable()->after('expiry_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['type', 'status', 'quantity', 'location', 'expiry_date', 'supplier_id'] as $col) {
                if (Schema::hasColumn('transactions', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
