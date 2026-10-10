<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->string('batch_id', 36)->primary();
            $table->string('product_id', 36);
            $table->foreign('product_id')
                  ->references('product_id')
                  ->on('products')
                  ->onDelete('cascade');

            $table->string('batch_number')->unique()
                  ->comment('Human-readable lot ID e.g. BATCH-2026-004');
            $table->date('date_received')
                  ->comment('Warehouse receipt date — FIFO ordering anchor');
            $table->date('expiry_date')->nullable()->index()
                  ->comment('NULL for non-perishable; 270 days from receipt for Class C filters');
            $table->integer('quantity_received')
                  ->comment('Original units received in this lot');
            $table->integer('quantity_remains')
                  ->comment('Units still available in this lot after picks');
            $table->string('bin_location', 50)
                  ->comment('Gravity rack code e.g. RACK-C-01');
            $table->timestamps();

            // Composite index for efficient FIFO queries on perishable products
            $table->index(['product_id', 'expiry_date', 'date_received']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
