<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\Platform\PlatformSettingsReader;
use Illuminate\Http\JsonResponse;

class PlatformConfigController
{
    public function __invoke(PlatformSettingsReader $reader): JsonResponse
    {
        return response()->json($reader->publicConfig());
    }
}
