<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventories', function (Blueprint $table) {
            $table->string('product_id', 36)->primary();
            $table->foreign('product_id')
                  ->references('product_id')
                  ->on('products')
                  ->onDelete('cascade');

            $table->integer('quantity_on_hand')->default(0)
                  ->comment('Physical units currently in the warehouse');
            $table->integer('quantity_committed')->default(0)
                  ->comment('Units reserved by online checkouts not yet physically picked');
            $table->integer('safety_stock')->default(10)
                  ->comment('Buffer stock: (d_max * LT_max) - (d_avg * LT_avg)');
            $table->timestamps();

            // ATP = quantity_on_hand - quantity_committed (computed in PHP, not stored)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
