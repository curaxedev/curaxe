<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Risposte JSON uniformi per l'API v1.
 *
 * Convenzioni:
 * - successo: payload della risorsa (o `{ data: ... }` per le Resource) con 200/201/202/204;
 * - errore: `{ message, errors? }` come il formato nativo Laravel, così il
 *   client HTTP frontend (`src/lib/http.ts`) normalizza tutto allo stesso modo.
 */
final class ApiResponse
{
    public static function message(string $message, int $status = 200): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }

    public static function accepted(string $message): JsonResponse
    {
        return self::message($message, 202);
    }

    public static function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    /**
     * @param  array<string, list<string>>  $errors
     * @param  string|null  $errorCode  Codice macchina che il frontend mappa sulle classi `*Error` di dominio.
     */
    public static function error(string $message, int $status, array $errors = [], ?string $errorCode = null): JsonResponse
    {
        $payload = ['message' => $message];
        if ($errorCode !== null) {
            $payload['error_code'] = $errorCode;
        }
        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
