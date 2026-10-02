<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Messaging\NewMessageMail;
use App\Models\AppNotification;
use App\Models\Application;
use App\Models\Message;
use App\Models\MessageThread;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class MessagingController
{
    public function threads(Request $request): JsonResponse
    {
        if (! Schema::hasTable('message_threads')) {
            return response()->json([]);
        }

        $userId = (string) $request->user()->id;

        try {
            $threads = MessageThread::query()
                ->where(function ($query) use ($userId): void {
                    $query->whereJsonContains('participant_ids', $userId);
                    if (ctype_digit($userId)) {
                        $query->orWhereJsonContains('participant_ids', (int) $userId);
                    }
                })
                ->orderByDesc('last_message_at')
                ->limit(100)
                ->get()
                ->map(fn (MessageThread $t) => $this->threadPayload($t))
                ->values();
        } catch (QueryException) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili. Riprova tra poco.',
                503,
                [],
                'messaging_unavailable',
            );
        }

        return response()->json($threads);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        if (! Schema::hasTable('messages')) {
            return ApiResponse::error('Messaggi temporaneamente non disponibili.', 503, [], 'messaging_unavailable');
        }

        $thread = $this->threadForUser($request, $id);
        if ($thread instanceof JsonResponse) {
            return $thread;
        }

        try {
            $messages = Message::query()
                ->where('thread_id', $thread->id)
                ->orderBy('id')
                ->get()
                ->map(fn (Message $m) => [
                    'id' => (string) $m->id,
                    'threadId' => (string) $m->thread_id,
                    'senderId' => (string) $m->sender_id,
                    'senderName' => $m->sender_name,
                    'body' => $m->body,
                    'createdAt' => $m->created_at?->toIso8601String(),
                ]);
        } catch (QueryException) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili. Riprova tra poco.',
                503,
                [],
                'messaging_unavailable',
            );
        }

        return response()->json($messages);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $thread = $this->threadForUser($request, $id);
        if ($thread instanceof JsonResponse) {
            return $thread;
        }

        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $user = $request->user();

        $message = Message::query()->create([
            'thread_id' => $thread->id,
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'body' => $data['body'],
        ]);

        $unread = $thread->unread_by_user_id ?? [];
        foreach ($thread->participant_ids as $pid) {
            $key = (string) $pid;
            if ($key === (string) $user->id) {
                $unread[$key] = 0;
            } else {
                $unread[$key] = (int) ($unread[$key] ?? 0) + 1;
            }
        }

        $thread->last_message_at = now();
        $thread->last_message_preview = mb_substr($data['body'], 0, 160);
        $thread->unread_by_user_id = $unread;
        $thread->save();

        foreach ($thread->participant_ids as $pid) {
            if ((string) $pid === (string) $user->id) {
                continue;
            }
            $recipient = User::query()->find($pid);
            if ($recipient === null) {
                continue;
            }
            AppNotification::query()->create([
                'user_id' => $recipient->id,
                'audience' => $this->audience($recipient->role),
                'text' => 'Nuovo messaggio da '.$user->name,
                'type' => 'info',
                'read' => false,
            ]);
            Mail::to($recipient->email)->send(new NewMessageMail($thread, $message));
        }

        return response()->json([
            'id' => (string) $message->id,
            'threadId' => (string) $message->thread_id,
            'senderId' => (string) $message->sender_id,
            'senderName' => $message->sender_name,
            'body' => $message->body,
            'createdAt' => $message->created_at?->toIso8601String(),
        ], 201);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $thread = $this->threadForUser($request, $id);
        if ($thread instanceof JsonResponse) {
            return $thread;
        }

        $unread = $thread->unread_by_user_id ?? [];
        $unread[(string) $request->user()->id] = 0;
        $thread->unread_by_user_id = $unread;
        $thread->save();

        return response()->json($this->threadPayload($thread));
    }

    public function directContact(Request $request): JsonResponse
    {
        if (! Schema::hasTable('message_threads') || ! Schema::hasTable('messages')) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili. Riprova tra poco.',
                503,
                [],
                'messaging_unavailable',
            );
        }

        $data = $request->validate([
            'professionalId' => ['required', 'string'],
            'professionalName' => ['required', 'string', 'max:120'],
            'initialMessage' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $pro = User::query()->find($data['professionalId']);
        if ($pro === null || $pro->role !== UserRole::Professional) {
            return ApiResponse::error('Professionista non trovato.', 404, [], 'not_found');
        }

        try {
            $existing = MessageThread::query()
                ->where('link_type', 'direct_contact')
                ->where(function ($query) use ($user): void {
                    $uid = (string) $user->id;
                    $query->whereJsonContains('participant_ids', $uid);
                    if (ctype_digit($uid)) {
                        $query->orWhereJsonContains('participant_ids', (int) $uid);
                    }
                })
                ->get()
                ->first(function (MessageThread $t) use ($user, $pro) {
                    $ids = array_map('strval', $t->participant_ids ?? []);

                    return in_array((string) $user->id, $ids, true)
                        && in_array((string) $pro->id, $ids, true);
                });

            if ($existing !== null) {
                if (! empty($data['initialMessage'])) {
                    $request->merge(['body' => $data['initialMessage']]);
                    $this->send($request, $existing->id);
                }

                return response()->json($this->threadPayload($existing->fresh()));
            }

            $thread = MessageThread::query()->create([
                'participant_ids' => [(string) $user->id, (string) $pro->id],
                'participant_names' => [
                    (string) $user->id => $user->name,
                    (string) $pro->id => $data['professionalName'],
                ],
                'participant_roles' => [
                    (string) $user->id => $this->messagingRole($user->role),
                    (string) $pro->id => 'professional',
                ],
                'subject' => 'Contatto con '.$data['professionalName'],
                'link_type' => 'direct_contact',
                'link_id' => null,
                'link_label' => null,
                'last_message_at' => now(),
                'last_message_preview' => '',
                'unread_by_user_id' => [(string) $user->id => 0, (string) $pro->id => 0],
            ]);

            if (! empty($data['initialMessage'])) {
                $request->merge(['body' => $data['initialMessage']]);
                $this->send($request, $thread->id);
            }

            return response()->json($this->threadPayload($thread->fresh()), 201);
        } catch (QueryException) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili. Riprova tra poco.',
                503,
                [],
                'messaging_unavailable',
            );
        }
    }

    public function applicationContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'applicationId' => ['required', 'string'],
            'initialMessage' => ['nullable', 'string', 'max:2000'],
        ]);

        $application = Application::query()->find($data['applicationId']);
        if ($application === null) {
            return ApiResponse::error('Candidatura non trovata.', 404, [], 'not_found');
        }

        $user = $request->user();
        if (! in_array($user->id, [$application->owner_id, $application->applicant_id], true)) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $otherId = $user->id === $application->owner_id
            ? $application->applicant_id
            : $application->owner_id;
        $other = User::query()->find($otherId);

        $thread = MessageThread::query()->create([
            'participant_ids' => [(string) $user->id, (string) $otherId],
            'participant_names' => [
                (string) $user->id => $user->name,
                (string) $otherId => $other?->name ?? $application->applicant_name,
            ],
            'participant_roles' => [
                (string) $user->id => $this->messagingRole($user->role),
                (string) $otherId => $this->messagingRole($other?->role ?? UserRole::Professional),
            ],
            'subject' => 'Candidatura: '.$application->target_title,
            'link_type' => 'application',
            'link_id' => (string) $application->id,
            'link_label' => $application->target_title,
            'last_message_at' => now(),
            'last_message_preview' => '',
            'unread_by_user_id' => [(string) $user->id => 0, (string) $otherId => 0],
        ]);

        if (! empty($data['initialMessage'])) {
            $request->merge(['body' => $data['initialMessage']]);
            $this->send($request, $thread->id);
        }

        return response()->json($this->threadPayload($thread->fresh()), 201);
    }

    private function threadForUser(Request $request, int $id): MessageThread|JsonResponse
    {
        if (! Schema::hasTable('message_threads')) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili.',
                503,
                [],
                'messaging_unavailable',
            );
        }

        try {
            $thread = MessageThread::query()->find($id);
        } catch (QueryException) {
            return ApiResponse::error(
                'Messaggi temporaneamente non disponibili. Riprova tra poco.',
                503,
                [],
                'messaging_unavailable',
            );
        }

        if ($thread === null) {
            return ApiResponse::error('Conversazione non trovata.', 404, [], 'not_found');
        }
        $userId = (string) $request->user()->id;
        if (! in_array($userId, array_map('strval', $thread->participant_ids ?? []), true)) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        return $thread;
    }

    /**
     * @return array<string, mixed>
     */
    private function threadPayload(MessageThread $t): array
    {
        return [
            'id' => (string) $t->id,
            'participantIds' => array_map('strval', $t->participant_ids ?? []),
            'participantNames' => $t->participant_names ?? [],
            'participantRoles' => $t->participant_roles ?? [],
            'subject' => $t->subject,
            'linkType' => $t->link_type,
            'linkId' => $t->link_id,
            'linkLabel' => $t->link_label,
            'lastMessageAt' => $t->last_message_at?->toIso8601String() ?? $t->created_at?->toIso8601String(),
            'lastMessagePreview' => $t->last_message_preview,
            'unreadByUserId' => $t->unread_by_user_id ?? [],
            'createdAt' => $t->created_at?->toIso8601String(),
        ];
    }

    private function messagingRole(UserRole $role): string
    {
        return match ($role) {
            UserRole::Professional => 'professional',
            UserRole::PublicUser => 'family',
            UserRole::Agency => 'agency',
            UserRole::Structure => 'structure',
            default => 'family',
        };
    }

    private function audience(UserRole $role): string
    {
        return match ($role) {
            UserRole::Professional => 'professional',
            UserRole::Agency => 'agency',
            UserRole::Structure => 'structure',
            default => 'family',
        };
    }
}
