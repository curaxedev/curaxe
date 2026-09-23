<?php

namespace Tests\Unit;

use App\Domains\Auth\Services\Totp;
use PHPUnit\Framework\TestCase;

class TotpTest extends TestCase
{
    public function test_generated_code_verifies(): void
    {
        $totp = new Totp;
        $secret = Totp::generateSecret();
        $now = time();

        $code = $totp->codeAt($secret, $now);

        $this->assertTrue($totp->verify($secret, $code, $now));
    }

    public function test_code_from_previous_period_is_within_window(): void
    {
        $totp = new Totp;
        $secret = Totp::generateSecret();
        $now = time();

        $previous = $totp->codeAt($secret, $now - 30);

        $this->assertTrue($totp->verify($secret, $previous, $now));
    }

    public function test_stale_code_is_rejected(): void
    {
        $totp = new Totp;
        $secret = Totp::generateSecret();
        $now = time();

        $stale = $totp->codeAt($secret, $now - 120);

        $this->assertFalse($totp->verify($secret, $stale, $now));
    }

    public function test_malformed_code_is_rejected(): void
    {
        $totp = new Totp;
        $secret = Totp::generateSecret();

        $this->assertFalse($totp->verify($secret, 'abcdef'));
        $this->assertFalse($totp->verify($secret, '12345'));
        $this->assertFalse($totp->verify('!!notbase32!!', '123456'));
    }

    public function test_rfc6238_vector(): void
    {
        // RFC 6238, Appendix B: secret ASCII "12345678901234567890" (base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ), T=59 -> 94287082 (8 cifre); le ultime 6 sono 287082.
        $totp = new Totp;

        $this->assertSame('287082', $totp->codeAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59));
    }
}
