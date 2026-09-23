# PRO-W05 — Wizard offro — Lingua madre

## Descrizione

Step 05/20 del wizard registrazione professionista: Lingua principale.

## Persona / Ruolo

**Professionista (registrazione)**

## User stories

- Come **professionista**, voglio **completare lo step "Lingua madre"**, così che **pubblico un profilo completo e verificabile**.

## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Wizard offro — Lingua madre      |
|  Step 05/20 del wizard registrazi |
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
  "stepId": "lingua-madre",
  "draftKey": "fa-register-draft-offer",
  "progress": "5/20"
}
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- UT-010 intent
- PRO-W04

## Priorità

**P1**

## Stato attuale

✅ Implementato (draft localStorage)

## Route

`/registrazione/offro/lingua-madre`

## File sorgente attuale

- `federicoandreoli-web/src/pages/auth/wizard/OfferWizardPage.tsx`
- `federicoandreoli-web/src/pages/auth/wizard/stepConfig.ts`
- `federicoandreoli-web/src/pages/auth/registerDraft.ts`
