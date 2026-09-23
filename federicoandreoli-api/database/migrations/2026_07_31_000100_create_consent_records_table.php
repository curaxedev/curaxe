<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registro consensi GDPR append-only: l'ultimo record per utente è quello vigente.
        Schema::create('consent_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('termini');
            $table->boolean('privacy');
            $table->boolean('maggiorenne');
            $table->boolean('comunicazioni')->default(false);
            $table->boolean('profilazione')->default(false);
            $table->string('version', 16);
            $table->string('source', 16); // registration | settings
            $table->timestamps();

            $table->index(['user_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consent_records');
    }
};
