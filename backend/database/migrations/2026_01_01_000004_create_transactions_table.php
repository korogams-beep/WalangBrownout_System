<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('transaction_id')->primary();

            $table->string('product_id', 36);
            $table->foreign('product_id')
                  ->references('product_id')
                  ->on('products')
                  ->onDelete('cascade');

            $table->string('batch_id', 36)->nullable()
                  ->comment('NULL for COMMIT and ADJUST types; populated on PICK');
            $table->foreign('batch_id')
                  ->references('batch_id')
                  ->on('batches')
                  ->onDelete('set null');

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->comment('Staff or admin who performed the transaction');

            $table->enum('transaction_type', ['RECEIVE', 'COMMIT', 'PICK', 'ADJUST'])
                  ->comment('RECEIVE: stock in | COMMIT: online reservation | PICK: warehouse fulfillment | ADJUST: cycle count');

            $table->integer('quantity_changed')
                  ->comment('Positive = stock in, Negative = stock out');

            $table->string('reference_number')->nullable()
                  ->comment('Order ID, Purchase Order ID, or Audit ID');

            $table->text('notes')->nullable()
                  ->comment('Forensic audit notes, FIFO violations, variance reasons');

            $table->timestamps();

            // Composite index for transaction history queries per product
            $table->index(['product_id', 'transaction_type']);
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
