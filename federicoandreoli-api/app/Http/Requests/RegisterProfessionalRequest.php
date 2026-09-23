<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterProfessionalRequest extends FormRequest
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
            'firstName' => ['required', 'string', 'min:2', 'max:100'],
            'lastName' => ['nullable', 'string', 'max:100'],
            'role' => ['required', 'in:infermiere,oss,badante,altro'],
            'address' => ['required', 'array'],
            'address.line' => ['required', 'string', 'min:2', 'max:255'],
            'address.comune' => ['nullable', 'string', 'max:120'],
            'address.cap' => ['nullable', 'string', 'max:10'],
            'birthDate' => ['nullable', 'date', 'before_or_equal:-18 years'],
            'consents' => ['required', 'array'],
            'consents.termini' => ['required', 'accepted'],
            'consents.privacy' => ['required', 'accepted'],
            'consents.maggiorenne' => ['required', 'accepted'],
            'consents.comunicazioni' => ['nullable', 'boolean'],
            'consents.profilazione' => ['nullable', 'boolean'],
            // Resto del payload (competenze, disponibilità, ecc.): libero, salvato come seed profilo.
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
            'firstName.required' => 'Inserisci nome e cognome validi.',
            'firstName.min' => 'Inserisci nome e cognome validi.',
            'role.required' => 'Seleziona il ruolo principale.',
            'role.in' => 'Seleziona il ruolo principale.',
            'address.line.required' => 'Inserisci il comune o la zona di lavoro.',
            'address.line.min' => 'Inserisci il comune o la zona di lavoro.',
            'birthDate.before_or_equal' => 'Devi avere almeno 18 anni per registrarti.',
            'birthDate.date' => 'Data di nascita non valida.',
            'consents.termini.accepted' => 'Devi accettare i Termini di servizio.',
            'consents.termini.required' => 'Devi accettare i Termini di servizio.',
            'consents.privacy.accepted' => 'Devi accettare l’informativa privacy.',
            'consents.privacy.required' => 'Devi accettare l’informativa privacy.',
            'consents.maggiorenne.accepted' => 'Conferma di essere maggiorenne.',
            'consents.maggiorenne.required' => 'Conferma di essere maggiorenne.',
        ];
    }
}
