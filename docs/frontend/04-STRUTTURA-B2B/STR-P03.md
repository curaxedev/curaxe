# STR-P03 — Export CSV candidature

## Descrizione

Download candidature filtrate per ATS interno.

## Persona / Ruolo

**Struttura B2B**

## User stories



## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Export CSV candidature           |
|  Download candidature filtrate pe |
|  [Contenuto principale]          |
|  [Azioni / CTA]                  |
+----------------------------------+
```

## Componenti UI richiesti



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
{ "id": "STR-P03", "status": "mock" }
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- STR-003

## Priorità

**P2**

## Stato attuale

✅ Implementato (mock) — SPRINT-17

## Route

_N/A — sezione dashboard o componente inline_

## File sorgente attuale

- `federicoandreoli-web/src/lib/exportUtils.ts` — `exportJobPostingsCsv`, `exportB2bCandidatesCsv`
- `federicoandreoli-web/src/pages/dashboard/b2b/B2BPostingsSection.tsx` — pulsante «Esporta CSV» annunci
- `federicoandreoli-web/src/pages/dashboard/b2b/B2BCandidatesSection.tsx` — pulsante «Esporta CSV» candidature (rispetta filtro annuncio)
