<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AppNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController
{
    public function index(Request $request): JsonResponse
    {
        $items = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (AppNotification $n) => [
                'id' => (string) $n->id,
                'userId' => (string) $n->user_id,
                'audience' => $n->audience,
                'text' => $n->text,
                'createdAt' => $n->created_at?->toIso8601String(),
                'read' => $n->read,
                'type' => $n->type,
            ]);

        return response()->json(['notifications' => $items]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $n = AppNotification::query()->where('user_id', $request->user()->id)->find($id);
        if ($n === null) {
            return ApiResponse::error('Notifica non trovata.', 404, [], 'not_found');
        }
        $n->read = true;
        $n->save();

        return response()->json([
            'id' => (string) $n->id,
            'userId' => (string) $n->user_id,
            'audience' => $n->audience,
            'text' => $n->text,
            'createdAt' => $n->created_at?->toIso8601String(),
            'read' => true,
            'type' => $n->type,
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('read', false)
            ->update(['read' => true]);

        return ApiResponse::message('Tutte le notifiche sono state segnate come lette.');
    }
}
