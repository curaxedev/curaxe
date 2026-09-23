# STR-P01 — Piano Premium struttura

## Descrizione

Abbonamento B2B con annunci illimitati, priorità listing e analytics avanzate.

## Persona / Ruolo

**Struttura B2B premium**

## User stories



## Wireframe descrittivo

```
+----------------------------------+
|  [Header / breadcrumb]           |
|  Piano Premium struttura          |
|  Abbonamento B2B con annunci illi |
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
{ "id": "STR-P01", "status": "mock" }
```

## Criteri di accettazione

- [ ] UI conforme al design system
- [ ] Responsive mobile/tablet/desktop
- [ ] Accessibilità base (focus, label, aria)

## Dipendenze

- Nessuna dipendenza critica

## Priorità

**P1**

## Stato attuale

✅ Mock-first (SPRINT-22)

## Route

- `/dashboard/struttura` — sezione **Premium RSA**
- `/dashboard/struttura/piano/checkout` · `/dashboard/struttura/piano/esito`

## File sorgente attuale

- `federicoandreoli-web/src/lib/billingTypes.ts` — prodotto `structure_premium_monthly`, audience `structure`
- `federicoandreoli-web/src/services/billingService.ts`
- `federicoandreoli-web/src/hooks/useBillingSubscription.ts`
- `federicoandreoli-web/src/pages/dashboard/structure/StructureDashboard.tsx` — `SectionBilling`
