<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20); // agency | facility
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('role_label')->default('');
            $table->text('bio')->nullable();
            $table->string('coverage_hint')->default('');
            $table->string('image_url')->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->boolean('is_online')->default(true);
            $table->boolean('is_published')->default(true);
            $table->string('comune', 120)->default('');
            $table->string('cap', 10)->default('');
            $table->string('regione', 120)->default('');
            $table->string('istat', 20)->default('');
            $table->string('location_label')->default('');
            $table->string('shift')->nullable();
            $table->json('services');
            $table->json('branches');
            $table->timestamps();

            $table->index(['kind', 'is_published']);
            $table->index(['is_published', 'regione']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
