<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Mail: non forzare `log` se Resend (o altro) è configurato correttamente.
        $mailer = (string) env('MAIL_MAILER', 'log');
        if ($mailer === 'resend') {
            if (blank(env('RESEND_API_KEY'))) {
                config(['mail.default' => 'log']);
            }
        } elseif ($mailer === 'smtp' && blank(env('MAIL_PASSWORD'))) {
            config(['mail.default' => 'log']);
        }

        // Le Resource escono senza involucro `data`: il frontend consuma il payload diretto.
        JsonResource::withoutWrapping();

        RateLimiter::for('otp', function (Request $request) {
            $key = $request->ip().'|'.$request->string('email')->toString();

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('otp-verify', function (Request $request) {
            $key = $request->ip().'|'.$request->string('email')->toString();

            return Limit::perMinute(10)->by($key);
        });

        RateLimiter::for('login', function (Request $request) {
            $key = $request->ip().'|'.$request->string('email')->toString();

            return Limit::perMinute(10)->by($key);
        });

        RateLimiter::for('password-reset', function (Request $request) {
            $key = $request->ip().'|'.$request->string('email')->toString();

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('registration', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('stripe-webhook', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));

        RateLimiter::for('billing', function (Request $request) {
            $userId = $request->user()?->id ?? 'guest';

            return Limit::perMinute(20)->by($request->ip().'|'.$userId);
        });
    }
}
