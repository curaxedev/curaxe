<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

/**
 * Sync catalogo piani Curaxe ↔ Stripe Product/Price.
 *
 * Best practice Stripe (Prices immutabili):
 * - Non si “modifica” unit_amount/interval di un Price esistente.
 * - Se cambiano importo/valuta/intervallo → nuovo Price + lookup_key trasferita,
 *   vecchio Price archiviato (active=false), Product.default_price aggiornato.
 * - Label/feature/tagline → solo update Product (nessun nuovo Price).
 * - Piano disattivato in catalogo → archivia Price (non vendibile a nuovi checkout).
 *
 * @see https://docs.stripe.com/products-prices/manage-prices
 * @see https://docs.stripe.com/products-prices/how-products-and-prices-work
 */
final class StripePlanCatalogSyncService
{
    public function __construct(
        private readonly StripeClientFactory $clients,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $plans
     * @return list<array<string, mixed>>
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
     * Archivia i Price Stripe dei piani rimossi dal catalogo (non più referenziati).
     *
     * @param  list<array<string, mixed>>  $previousPlans
     * @param  list<array<string, mixed>>  $nextPlans
     */
    public function archiveRemovedPlanPrices(
        BillingSetting $settings,
        array $previousPlans,
        array $nextPlans,
    ): void {
        $client = $this->clients->make($settings);
        if ($client === null) {
            return;
        }

        $nextKeys = [];
        foreach ($nextPlans as $plan) {
            $key = trim((string) ($plan['key'] ?? ''));
            if ($key !== '') {
                $nextKeys[$key] = true;
            }
        }

        foreach ($previousPlans as $plan) {
            $key = trim((string) ($plan['key'] ?? ''));
            if ($key === '' || isset($nextKeys[$key])) {
                continue;
            }
            $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
            if ($priceId !== '' && str_starts_with($priceId, 'price_')) {
                $this->archivePrice($client, $priceId);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $plan
     * @return array<string, mixed>
     */
    private function ensureOne(StripeClient $client, array $plan): array
    {
        $key = trim((string) ($plan['key'] ?? ''));
        $label = trim((string) ($plan['label'] ?? $key));
        $amountCents = (int) ($plan['amountCents'] ?? 0);
        $currency = strtolower((string) ($plan['currency'] ?? 'eur'));
        $interval = (string) ($plan['interval'] ?? 'month');
        if (! in_array($interval, ['month', 'year'], true)) {
            $interval = 'month';
        }
        $planActive = (bool) ($plan['active'] ?? true);
        $audience = (string) ($plan['audience'] ?? '');

        $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
        $productId = isset($plan['stripeProductId']) ? trim((string) $plan['stripeProductId']) : '';
        $lookupKey = $this->lookupKeyFor($key, $interval);

        if ($amountCents <= 0) {
            // Piano gratuito: nessun Price Stripe; archivia eventuale Price precedente.
            if ($priceId !== '' && str_starts_with($priceId, 'price_')) {
                $this->archivePrice($client, $priceId);
            }
            $plan['stripePriceId'] = null;

            return $plan;
        }

        $existingPrice = null;
        if ($priceId !== '' && str_starts_with($priceId, 'price_')) {
            try {
                $existingPrice = $client->prices->retrieve($priceId);
                if ($productId === '' && is_string($existingPrice->product)) {
                    $productId = $existingPrice->product;
                    $plan['stripeProductId'] = $productId;
                }
            } catch (ApiErrorException) {
                $existingPrice = null;
                $priceId = '';
            }
        }

        $productId = $this->ensureProduct($client, $productId, $label, $key, $audience);
        $plan['stripeProductId'] = $productId;

        if ($existingPrice !== null) {
            $sameAmount = (int) ($existingPrice->unit_amount ?? -1) === $amountCents;
            $sameInterval = (string) ($existingPrice->recurring->interval ?? '') === $interval;
            $sameCurrency = strtolower((string) ($existingPrice->currency ?? '')) === $currency;

            if ($sameAmount && $sameInterval && $sameCurrency) {
                // Nessun cambio commerciale → non creare un nuovo Price.
                $this->syncExistingPriceState($client, $existingPrice->id, $planActive, $lookupKey, $label);
                $this->setProductDefaultPrice($client, $productId, $existingPrice->id, $planActive);
                $plan['stripePriceId'] = $existingPrice->id;

                return $plan;
            }

            // Importo/intervallo/valuta diversi → nuovo Price (immutabilità Stripe).
            $oldPriceId = $existingPrice->id;
            $newPrice = $this->createPrice(
                $client,
                $productId,
                $amountCents,
                $currency,
                $interval,
                $label,
                $key,
                $audience,
                $lookupKey,
            );
            $this->setProductDefaultPrice($client, $productId, $newPrice->id, $planActive);
            $this->archivePrice($client, $oldPriceId);

            $plan['stripePriceId'] = $newPrice->id;
            $plan['stripePreviousPriceId'] = $oldPriceId;

            return $plan;
        }

        // Nessun Price collegato → crea (o riusa via lookup_key se già esiste).
        $reused = $this->findActivePriceByLookupKey($client, $lookupKey);
        if ($reused !== null) {
            $sameAmount = (int) ($reused->unit_amount ?? -1) === $amountCents;
            $sameInterval = (string) ($reused->recurring->interval ?? '') === $interval;
            $sameCurrency = strtolower((string) ($reused->currency ?? '')) === $currency;
            if ($sameAmount && $sameInterval && $sameCurrency) {
                $this->syncExistingPriceState($client, $reused->id, $planActive, $lookupKey, $label);
                $this->setProductDefaultPrice($client, $productId, $reused->id, $planActive);
                $plan['stripePriceId'] = $reused->id;
                if (is_string($reused->product) && $reused->product !== '') {
                    $plan['stripeProductId'] = $reused->product;
                }

                return $plan;
            }
        }

        $newPrice = $this->createPrice(
            $client,
            $productId,
            $amountCents,
            $currency,
            $interval,
            $label,
            $key,
            $audience,
            $lookupKey,
        );
        $this->setProductDefaultPrice($client, $productId, $newPrice->id, $planActive);
        $plan['stripePriceId'] = $newPrice->id;

        return $plan;
    }

    private function ensureProduct(
        StripeClient $client,
        string $productId,
        string $label,
        string $key,
        string $audience,
    ): string {
        $payload = [
            'name' => 'Curaxe · '.$label,
            'metadata' => [
                'curaxe_plan_key' => $key,
                'curaxe_audience' => $audience,
            ],
        ];

        if ($productId !== '' && str_starts_with($productId, 'prod_')) {
            try {
                $client->products->update($productId, $payload);

                return $productId;
            } catch (ApiErrorException) {
                // ricrea sotto
            }
        }

        try {
            $product = $client->products->create($payload);

            return $product->id;
        } catch (ApiErrorException $e) {
            throw new \RuntimeException(
                'Stripe non ha creato il Product per «'.$label.'»: '.$e->getMessage(),
                0,
                $e,
            );
        }
    }

    private function createPrice(
        StripeClient $client,
        string $productId,
        int $amountCents,
        string $currency,
        string $interval,
        string $label,
        string $key,
        string $audience,
        string $lookupKey,
    ): \Stripe\Price {
        try {
            return $client->prices->create([
                'product' => $productId,
                'unit_amount' => $amountCents,
                'currency' => $currency,
                'recurring' => ['interval' => $interval],
                'nickname' => $label.' · '.$interval,
                'lookup_key' => $lookupKey,
                'transfer_lookup_key' => true,
                'metadata' => [
                    'curaxe_plan_key' => $key,
                    'curaxe_audience' => $audience,
                ],
            ]);
        } catch (ApiErrorException $e) {
            throw new \RuntimeException(
                'Stripe non ha creato il Price per «'.$label.'»: '.$e->getMessage(),
                0,
                $e,
            );
        }
    }

    private function syncExistingPriceState(
        StripeClient $client,
        string $priceId,
        bool $planActive,
        string $lookupKey,
        string $label,
    ): void {
        $update = [
            'active' => $planActive,
            'nickname' => $label,
        ];
        // lookup_key solo se possibile (evita errori su price già con altra key)
        try {
            $client->prices->update($priceId, $update + [
                'lookup_key' => $lookupKey,
                'transfer_lookup_key' => true,
            ]);
        } catch (ApiErrorException) {
            try {
                $client->prices->update($priceId, $update);
            } catch (ApiErrorException) {
                // best-effort
            }
        }
    }

    private function setProductDefaultPrice(
        StripeClient $client,
        string $productId,
        string $priceId,
        bool $planActive,
    ): void {
        if (! $planActive) {
            return;
        }
        try {
            $client->products->update($productId, [
                'default_price' => $priceId,
            ]);
        } catch (ApiErrorException) {
            // best-effort
        }
    }

    private function archivePrice(StripeClient $client, string $priceId): void
    {
        try {
            $client->prices->update($priceId, ['active' => false]);
        } catch (ApiErrorException) {
            // già archiviato / assente
        }
    }

    private function findActivePriceByLookupKey(StripeClient $client, string $lookupKey): ?\Stripe\Price
    {
        try {
            $list = $client->prices->all([
                'lookup_keys' => [$lookupKey],
                'active' => true,
                'limit' => 1,
            ]);
            $first = $list->data[0] ?? null;

            return $first instanceof \Stripe\Price ? $first : null;
        } catch (ApiErrorException) {
            return null;
        }
    }

    private function lookupKeyFor(string $planKey, string $interval): string
    {
        $raw = 'curaxe_'.preg_replace('/[^a-z0-9_]+/i', '_', strtolower($planKey)).'_'.$interval;
        $raw = trim((string) preg_replace('/_+/', '_', $raw), '_');

        return substr($raw !== '' ? $raw : 'curaxe_plan_'.$interval, 0, 200);
    }
}
