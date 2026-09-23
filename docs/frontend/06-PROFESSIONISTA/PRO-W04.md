# PRO-W04 — Wizard offro — Sesso e data di nascita

## Descrizione

Step 04/20 del wizard registrazione professionista: Dati anagrafici base.

## Persona / Ruolo

**Professionista (registrazione)**

## User stories

- Come **professionista**, voglio **completare lo step "Sesso e data di nascita"**, così che **pubblico un profilo completo e verificabile**.

## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Wizard offro — Sesso e data di n |
|  Step 04/20 del wizard registrazi |
|  [Contenuto principale]          |
|  [Azioni / CTA]                  |
+----------------------------------+
```

## Componenti UI richiesti

- `WizardShell`
- `RegisterWizardProvider`
- `ConsentStep (step consensi)`

## Stati

- **loading**: Da implementare con skeleton/empty state/messaggio errore/feedback successo.
- **empty**: Da implementare con skeleton/empty state/messaggio errore/feedback successo.
- **error**: Da implementare con skeleton/empty state/messaggio errore/feedback successo.
- **success**: Da implementare con skeleton/empty state/messaggio errore/feedback successo.

## Validazioni e regole business

- Validazione lato client su campi obbligatori
- Regole business da allineare con API backend

## Mock data schema

```json
{
  "stepId": "sesso-e-nascita",
  "draftKey": "fa-register-draft-offer",
  "progress": "4/20"
}
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- UT-010 intent
- PRO-W03

## Priorità

**P1**

## Stato attuale

✅ Implementato (draft localStorage)

## Route

`/registrazione/offro/sesso-e-nascita`

## File sorgente attuale

- `federicoandreoli-web/src/pages/auth/wizard/OfferWizardPage.tsx`
- `federicoandreoli-web/src/pages/auth/wizard/stepConfig.ts`
- `federicoandreoli-web/src/pages/auth/registerDraft.ts`
