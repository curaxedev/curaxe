<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('slot', 32); // identita | attestati | referenze
            $table->string('original_name');
            $table->string('path');
            $table->string('mime', 100);
            $table->unsignedInteger('size_bytes');
            $table->timestamps();

            $table->index(['user_id', 'slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_documents');
    }
};
