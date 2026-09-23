# Piano polish frontend — premium UI pass

Design system base: glass (`glass.css`), motion (`motion.css`), polish layer (`polish.css`).

Principi: tipografia coerente, micro-interazioni deferenti, profondità stratificata, accessibilità (`prefers-reduced-motion`, focus-visible). Nessun emoji. Public site: superfici solide, no backdrop-filter pesante.

---

## Sprint verticali

| Sprint | Scope | Stato |
|--------|-------|-------|
| **POLISH-01** | Design system micro-refinements + cross-cutting polish (typography, motion, surfaces, public header/footer/hero/cards, dashboard shared, auth) | ✅ Completato |
| **POLISH-02** | Home page deep polish — sezioni steps/cities/open-pos, carousel motion, FAQ accordion, CTA band, scroll reveal rhythm | ✅ Completato |
| **POLISH-03** | Directory + detail pages — filtri sticky, skeleton loading, profile/structure hero, aside cards, breadcrumb | ✅ Completato |
| **POLISH-04** | Dashboard messaging + notifications — thread transitions, compose bar, filter pills, empty states, toast stack | ✅ Completato |
| **POLISH-05** | Dashboard role views — pro/family/agency/structure/admin KPI charts, forms, modals, plan cards | ✅ Completato |
| **POLISH-06** | Auth funnel + legal/contatti + QA finale — wizard steps, OTP, cookie banner, a11y audit, perf budget | ✅ Completato |

---

## POLISH-01 — deliverable

- `src/design-system/tokens.css` — type scale (display/title/body/caption/overline), shadow 4-level, border subtlety, touch target
- `src/design-system/motion.css` — duration/easing tokens, reduced-motion, focus ring, button/card transitions
- `src/design-system/polish.css` — cross-cutting overrides (buttons, inputs, cards, nav, modals, public + dash + auth)
- `src/index.css` — import motion + polish dopo glass
- `src/design-system/glass.css` — typography token alignment, stat KPI tabular nums

**Aree coperte:**
- Typography & rhythm (letter-spacing labels, line-height body, tabular nums KPI)
- Motion & interaction (button lift, card hover, nav transitions, focus rings)
- Surfaces & depth (shadow scale, input 44px, button variants)
- Public: hero hierarchy, profile cards, header pill, footer links
- Dashboard: nav indicator, avatar ring, stat cards, tables, modals
- Auth: demo panel hierarchy, wizard progress bar

---

## POLISH-02 — deliverable

- `HomePage.tsx` — `type-overline` / `type-title` su sezioni; griglia steps con connettori
- `HomeProfileCarousel.tsx` — transizione track delegata a CSS
- `HomeOpenPositionsSection.tsx` — titolo con token `type-title`
- `polish.css` sezione O — band rhythm, steps/cities/carousel/open-pos/FAQ/ready, scroll-margin anchor

---

## POLISH-03 — deliverable

- `ProfilesDirectoryPage.tsx` — skeleton grid loading, `polish-crumb`, empty/error `polish-state-panel`
- `ProfileDetailPage.tsx`, `StructureDetailPage.tsx`, `OpenPositionDetailPage.tsx` — `polish-crumb`, hero skeleton, empty states; structure hero photo ring
- `polish.css` sezione **P** — sticky geo bar solid surface, grid gap, card hover, shimmer skeleton, hero/aside/breadcrumb/CTA polish

---


## POLISH-04 — deliverable

- `DashboardMessagingSection.tsx` — `polish-msg-feed` wrapper, empty states `polish-state-panel`
- `DashboardNotificationsSection.tsx` — empty states `polish-state-panel`
- `ProfessionalDashboard.tsx`, `AdminDashboard.tsx` — toast `polish-toast` class
- `polish.css` sezione **Q** — thread slide-in/active, bubble stagger, compose send pulse, filter pill spring, unread dot pulse, toast enter/stack, notif list entrance

---

## POLISH-05 — deliverable

- `DashboardLayout.tsx` — `polish-dash-section` wrapper con key su nav switch
- `AdminDashboard.tsx` — chart bar groups + tooltip, export `polish-export-btn`
- `AgencyDashboard.tsx`, `StructureDashboard.tsx` — chart bar hover/tooltip groups
- `B2BPostingsSection.tsx`, `B2BCandidatesSection.tsx` — export `polish-export-btn`
- `FamilyDashboard.tsx` — form errors `dash-form-error`
- `polish.css` sezione **R** — welcome banner depth, chart bar hover/tooltip, form shake, plan glow, export buttons, ticket priority badges, table row consistency, section fade

---

## POLISH-05 — scope (riferimento)

- Role dashboards: welcome banner parallax subtle, chart tooltip styling
- Form field error shake (reduced-motion off), plan card featured glow
- Admin KPI export button, ticket priority color refinement

---

## POLISH-06 — scope

- Auth wizard all steps, OTP digit focus chain, iscrizione landing proof metrics
- Legal pages typography, contatti form success state
- Lighthouse/a11y pass, contrast audit, print stylesheet

---

## POLISH-06 — deliverable

- `src/design-system/a11y.css` — skip link, extended focus-visible, contrast labels, reduced-motion
- `src/design-system/polish.css` sezione **S** — OTP chain glow, wizard chip/pill states, demo panel hierarchy, success animations, isl proof/trust, legal rhythm, contatti alert enter, print rules
- `SiteShell.tsx`, `AuthShell.tsx` — skip link + main landmark id
- `LoginPage.tsx` — OTP chain wrapper
- `RegisterFinePage.tsx` — success ring animation class

**Piano polish frontend: COMPLETE ✅**

---

## Regole operative

- CSS/JSX solo dove servono class names — logica/hook/API intatti
- Mantenere scroll fixes e header sticky da sprint precedenti
- No backdrop-filter pesante sul public site
- `npm run build` a fine ogni sprint
