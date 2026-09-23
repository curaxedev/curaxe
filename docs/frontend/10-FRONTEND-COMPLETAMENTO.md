# 10 — Frontend completamento (executive summary)

> **Stato:** frontend mock-first **COMPLETO** — SPRINT-01 … SPRINT-22 (2026-06-04).  
> **Prossima fase:** integrazione backend Laravel (vedi checklist handoff sotto).

---

## Cosa è stato costruito (per persona)

### Visitatore / famiglia (UT)

- Sito pubblico: homepage, directory profili, posizioni aperte, dettaglio profilo/posizione, come funziona, landing iscrizione
- Wizard registrazione seeker (9 step) con submit mock e draft localStorage
- Login OTP (professionista/famiglia) e password reset mock
- Dashboard famiglia: richieste, candidature, salvati, messaggi, notifiche, impostazioni account
- Cookie consent GDPR + analytics opt-in
- Pagina `/contatti` con form mock

### Professionista (PRO)

- Wizard registrazione offer (20 step) con submit mock
- Dashboard: home KPI, editor profilo con PATCH mock, candidature, posizioni, messaggi, notifiche, piano Premium
- Checkout Premium mock (embedded o redirect pagina demo)
- Contatto da profilo pubblico → inbox

### Agenzia B2B (STR — agency)

- Dashboard dedicata `/dashboard/agenzia`
- Wizard annunci 7 step, modifica con versioning, moderazione admin
- Pipeline candidature, export CSV, multi-sede, team members, messaggi B2B
- Abbonamento Business mock, notifiche polling

### Struttura RSA (STR — structure)

- Dashboard dedicata `/dashboard/struttura` (split da agenzia — STR-014)
- Copy e KPI RSA-specifici, wizard «Nuovo turno»
- Premium RSA separato (`structure_premium_monthly`)
- Stesse capability B2B: annunci, candidature, sedi, team, messaggi, export

### Admin piattaforma (ADM)

- Dashboard `/dashboard/admin` con RBAC
- Overview KPI + export CSV/JSON
- Utenti (lista, filtri, sospendi, dettaglio ADM-011)
- KYC queue approve/reject + viewer documenti
- Moderazione annunci B2B, ticket assistenza, impostazioni piattaforma persistite
- Abbonamenti read-only, analytics export

---

## Architettura — mappa services layer

Pattern: **`hooks/` → `services/*Service.ts` → `lib/*Api.ts` → mock store o fetch Laravel**

| Servizio | Dominio | Sprint | Store / note |
|----------|---------|--------|--------------|
| `authService` | Login OTP/password, sessione | 01–02 | sessionStorage |
| `registrationService` | Wizard seeker/offer submit | 03 | localStorage |
| `professionalProfileService` | Profilo PRO CRUD | 04 | localStorage |
| `familyRequestService` | Richieste famiglia | 05 | localStorage |
| `adminKycService` | Coda verifica KYC | 06 | localStorage |
| `directoryService` | Directory profili/strutture/posizioni | 07 | merge mock + job postings |
| `billingService` | Stripe checkout mock, piani | 08 | localStorage |
| `contactService` | Form contatti | 09 | mock POST |
| `jobPostingService` | Annunci B2B CRUD + moderazione | 11, 22 | localStorage |
| `applicationService` | Candidature bidirezionali | 12 | localStorage |
| `adminUserService` | Admin utenti | 13 | localStorage |
| `notificationService` | Notifiche polling 30s | 14 | localStorage |
| `passwordResetService` | Reset password | 16 | sessionStorage tokens |
| `accountSettingsService` | Impostazioni account | 16 | localStorage per userId |
| `locationService` | Multi-sede org | 18 | localStorage per orgId |
| `messagingService` | Inbox thread | 19–20 | localStorage globale |
| `adminTicketService` | Ticket assistenza | 21 | localStorage |
| `adminSettingsService` | Settings piattaforma | 21 | localStorage |
| `adminJobModerationService` | Moderazione annunci | 22 | via jobPostingService |
| `teamMemberService` | Team org | 22 | localStorage per orgId |

