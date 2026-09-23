<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use Stripe\StripeClient;

class StripeClientFactory
{
    public function make(?BillingSetting $settings = null): ?StripeClient
    {
        $settings ??= BillingSetting::current();
        $secret = $settings->decryptedSecretKey();
        if ($secret === null || $secret === '') {
            return null;
        }

        return new StripeClient($secret);
    }

    public function requireClient(?BillingSetting $settings = null): StripeClient
    {
        $client = $this->make($settings);
        if ($client === null) {
            throw new \RuntimeException('Stripe non configurato. Completa la procedura guidata Pagamenti.');
        }

        return $client;
    }
}
