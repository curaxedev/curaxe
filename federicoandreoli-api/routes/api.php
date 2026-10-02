<?php

use App\Http\Controllers\Api\V1\AdminBillingController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AdminPasskeyController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthPoliciesController;
use App\Http\Controllers\Api\V1\B2BJobPostingController;
use App\Http\Controllers\Api\V1\B2BOrgController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\DirectoryController;
use App\Http\Controllers\Api\V1\EmailOtpAuthController;
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\FamilyRequestController;
use App\Http\Controllers\Api\V1\GdprController;
use App\Http\Controllers\Api\V1\MessagingController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PasswordLoginController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\ProfessionalDocumentController;
use App\Http\Controllers\Api\V1\ProfessionalProfileController;
use App\Http\Controllers\Api\V1\RegistrationController;
use App\Http\Controllers\Api\V1\SecurityMetaController;
use App\Http\Controllers\Api\V1\StripeWebhookController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/meta', fn () => response()->json([
        'name' => config('app.name'),
        'version' => 1,
    ]));
    Route::get('/security/meta', SecurityMetaController::class);

    Route::get('/auth/policies', AuthPoliciesController::class);

    Route::post('/auth/email-otp/request', [EmailOtpAuthController::class, 'request'])
        ->middleware(['throttle:otp', 'turnstile']);
    Route::post('/auth/email-otp/verify', [EmailOtpAuthController::class, 'verify'])
        ->middleware('throttle:otp-verify');

    Route::post('/auth/login', [PasswordLoginController::class, 'login'])
        ->middleware(['throttle:login', 'turnstile']);

    Route::post('/auth/passkey/login/options', [AdminPasskeyController::class, 'beginLogin'])
        ->middleware(['throttle:login', 'turnstile']);
    Route::post('/auth/passkey/login/verify', [AdminPasskeyController::class, 'completeLogin'])
        ->middleware('throttle:login');

    Route::post('/auth/password-reset/request', [PasswordResetController::class, 'request'])
        ->middleware(['throttle:password-reset', 'turnstile']);
    Route::get('/auth/password-reset/validate', [PasswordResetController::class, 'validateToken'])
        ->middleware('throttle:password-reset');
    Route::post('/auth/password-reset/confirm', [PasswordResetController::class, 'confirm'])
        ->middleware('throttle:password-reset');

    Route::post('/registrations/professional', [RegistrationController::class, 'professional'])
        ->middleware(['throttle:registration', 'turnstile']);
    Route::post('/registrations/seeker', [RegistrationController::class, 'seeker'])
        ->middleware(['throttle:registration', 'turnstile']);

    Route::get('/email/verify/{id}/{hash}', EmailVerificationController::class)
        ->middleware('signed')
        ->name('verification.verify');

    Route::post('/webhooks/stripe', StripeWebhookController::class)
        ->middleware('throttle:stripe-webhook');

    Route::get('/profiles', [DirectoryController::class, 'profiles']);
    Route::get('/profiles/{id}', [DirectoryController::class, 'showProfile']);
    Route::get('/structures/{id}', [DirectoryController::class, 'showStructure']);
    Route::get('/open-positions', [DirectoryController::class, 'openPositions']);
    Route::get('/open-positions/{id}', [DirectoryController::class, 'showOpenPosition']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/user', fn (Request $request) => new UserResource($request->user()));
        Route::post('/auth/logout', [PasswordLoginController::class, 'logout']);

        Route::get('/gdpr/consents', [GdprController::class, 'showConsents']);
        Route::patch('/gdpr/consents', [GdprController::class, 'updateConsents']);
        Route::post('/gdpr/export', [GdprController::class, 'export']);
        Route::delete('/account', [GdprController::class, 'destroyAccount']);

        Route::middleware('role:professional')->group(function (): void {
            Route::get('/professionals/me/profile', [ProfessionalProfileController::class, 'show']);
            Route::get('/professionals/me/stats', [ProfessionalProfileController::class, 'stats']);
            Route::patch('/professionals/me/profile', [ProfessionalProfileController::class, 'update']);
            Route::post('/professionals/me/photo', [ProfessionalProfileController::class, 'uploadPhoto']);
            Route::get('/professionals/me/documents', [ProfessionalDocumentController::class, 'index']);
            Route::post('/professionals/me/documents', [ProfessionalDocumentController::class, 'store']);
            Route::delete('/professionals/me/documents/{id}', [ProfessionalDocumentController::class, 'destroy']);
            Route::post('/applications/job-postings/{id}', [ApplicationController::class, 'applyToJobPosting']);
            Route::post('/applications/family-requests/{id}', [ApplicationController::class, 'applyToFamilyRequest']);
        });

        Route::get('/applications', [ApplicationController::class, 'index']);
        Route::patch('/applications/{id}', [ApplicationController::class, 'updateStatus']);

        Route::middleware('role:public_user')->group(function (): void {
            Route::get('/requests', [FamilyRequestController::class, 'index']);
            Route::post('/requests', [FamilyRequestController::class, 'store']);
            Route::patch('/requests/{id}', [FamilyRequestController::class, 'updateStatus']);
            Route::get('/requests/{id}/applications', [FamilyRequestController::class, 'applications']);
        });

        Route::middleware('role:agency,structure')->group(function (): void {
            Route::get('/b2b/overview', [B2BOrgController::class, 'overview']);
            Route::patch('/b2b/organization', [B2BOrgController::class, 'updateProfile']);
            Route::get('/b2b/job-postings', [B2BJobPostingController::class, 'index']);
            Route::post('/b2b/job-postings', [B2BJobPostingController::class, 'store']);
            Route::patch('/b2b/job-postings/{id}', [B2BJobPostingController::class, 'update']);
            Route::delete('/b2b/job-postings/{id}', [B2BJobPostingController::class, 'destroy']);

            Route::get('/organizations/{orgId}/team-members', [B2BOrgController::class, 'teamIndex']);
            Route::post('/organizations/{orgId}/team-members/invite', [B2BOrgController::class, 'teamInvite']);
            Route::delete('/organizations/{orgId}/team-members/{memberId}', [B2BOrgController::class, 'teamDestroy']);

            Route::get('/organizations/{orgId}/staff', [B2BOrgController::class, 'staffIndex']);
            Route::post('/organizations/{orgId}/staff', [B2BOrgController::class, 'staffStore']);
            Route::patch('/organizations/{orgId}/staff/{id}', [B2BOrgController::class, 'staffUpdate']);
            Route::delete('/organizations/{orgId}/staff/{id}', [B2BOrgController::class, 'staffDestroy']);

            Route::get('/organizations/{orgId}/locations', [B2BOrgController::class, 'locationsIndex']);
            Route::post('/organizations/{orgId}/locations', [B2BOrgController::class, 'locationsStore']);
            Route::patch('/organizations/{orgId}/locations/{id}', [B2BOrgController::class, 'locationsUpdate']);
            Route::delete('/organizations/{orgId}/locations/{id}', [B2BOrgController::class, 'locationsDestroy']);
            Route::post('/organizations/{orgId}/locations/{id}/primary', [B2BOrgController::class, 'locationsSetPrimary']);
        });

        Route::get('/messaging/threads', [MessagingController::class, 'threads']);
        Route::get('/messaging/threads/{id}/messages', [MessagingController::class, 'messages']);
        Route::post('/messaging/threads/{id}/messages', [MessagingController::class, 'send']);
        Route::patch('/messaging/threads/{id}/read', [MessagingController::class, 'markRead']);
        Route::post('/messaging/threads/direct-contact', [MessagingController::class, 'directContact']);
        Route::post('/messaging/threads/application-contact', [MessagingController::class, 'applicationContact']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::get('/billing/subscription', [BillingController::class, 'subscription']);
        Route::middleware('role:professional,agency,structure')->group(function (): void {
            Route::post('/billing/checkout-sessions', [BillingController::class, 'createCheckout'])
                ->middleware('throttle:billing');
            Route::post('/billing/checkout-sessions/{sessionId}/complete', [BillingController::class, 'completeCheckout'])
                ->middleware('throttle:billing');
            Route::post('/billing/subscription/cancel', [BillingController::class, 'cancel'])
                ->middleware('throttle:billing');
            Route::post('/billing/portal-sessions', [BillingController::class, 'portal'])
                ->middleware('throttle:billing');
            Route::get('/billing/invoices', [BillingController::class, 'invoices'])
                ->middleware('throttle:billing');
        });

        Route::middleware('role:platform_admin')->group(function (): void {
            Route::get('/admin/billing/subscriptions', [BillingController::class, 'adminSubscriptions']);
            Route::get('/admin/billing/stats', [BillingController::class, 'adminStats']);
            Route::get('/admin/billing/settings', [AdminBillingController::class, 'settings']);
            Route::put('/admin/billing/settings', [AdminBillingController::class, 'updateSettings']);
            Route::post('/admin/billing/diagnostic', [AdminBillingController::class, 'diagnostic']);
            Route::get('/admin/billing/required-events', [AdminBillingController::class, 'requiredEvents']);
            Route::post('/admin/billing/subscriptions/{id}/refund', [AdminBillingController::class, 'refund']);
            Route::post('/admin/billing/subscriptions/{id}/extend-trial', [AdminBillingController::class, 'extendTrial']);
            Route::post('/admin/billing/subscriptions/{id}/cancel', [AdminBillingController::class, 'adminCancel']);
            Route::get('/admin/passkeys', [AdminPasskeyController::class, 'index']);
            Route::post('/admin/passkeys/register/options', [AdminPasskeyController::class, 'beginRegister']);
            Route::post('/admin/passkeys/register/verify', [AdminPasskeyController::class, 'completeRegister']);
            Route::patch('/admin/passkeys/{id}', [AdminPasskeyController::class, 'rename']);
            Route::delete('/admin/passkeys/{id}', [AdminPasskeyController::class, 'destroy']);
            Route::get('/admin/users', [AdminController::class, 'users']);
            Route::get('/admin/users/{id}', [AdminController::class, 'showUser']);
            Route::post('/admin/users/{id}/suspend', [AdminController::class, 'suspendUser']);
            Route::post('/admin/users/{id}/reactivate', [AdminController::class, 'reactivateUser']);
            Route::get('/admin/job-postings/pending', [AdminController::class, 'pendingJobs']);
            Route::post('/admin/job-postings/{id}/approve', [AdminController::class, 'approveJob']);
            Route::post('/admin/job-postings/{id}/reject', [AdminController::class, 'rejectJob']);
        });
    });
});
