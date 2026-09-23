<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterSeekerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc', 'unique:users,email'],
            'fullName' => ['required', 'string', 'min:3', 'max:200'],
            'careType' => ['required', 'string', 'max:64'],
            'forWhom' => ['required', 'string', 'max:64'],
            'address' => ['required', 'array'],
            'address.line' => ['required', 'string', 'min:2', 'max:255'],
            'consents' => ['required', 'array'],
            'consents.termini' => ['required', 'accepted'],
            'consents.privacy' => ['required', 'accepted'],
            'consents.maggiorenne' => ['required', 'accepted'],
            'consents.comunicazioni' => ['nullable', 'boolean'],
            'consents.profilazione' => ['nullable', 'boolean'],
            'payload' => ['nullable', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Inserisci un indirizzo email valido.',
            'email.email' => 'Inserisci un indirizzo email valido.',
            'email.unique' => 'Esiste già un account con questa email. Accedi dalla pagina di login.',
            'fullName.required' => 'Inserisci nome e cognome validi.',
            'fullName.min' => 'Inserisci nome e cognome validi.',
            'careType.required' => 'Indica che tipo di assistenza cerchi.',
            'forWhom.required' => 'Indica per chi è la ricerca.',
            'address.line.required' => 'Inserisci zona o comune.',
            'address.line.min' => 'Inserisci zona o comune.',
            'consents.termini.accepted' => 'Devi accettare i Termini di servizio.',
            'consents.termini.required' => 'Devi accettare i Termini di servizio.',
            'consents.privacy.accepted' => 'Devi accettare l’informativa privacy.',
            'consents.privacy.required' => 'Devi accettare l’informativa privacy.',
            'consents.maggiorenne.accepted' => 'Conferma di essere maggiorenne.',
            'consents.maggiorenne.required' => 'Conferma di essere maggiorenne.',
        ];
    }
}
