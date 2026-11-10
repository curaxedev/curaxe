<?php

namespace App\Console\Commands;

use App\Services\Stripe\PlanPriceChangeService;
use Illuminate\Console\Command;

class EnforcePlanPriceChangeGraceCommand extends Command
{
    protected $signature = 'billing:enforce-plan-price-grace';

    protected $description = 'A fine grazia grandfather: schedula cancel_at_period_end sugli abbonati ancora sul Price storico';

    public function handle(PlanPriceChangeService $service): int
    {
        $n = $service->enforceExpiredGracePeriods();
        $this->info("Plan price grace enforced: {$n} change(s).");

        return self::SUCCESS;
    }
}
