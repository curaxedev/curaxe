<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use Stripe\Exception\ApiErrorException;

class StripeDiagnosticService
{
    /** Eventi webhook obbligatori per billing Curaxe. */
    public const REQUIRED_EVENTS = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
        'invoice.payment_action_required',
        'charge.refunded',
        'refund.created',
        'refund.updated',
        'refund.failed',
        'customer.subscription.trial_will_end',
    ];

    public function __construct(
        private readonly StripeClientFactory $clients,
    ) {}

    /**
     * @return array{ok: bool, checks: list<array{id: string, label: string, pass: bool, detail: string}>}
     */
    public function run(BillingSetting $settings): array
    {
        $checks = [];

        $secret = $settings->decryptedSecretKey();
        $pk = $settings->publishableKeyResolved();
        $mode = $settings->mode === 'live' ? 'live' : 'test';

        $checks[] = $this->check(
            'credentials',
            'Credenziali modalità attiva',
            $secret !== null && $pk !== null,
            $secret && $pk ? 'Chiavi presenti' : 'Mancano secret o publishable key',
        );

        $keyModeOk = true;
        $keyDetail = 'N/D';
        if ($secret && $pk) {
            $secretIsLive = str_starts_with($secret, 'sk_live_');
            $pkIsLive = str_starts_with($pk, 'pk_live_');
            $expectLive = $mode === 'live';
            $keyModeOk = ($secretIsLive === $expectLive) && ($pkIsLive === $expectLive)
                && (str_starts_with($secret, 'sk_') && str_starts_with($pk, 'pk_'));
            $keyDetail = $keyModeOk
                ? "Coerenti con modalità {$mode}"
                : "Prefissi chiave non coerenti con modalità {$mode}";
        }
        $checks[] = $this->check('key_mode', 'Coerenza chiave / modalità', $keyModeOk, $keyDetail);

        $apiOk = false;
        $apiDetail = 'Non eseguito';
        $chargesOk = false;
        $chargesDetail = 'Non eseguito';
        $client = $this->clients->make($settings);
        if ($client !== null) {
            try {
                $account = $client->accounts->retrieve();
                $apiOk = true;
                $apiDetail = 'Account '.$account->id;
                $chargesOk = (bool) ($account->charges_enabled ?? false);
                $chargesDetail = $chargesOk ? 'Charges enabled' : 'Account non pronto a incassare';
            } catch (ApiErrorException $e) {
                $apiDetail = $e->getMessage();
            } catch (\Throwable $e) {
                $apiDetail = $e->getMessage();
            }
        }
        $checks[] = $this->check('api', 'Connessione API Stripe', $apiOk, $apiDetail);
        $checks[] = $this->check('charges', 'Account pronto a incassare', $chargesOk || $mode === 'test', $chargesDetail);

        $whSecret = $settings->decryptedWebhookSecret();
        $checks[] = $this->check(
            'webhook_secret',
            'Signing secret webhook',
            $whSecret !== null,
            $whSecret ? 'Configurato ('.$settings->webhook_secret_hint.')' : 'Mancante',
        );

        $pricesOk = $settings->price_professional
            && $settings->price_agency
            && $settings->price_structure;
        $checks[] = $this->check(
            'prices',
            'Price ID piani',
            (bool) $pricesOk,
            $pricesOk ? 'Tutti e 3 i piani mappati' : 'Configura price professional/agency/structure',
        );

        $webhookUrl = rtrim((string) config('app.url'), '/').'/api/v1/webhooks/stripe';
        $checks[] = $this->check(
            'webhook_domain',
            'Webhook URL API',
            str_starts_with($webhookUrl, 'https://') || app()->environment('local'),
            $webhookUrl,
        );

        // Eventi: non verificabili via API senza endpoint ID; informativo, non auto-pass “totale”.
        $checks[] = $this->check(
            'webhook_events',
            'Eventi webhook obbligatori',
            true,
            'Conferma in Stripe Dashboard che siano selezionati: '.implode(', ', self::REQUIRED_EVENTS),
        );

        $ok = collect($checks)
            ->filter(fn (array $c) => $c['id'] !== 'webhook_events')
            ->every(fn (array $c) => $c['pass']);

        $result = [
            'ok' => $ok,
            'checks' => $checks,
            'requiredEvents' => self::REQUIRED_EVENTS,
            'webhookUrl' => $webhookUrl,
            'ranAt' => now()->toIso8601String(),
        ];

        $settings->last_diagnostic = $result;
        // Non auto-completare setup: solo il landlord (markSetupComplete) dopo conferma eventi.
        $settings->save();

        return $result;
    }

    /**
     * @return array{id: string, label: string, pass: bool, detail: string}
     */
    private function check(string $id, string $label, bool $pass, string $detail): array
    {
        return compact('id', 'label', 'pass', 'detail');
    }
}
