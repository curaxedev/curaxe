<?php

namespace App\Domains\Applications;

use App\Domains\Auth\Enums\UserRole;

/**
 * Specchio di `validateApplicationStatusTransition` del frontend.
 */
final class ApplicationStatusTransitions
{
    public static function allows(
        UserRole $actorRole,
        string $targetType,
        string $from,
        string $to,
    ): bool {
        if ($from === $to) {
            return true;
        }

        if ($actorRole === UserRole::Professional) {
            return in_array($targetType, ['job_posting', 'family_request'], true)
                && $from === 'submitted'
                && $to === 'withdrawn';
        }

        if ($actorRole === UserRole::Agency || $actorRole === UserRole::Structure) {
            if ($targetType !== 'job_posting') {
                return false;
            }
            $allowed = [
                'submitted' => ['viewed', 'rejected'],
                'viewed' => ['shortlisted', 'rejected'],
                'shortlisted' => ['interview', 'rejected'],
                'interview' => ['offer', 'rejected'],
                'offer' => ['hired', 'rejected'],
                'hired' => [],
            ];

            return in_array($to, $allowed[$from] ?? [], true);
        }

        if ($actorRole === UserRole::PublicUser) {
            if ($targetType !== 'family_request') {
                return false;
            }
            $allowed = [
                'submitted' => ['shortlisted', 'discarded'],
                'shortlisted' => ['accepted', 'discarded'],
                'accepted' => ['discarded'],
            ];

            return in_array($to, $allowed[$from] ?? [], true);
        }

        return false;
    }
}
