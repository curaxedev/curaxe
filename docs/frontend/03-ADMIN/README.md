# Modulo Admin (ADM)

Funzionalità per **platform_admin**: moderazione, analytics, KYC, billing e configurazione piattaforma.

## Indice funzionalità

| ID | Titolo | Stato | Priorità |
|----|--------|-------|----------|
| [ADM-001](ADM-001.md) | Panoramica piattaforma | ✅ Implementato (mock) | P0 |
| [ADM-002](ADM-002.md) | Gestione utenti | ✅ Implementato (mock locale) | P0 |
| [ADM-003](ADM-003.md) | Moderazione richieste | ✅ Implementato (mock) | P1 |
| [ADM-004](ADM-004.md) | Abbonamenti e pagamenti | ✅ Implementato (mock) | P0 |
| [ADM-005](ADM-005.md) | Dispute e assistenza | ✅ Implementato (mock) | P1 |
| [ADM-006](ADM-006.md) | Verifica profili KYC | ✅ Implementato (mock) | P0 |
| [ADM-007](ADM-007.md) | Impostazioni prezzi piani | ✅ Implementato (mock localStorage) | P1 |
| [ADM-008](ADM-008.md) | Impostazioni email notifiche | ✅ Implementato (mock localStorage) | P2 |
| [ADM-009](ADM-009.md) | Modalità manutenzione | ✅ Implementato (mock localStorage) | P2 |
| [ADM-010](ADM-010.md) | Limiti piano FREE | ✅ Implementato (mock localStorage) | P1 |
| [ADM-011](ADM-011.md) | Dettaglio utente | ✅ Implementato (mock modal, SPRINT-13) | P1 |
| [ADM-012](ADM-012.md) | Azioni account (sospendi/elimina) | ✅ Implementato (mock sospendi/riattiva) | P0 |
| [ADM-013](ADM-013.md) | Export report analytics | ✅ Implementato (mock) | P2 |
| [ADM-014](ADM-014.md) | Moderazione annunci B2B | ✅ Mock-first | P1 |
| [ADM-015](ADM-015.md) | Accesso dashboard admin | ✅ Mock + ProtectedRoute (SPRINT-01/02) | P0 |


## Route principale

`/dashboard/admin` — sezioni via state interno (`activeSection`), non sub-route.

## File sorgente

- `federicoandreoli-web/src/pages/dashboard/admin/AdminDashboard.tsx`
- `federicoandreoli-web/src/pages/dashboard/DashboardLayout.tsx`

