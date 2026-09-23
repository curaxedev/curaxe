# STR-P02 — Multi-sede / filiali

## Descrizione

Gestione più sedi operative sotto stesso account corporate.

## Persona / Ruolo

**Gruppo RSA**

## User stories



## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Multi-sede / filiali             |
|  Gestione più sedi operative sott |
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
{ "id": "STR-P02", "status": "mock" }
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- Nessuna dipendenza critica

## Priorità

**P2**

## Stato attuale

✅ Implementato (mock) — SPRINT-18

## Route

_N/A — sezione dashboard profilo agenzia/struttura; pubblico `/strutture/:id`_

## File sorgente attuale

- `federicoandreoli-web/src/services/locationService.ts`
- `federicoandreoli-web/src/pages/dashboard/b2b/OrganizationLocationsSection.tsx`
- `federicoandreoli-web/src/hooks/useOrganizationLocations.ts`
