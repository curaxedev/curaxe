# 07 — Stato attuale e gap analysis

## Frontend mock-first: COMPLETO ✅

Dopo **SPRINT-01 … SPRINT-22** (chiusura documentazione **SPRINT-23**, 2026-06-04), tutte le slice verticali UI sono implementate con **servizi mock** (`localStorage` / `sessionStorage`) e layer `*Api.ts` pronti per swap Laravel.

| Metrica | Stato |
|---------|-------|
| UI per persona | ~100% (mock-first) |
| Integrazione Laravel | ~5% (`fetchApiMeta` health check) |
| Persistenza demo | Completa in-browser |

Report executive: [10-FRONTEND-COMPLETAMENTO.md](10-FRONTEND-COMPLETAMENTO.md)

---

## Cosa resta (Fase 2 — Backend Laravel)

Solo questi gap separano il frontend demo-ready dalla produzione:

| # | Area | Descrizione |
|---|------|-------------|
| 1 | **Laravel API swap** | Sostituire mock in `services/*` + `*Api.ts` con endpoint reali (`VITE_USE_MOCKS=false`) |
| 2 | **Stripe reale** | Checkout Session + webhook Laravel (`VITE_STRIPE_ENABLED=true`) |
| 3 | **Email transazionale** | OTP, reset password, inviti team, notifiche — oggi stub/mock |
| 4 | **WebSocket** | Notifiche e messaging real-time (oggi polling 30s) |
| 5 | **Test E2E** | Nessun runner configurato — regression risk |
| 6 | **i18n** | Solo italiano hardcoded |

---

## Matrice stato per modulo (mock-first)

### Admin (ADM)

| ID | Feature | Stato |
|----|---------|-------|
| ADM-001–006 | Core sections | ✅ mock |
| ADM-007–010 | Settings piattaforma | ✅ mock localStorage (SPRINT-21) |
| ADM-011–013 | Drill-down, export | ✅ mock (SPRINT-13/17) |
| ADM-014 | Moderazione annunci B2B | ✅ mock (SPRINT-22) |
| ADM-015 | RBAC admin | ✅ mock + ProtectedRoute (SPRINT-01/02) |

### Struttura B2B (STR)

| ID | Feature | Stato |
|----|---------|-------|
| STR-001–005 | Dashboard core | ✅ mock |
| STR-006–007 | Wizard annunci | ✅ mock (SPRINT-11) |
| STR-008 | Pausa/ripresa annuncio | 🟡 stati base |
| STR-009 | Pipeline selezione | 🟡 stati + contatto; no workflow colloquio/offerta |
| STR-010 | Profilo pubblico directory | ✅ mock (SPRINT-07) |
| STR-011 | Invito team | ✅ mock (SPRINT-22) |
| STR-012 | Statistiche performance | 🟡 chart mock |
| STR-013 | Notifiche | ✅ mock polling (SPRINT-14) |
| STR-014 | Split structure/agency | ✅ mock (SPRINT-10) |
| STR-P01 | Premium RSA | ✅ mock (SPRINT-22) |
| STR-P02 | Multi-sede | ✅ mock (SPRINT-18) |
| STR-P03 | Export CSV | ✅ mock (SPRINT-17) |

### Utente finale (UT)

| ID | Feature | Stato |
|----|---------|-------|
| UT-001–008, 010–022 | Pubblico + wizard + dashboard | ✅ mock |
| UT-009 | Login OTP/password | ✅ mock (SPRINT-01); backend Laravel pending |
| UT-018 | Pubblica richiesta | ✅ mock (SPRINT-05) |
| UT-023 | Contatti | ✅ mock (SPRINT-09) |
| UT-024 | Impostazioni account | ✅ mock (SPRINT-16) |

### Professionista (PRO)

| ID | Feature | Stato |
|----|---------|-------|
| PRO-001–006 | Dashboard | ✅ mock |
| PRO-007 | Stripe checkout | ✅ mock checkout (SPRINT-08); Stripe reale pending |
| PRO-W01–W20 | Wizard | ✅ localStorage + submit mock (SPRINT-03) |

---

## Debito tecnico residuo

| Item | Severità | Note |
|------|----------|------|
| Dashboard monolitiche | Media | 600–1000 LOC/file; refactor opzionale post-API |
| Mock inline legacy | Bassa | Seed centralizzati in `services/*`; directory usa servizi |
| No test E2E | Alta | Da affrontare in Fase 2 |
| Polling vs WebSocket | Media | Notifiche/messaging ogni 30s |
| i18n assente | Bassa | Backlog post go-live |

---

## Criteri "Definition of Done" produzione

- [ ] Swap mock → Laravel per auth, registrazione, profili, richieste, B2B, admin
- [ ] Stripe Premium in produzione (test mode minimo)
- [ ] Email OTP/reset/notifiche via provider reale
- [ ] WebSocket o equivalente per inbox/notifiche
- [ ] Suite E2E su flussi critici
- [ ] i18n (se richiesto prodotto)

---

## Riferimenti

- Completamento frontend: [10-FRONTEND-COMPLETAMENTO.md](10-FRONTEND-COMPLETAMENTO.md)
- Piano sprint: [08-PIANO-SVILUPPO-VERTICALE.md](08-PIANO-SVILUPPO-VERTICALE.md)
- Architettura: [02-ARCHITETTURA-FRONTEND.md](02-ARCHITETTURA-FRONTEND.md)
