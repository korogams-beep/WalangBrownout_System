<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->string('product_id', 36)->primary(); // e.g. AC-PORT-01, FILT-CARBON-01
            $table->string('name');
            $table->string('sku')->unique();
            $table->enum('abc_class', ['A', 'B', 'C'])
                  ->comment('A: High Value/Seasonal, B: Moderate, C: Low Value/Perishable');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('unit_cost', 10, 2);
            $table->boolean('is_perishable')->default(false)
                  ->comment('TRUE for Class C carbon replacement filters');
            $table->boolean('is_seasonal')->default(false)
                  ->comment('TRUE for Portable AC units with monthly demand spikes');
            $table->integer('shelf_life_days')->nullable()
                  ->comment('270 days for Class C Carbon Filters');
            $table->integer('supplier_lead_time_days')->default(14)
                  ->comment('Days from PO to warehouse receipt');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
