<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->string('id', 36)->primary(); // e.g. SUP-001
                $table->string('name');
                $table->string('contact_person')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->text('address')->nullable();
                $table->timestamps();
            });

            // Seed initial default suppliers
            DB::table('suppliers')->insert([
                [
                    'id'             => 'SUP-001',
                    'name'           => 'CoolAire Distributors',
                    'contact_person' => 'Juan dela Cruz',
                    'phone'          => '09171234567',
                    'email'          => 'juan@coolairedist.com',
                    'address'        => 'Quezon City, Metro Manila',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ],
                [
                    'id'             => 'SUP-002',
                    'name'           => 'PureBreeze Supply Co.',
                    'contact_person' => 'Maria Santos',
                    'phone'          => '09281234567',
                    'email'          => 'maria@purebreeze.ph',
                    'address'        => 'Cebu City, Cebu',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