**Config runtime:** `federicoandreoli-web/src/lib/runtimeConfig.ts` — `VITE_USE_MOCKS` (default `true`), `VITE_API_URL`, `VITE_STRIPE_ENABLED`.

**Auth / routing:** `AuthProvider`, `ProtectedRoute`, `GuestOnlyRoute`, `roleDashboard.ts`.

---

## Account demo

| Email | Ruolo | Accesso | Password / OTP |
|-------|-------|---------|----------------|
| `maria.rossi@email.it` | professional | OTP | Codice demo: `123456` |
| `bianchi@email.it` | public_user (famiglia) | OTP | Codice demo: `123456` |
| `info@auracare.it` | agency | Password + TOTP mock | `DemoPass123!` |
| `info@villaserena.it` | structure | Password + TOTP mock | `DemoPass123!` |
| `admin@assistenzafacile.it` | platform_admin | Password + TOTP mock | `DemoPass123!` |

Fixture: `federicoandreoli-web/src/mocks/authFixtures.ts`

Gate dev-only: `/dashboard` (solo `import.meta.env.DEV`).

---

## Come eseguire / build / test manuali

```bash
cd federicoandreoli-web
npm install
cp .env.example .env
# VITE_USE_MOCKS=true (default) — nessuna API Laravel richiesta per demo completa
npm run dev
```

| Comando | Scopo |
|---------|-------|
| `npm run dev` | Dev server Vite (default `:5173`) |
| `npm run build` | Typecheck + build produzione → `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview build locale |

**Verifica manuale consigliata (smoke):**

1. Login con ogni account demo → redirect dashboard corretta per ruolo
2. Famiglia: pubblica richiesta → compare in «Le mie richieste»
3. PRO: modifica profilo → completion % aggiornata
4. Agenzia: «Nuovo annuncio» → wizard → moderazione admin → annuncio in directory
5. `/contatti` → form submit toast success
6. Messaggi: «Contatta candidato» B2B → thread in inbox
7. Admin: approve KYC → badge verificato su `/profili/:id`

Con API Laravel locale: `VITE_API_URL` vuoto + `php artisan serve` (:8000) + proxy Vite.

---

## Handoff checklist — Fase 2 Backend Laravel

Prima di considerare go-live, il team backend deve:

- [ ] **Auth:** collegare `authApi.ts` a OTP email Laravel + Sanctum session; deprecare `demoAuthSession.ts`
- [ ] **Registrazione:** `POST /api/v1/registrations/*` per seeker e professional wizard
- [ ] **Profilo PRO:** GET/PATCH profilo + completion server-side
- [ ] **Richieste famiglia:** CRUD richieste + enforcement piano FREE
- [ ] **Directory:** profili, strutture, posizioni con geo filter e paginazione
- [ ] **B2B:** job postings, candidature, multi-sede, team, moderazione workflow
- [ ] **Admin:** utenti, KYC, ticket, settings, analytics export server-side (opzionale mantenere client export)
- [ ] **Billing:** Stripe Checkout Session + webhook → aggiornamento piano
- [ ] **Messaging / notifiche:** persistenza DB; valutare WebSocket vs polling
- [ ] **Email:** OTP, password reset, inviti team, notifiche transazionali
- [ ] **Contatti:** `POST /api/v1/contact` → ticket o inbox supporto
- [ ] **Env produzione:** `VITE_USE_MOCKS=false`, `VITE_STRIPE_ENABLED=true`, `VITE_API_URL` corretto
- [ ] **Test E2E:** Playwright o equivalente su flussi P0
- [ ] **Deploy SPA:** rewrite `/*` → `index.html` (vedi README progetto)

Riferimenti backend: `federicoandreoli-api/docs/AUTH.md`, `routes/api.php`.

---

## Riferimenti

- Gap residui: [07-STATO-ATTUALE-GAP-ANALYSIS.md](07-STATO-ATTUALE-GAP-ANALYSIS.md)
- Piano sprint completati: [08-PIANO-SVILUPPO-VERTICALE.md](08-PIANO-SVILUPPO-VERTICALE.md)
- Architettura: [02-ARCHITETTURA-FRONTEND.md](02-ARCHITETTURA-FRONTEND.md)
