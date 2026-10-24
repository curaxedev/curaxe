<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use Stripe\Exception\ApiErrorException;

/**
 * Crea/aggiorna Product + Price Stripe dal catalogo piani Curaxe.
 * I Price Stripe sono immutabili: se cambia importo/intervallo si crea un nuovo Price.
 */
final class StripePlanCatalogSyncService
{
    public function __construct(
        private readonly StripeClientFactory $clients,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $plans
     * @return list<array<string, mixed>>
     *
     * @throws \RuntimeException|\InvalidArgumentException
     */
    public function ensurePrices(BillingSetting $settings, array $plans): array
    {
        $client = $this->clients->make($settings);
        if ($client === null) {
            return $plans;
        }

        $out = [];
        foreach ($plans as $plan) {
            $out[] = $this->ensureOne($client, $plan);
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $plan
     * @return array<string, mixed>
     */
    private function ensureOne(\Stripe\StripeClient $client, array $plan): array
    {
        $key = trim((string) ($plan['key'] ?? ''));
        $label = trim((string) ($plan['label'] ?? $key));
        $amountCents = (int) ($plan['amountCents'] ?? 0);
        $currency = strtolower((string) ($plan['currency'] ?? 'eur'));
        $interval = (string) ($plan['interval'] ?? 'month');
        if (! in_array($interval, ['month', 'year'], true)) {
            $interval = 'month';
        }

        $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
        $productId = isset($plan['stripeProductId']) ? trim((string) $plan['stripeProductId']) : '';

        if ($priceId !== '' && str_starts_with($priceId, 'price_')) {
            try {
                $existing = $client->prices->retrieve($priceId);
                $sameAmount = (int) ($existing->unit_amount ?? -1) === $amountCents;
                $sameInterval = (string) ($existing->recurring->interval ?? '') === $interval;
                $sameCurrency = strtolower((string) ($existing->currency ?? '')) === $currency;
                if ($sameAmount && $sameInterval && $sameCurrency) {
                    if ($productId === '' && is_string($existing->product)) {
                        $plan['stripeProductId'] = $existing->product;
                    }

                    return $plan;
                }
                // Importo/intervallo diversi → nuovo Price sullo stesso Product.
                if ($productId === '' && is_string($existing->product)) {
                    $productId = $existing->product;
                }
            } catch (ApiErrorException) {
                // Price assente/invalido → ricrea sotto.
                $priceId = '';
            }
        }

        if ($amountCents <= 0) {
            // Piano gratuito / placeholder: niente Price Stripe.
            $plan['stripePriceId'] = null;

            return $plan;
        }

        try {
            if ($productId === '' || ! str_starts_with($productId, 'prod_')) {
                $product = $client->products->create([
                    'name' => 'Curaxe · '.$label,
                    'metadata' => [
                        'curaxe_plan_key' => $key,
                        'curaxe_audience' => (string) ($plan['audience'] ?? ''),
                    ],
                ]);
                $productId = $product->id;
            } else {
                try {
                    $client->products->update($productId, [
                        'name' => 'Curaxe · '.$label,
                        'metadata' => [
                            'curaxe_plan_key' => $key,
                            'curaxe_audience' => (string) ($plan['audience'] ?? ''),
                        ],
                    ]);
                } catch (ApiErrorException) {
                    $product = $client->products->create([
                        'name' => 'Curaxe · '.$label,
                        'metadata' => [
                            'curaxe_plan_key' => $key,
                            'curaxe_audience' => (string) ($plan['audience'] ?? ''),
                        ],
                    ]);
                    $productId = $product->id;
                }
            }

            $price = $client->prices->create([
                'product' => $productId,
                'unit_amount' => $amountCents,
                'currency' => $currency,
                'recurring' => ['interval' => $interval],
                'nickname' => $label.' · '.$interval,
                'metadata' => [
                    'curaxe_plan_key' => $key,
                    'curaxe_audience' => (string) ($plan['audience'] ?? ''),
                ],
            ]);

            $plan['stripeProductId'] = $productId;
            $plan['stripePriceId'] = $price->id;
        } catch (ApiErrorException $e) {
            throw new \RuntimeException(
                'Stripe non ha creato il Price per «'.$label.'»: '.$e->getMessage(),
                0,
                $e,
            );
        }

        return $plan;
    }
}
