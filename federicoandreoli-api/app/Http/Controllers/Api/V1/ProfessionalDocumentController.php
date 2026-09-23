<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ProfessionalDocument;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfessionalDocumentController
{
    public function index(Request $request): JsonResponse
    {
        $documents = ProfessionalDocument::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (ProfessionalDocument $doc) => $this->payload($doc));

        return response()->json($documents);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'slot' => ['required', 'in:identita,attestati,referenze'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ], [
            'file.mimes' => 'Formato non supportato: usa PDF, JPG o PNG.',
            'file.max' => 'Il documento supera i 5 MB consentiti.',
        ]);

        $file = $request->file('file');
        // Disco privato: i documenti di identità non devono essere pubblici.
        $path = $file->store('professional-documents/'.$request->user()->id);

        $document = ProfessionalDocument::query()->create([
            'user_id' => $request->user()->id,
            'slot' => $request->string('slot')->toString(),
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime' => (string) $file->getMimeType(),
            'size_bytes' => $file->getSize(),
        ]);

        return response()->json($this->payload($document), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $document = ProfessionalDocument::query()
            ->where('user_id', $request->user()->id)
            ->find($id);

        if ($document === null) {
            return ApiResponse::error('Documento non trovato.', 404, [], 'not_found');
        }

        Storage::delete($document->path);
        $document->delete();

        return ApiResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProfessionalDocument $doc): array
    {
        return [
            'id' => (string) $doc->id,
            'slot' => $doc->slot,
            'name' => $doc->original_name,
            'mime' => $doc->mime,
            'sizeBytes' => $doc->size_bytes,
            'uploadedAt' => $doc->created_at?->toIso8601String(),
        ];
    }
}
