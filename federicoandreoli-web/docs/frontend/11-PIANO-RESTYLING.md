# Piano restyling frontend — Apple iOS 2026 Glass

Design system: **glass morphism** (`src/design-system/glass.css`), icone SVG arrotondate (`src/components/icons/DashboardIcons.tsx`), niente emoji.

Principi: chiarezza, profondità, deferenza (Apple HIG). Superfici `backdrop-filter: blur(20px) saturate(180%)`, bordi `rgba(255,255,255,0.18)`, ombre stratificate.

---

## Sprint verticali

| Sprint | Scope | Stato |
|--------|-------|-------|
| **RESTYLE-01** | `DashboardLayout` + `DashboardMessagingSection` — fondazione glass, sidebar/header/tab bar, inbox messaggi | ✅ Completato |
| **RESTYLE-02** | `DashboardNotificationsSection` — lista notifiche, filtri, stati vuoto/errore, badge unread | ✅ Completato |
| **RESTYLE-03** | Dashboard professionista — home welcome, profilo, candidature, billing cards | ✅ Completato |
| **RESTYLE-04** | Dashboard famiglia — home, richieste, candidati, profili salvati (sostituire ★ con icone) | ✅ Completato |
| **RESTYLE-05** | Dashboard agenzia — B2B postings, team, candidati | ✅ Completato |
| **RESTYLE-06** | Dashboard struttura — locations, candidature | ✅ Completato |
| **RESTYLE-07** | Dashboard admin — KPI, moderazione, utenti, ticket | ✅ Completato |
| **RESTYLE-08** | Pagine auth — login, register, wizard, reset password | ✅ Completato |
| **RESTYLE-09** | Pagine pubbliche — home, directory, dettaglio profilo, contatti, legal | ✅ Completato |

---

## RESTYLE-01 — deliverable

- `src/design-system/glass.css` — token e override layout/messaging
- `src/design-system/tokens.css` / `tokens.ts` — palette glass di base
- `src/components/icons/DashboardIcons.tsx` — set icone condiviso
- `DashboardLayout.tsx` — classe `dash-shell--glass`, icone layout, badge Premium senza ★
- `DashboardMessagingSection.tsx` — thread con avatar, bubble glass, input bar, empty states con icone

---

## RESTYLE-02 — deliverable

- `DashboardNotificationsSection.tsx` — card glass, filtri pill, icone per tipo, empty/error/loading con icone
- `DashboardIcons.tsx` — `IconInfo`, `IconCheck`
- `glass.css` — override notifiche (lista, filtri, skeleton shimmer, mark-all button)

---

## RESTYLE-03 — deliverable

- `ProfessionalDashboard.tsx` — sezioni home, profilo, richieste, piano, modal upgrade; icone `DashboardIcons`, welcome con ring completamento
- `ProfessionalApplicationsSections.tsx` — posizioni e candidature glass, empty states con icone
- `DashboardIcons.tsx` — `IconWave`, `IconEye`, `IconClose`, `IconCheckMark`, `IconUpload`, `IconTrendUp`, `IconCreditCard`
- `glass.css` — override dashboard professionista (card, form, badge, req/app, plan, modal, settings)

---

## RESTYLE-04 — deliverable

- `FamilyDashboard.tsx` — sezioni home, richieste, candidature, salvati, nuova richiesta; icone `DashboardIcons`, rating con `IconStar`/`IconStarFilled`, empty states con icone
- `DashboardIcons.tsx` — `IconStarFilled`, `IconPlus`, `IconList`, `IconHeart`, `IconEdit`
- `glass.css` — override dashboard famiglia (welcome banner, tabella, candidate row, saved card, rating, avail tag, badge, settings)

---

## RESTYLE-05 — deliverable

- `AgencyDashboard.tsx` — overview welcome/KPI/chart, profilo agenzia, abbonamento B2B; icone `DashboardIcons`, stat cards glass
- `B2BPostingsSection.tsx` — tabella annunci, empty/loading/error con icone
- `B2BCandidatesSection.tsx` — lista candidature glass, filtri, empty/error con icone
- `OrganizationLocationsSection.tsx` — sedi operative, form sede, alert/success glass
- `TeamMembersSection.tsx` — griglia team glass, invite form, empty/error con icone
- `DashboardIcons.tsx` — `IconGrid`, `IconMapPin`
- `glass.css` — override agency/B2B (chart, revenue row, team card, locations, b2b alerts, profile form)

---

## RESTYLE-06 — deliverable

- `StructureDashboard.tsx` — overview welcome/KPI/chart turni, profilo struttura, staff/reparti, abbonamento Premium RSA; icone `DashboardIcons`, welcome banner sage
- `glass.css` — override struttura (badge Struttura RSA, welcome sage, turni panel, staff card/badge, plan Premium RSA)

---

## RESTYLE-07 — deliverable

- `AdminDashboard.tsx` — overview KPI/chart/export, utenti, richieste, abbonamenti, ticket, KYC, moderazione B2B, impostazioni piattaforma, account; icone `DashboardIcons`, welcome banner admin
- `glass.css` — override admin (KPI, filters, tickets, verify cards, modals, settings rows, badge priority/status, ticket thread bubbles)

---

## RESTYLE-08 — deliverable

- `AuthShell.tsx` — classe `auth-shell--glass` su tutte le pagine auth
- `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` — icone `DashboardIcons`, link back con `IconChevronLeft`
- `WizardShell.tsx` — classe `wz-shell--glass`, back con `IconChevronLeft`
- `RegisterIntentWizardPage.tsx`, `RegisterFinePage.tsx`, `OfferWizardPage.tsx` — icone condivise, checkmark su pill/chip/avail
- `IscrizioneLandingPage.tsx` — trust pills e benefit con `DashboardIcons`
- `DashboardIcons.tsx` — `IconLock`, `IconEyeOff`
- `glass.css` — token auth (`--glass-auth-*`), override shell/card/input/OTP/demo/wizard/iscrizione landing

---

## RESTYLE-09 — deliverable

- `SiteShell.tsx` — classe `site-shell--glass` su tutte le pagine pubbliche
- `SiteHeader.tsx`, `SiteFooter.tsx` — icone `DashboardIcons` (menu, info, cuore, stella)
- `HomePage.tsx`, `HomeProfileCarousel.tsx` — icone condivise, frecce `IconChevronRight`
- `ProfilesDirectoryPage.tsx`, `ProfileDetailPage.tsx`, `StructureDetailPage.tsx`, `OpenPositionDetailPage.tsx` — badge verificato e rating con `DashboardIcons` (niente ✓/★ testuali)
- `ProfileRatingCompact.tsx` — `IconStar` al posto dell’SVG inline
- `ComeFunzionaPage.tsx`, `ContattiPage.tsx` — icone step/trust/form con `DashboardIcons`
- `glass.css` — override pubblico (topbar, footer, hero, profile cards, directory intro, detail, home steps, contatti)

**Piano restyling:** RESTYLE-01 … RESTYLE-09 — **completato**.

---

- Importare `glass.css` via `index.css` (dopo `tokens.css`)
- Attivare glass sul layout con `dash-shell--glass` su `DashboardLayout`
- Non alterare logica/hook/API — solo CSS e markup presentazionale
- Eseguire `npm run build` a fine ogni sprint
