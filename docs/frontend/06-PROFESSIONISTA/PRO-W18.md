# PRO-W18 — Wizard offro — Documenti

## Descrizione

Step 18/20 del wizard registrazione professionista: Upload ID, attestati, referenze.

## Persona / Ruolo

**Professionista (registrazione)**

## User stories

- Come **professionista**, voglio **completare lo step "Documenti"**, così che **pubblico un profilo completo e verificabile**.

## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Wizard offro — Documenti         |
|  Step 18/20 del wizard registrazi |
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
  "stepId": "documenti",
  "draftKey": "fa-register-draft-offer",
  "progress": "18/20"
}
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- UT-010 intent
- PRO-W17

## Priorità

**P1**

## Stato attuale

✅ Implementato (draft localStorage)

## Route

`/registrazione/offro/documenti`

## File sorgente attuale

- `federicoandreoli-web/src/pages/auth/wizard/OfferWizardPage.tsx`
- `federicoandreoli-web/src/pages/auth/wizard/stepConfig.ts`
- `federicoandreoli-web/src/pages/auth/registerDraft.ts`
