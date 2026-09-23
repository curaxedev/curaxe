<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\Stripe\StripeWebhookProcessor;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StripeWebhookController
{
    public function __construct(
        private readonly StripeWebhookProcessor $processor,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');

        try {
            $result = $this->processor->handle($payload, $signature);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'not_configured');
        } catch (\InvalidArgumentException $e) {
            $code = str_contains($e->getMessage(), 'Firma') ? 'invalid_signature' : 'invalid_payload';

            return ApiResponse::error($e->getMessage(), 400, [], $code);
        }

        return response()->json($result);
    }
}
