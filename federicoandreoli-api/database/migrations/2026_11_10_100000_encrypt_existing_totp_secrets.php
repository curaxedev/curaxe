<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cifra i totp_secret già in chiaro. Idempotente: salta valori già cifrati.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'totp_secret')) {
            return;
        }

        $rows = DB::table('users')->whereNotNull('totp_secret')->where('totp_secret', '!=', '')->get(['id', 'totp_secret']);
        foreach ($rows as $row) {
            $raw = (string) $row->totp_secret;
            try {
                Crypt::decryptString($raw);
                // già cifrato
                continue;
            } catch (\Throwable) {
                // plaintext → cifra
            }
            DB::table('users')->where('id', $row->id)->update([
                'totp_secret' => Crypt::encryptString($raw),
            ]);
        }
    }

    public function down(): void
    {
        // Non ripristiniamo plaintext (irreversibile per design).
    }
};
