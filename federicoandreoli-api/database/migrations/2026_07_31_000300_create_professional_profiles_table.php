<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Identità
            $table->string('first_name', 100)->default('');
            $table->string('last_name', 100)->default('');
            $table->string('professional_title')->default('');
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->string('nationality', 100)->default('');
            $table->text('bio')->nullable();
            $table->string('photo_path')->nullable();

            // Dati professionali
            $table->string('category', 100)->default('');
            $table->string('experience_years', 50)->default('');
            $table->json('specializations');
            $table->json('languages');
            $table->boolean('has_license')->default(false);
            $table->boolean('has_car')->default(false);

            // Disponibilità
            $table->json('employment_types');
            $table->json('days');
            $table->json('shifts');
            $table->string('available_from', 20)->default('');

            // Tariffe
            $table->decimal('hourly_rate', 8, 2)->default(0);
            $table->decimal('monthly_live_in_rate', 10, 2)->default(0);

            // Zone
            $table->json('zones');
            $table->string('primary_zone')->default('');
            $table->boolean('available_to_move')->default(false);

            $table->json('certifications');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_profiles');
    }
};
