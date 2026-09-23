<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('comune', 120)->default('');
            $table->string('cap', 10)->default('');
            $table->string('address')->default('');
            $table->string('phone')->default('');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['organization_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_locations');
    }
};
