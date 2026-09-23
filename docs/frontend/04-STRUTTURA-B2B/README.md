# Modulo Struttura B2B (STR)

Funzionalità per **agenzie** e **strutture RSA**. Il frontend distingue entrambi: `AgencyDashboard` su `/dashboard/agenzia` e `StructureDashboard` su `/dashboard/struttura` (SPRINT-10).

## Indice funzionalità

| ID | Titolo | Stato | Priorità |
|----|--------|-------|----------|
| [STR-001](STR-001.md) | Overview struttura/agenzia | ✅ Implementato (mock) | P0 |
| [STR-002](STR-002.md) | Gestione annunci | ✅ Implementato (mock) | P0 |
| [STR-003](STR-003.md) | Candidature ricevute | ✅ Implementato (mock) | P0 |
| [STR-004](STR-004.md) | Profilo agenzia/struttura | ✅ Implementato (mock) | P0 |
| [STR-005](STR-005.md) | Team professionisti | ✅ Implementato (mock) | P1 |
| [STR-006](STR-006.md) | Creazione nuovo annuncio | ✅ Implementato (wizard, SPRINT-11) | P0 |
| [STR-007](STR-007.md) | Modifica annuncio | ✅ Implementato (wizard + versioning, SPRINT-11) | P1 |
| [STR-008](STR-008.md) | Pausa e ripresa annuncio | 🟡 Parziale (stati base) | P1 |
| [STR-009](STR-009.md) | Pipeline selezione candidato | 🟡 Parziale (stati + contatto; no colloquio/offerta) | P1 |
| [STR-010](STR-010.md) | Profilo pubblico in directory | ✅ Implementato (mock directory) | P1 |
| [STR-011](STR-011.md) | Invito membro team | ✅ Mock-first (SPRINT-22) | P2 |
| [STR-012](STR-012.md) | Statistiche performance annunci | 🟡 Parziale (chart mock) | P2 |
| [STR-013](STR-013.md) | Notifiche struttura | ✅ Implementato (mock polling) | P1 |
| [STR-014](STR-014.md) | Split ruolo structure vs agency | ✅ Implementato (SPRINT-10) | P0 |
| [STR-P01](STR-P01.md) | Piano Premium struttura | ✅ Mock-first (SPRINT-22) | P1 |
| [STR-P02](STR-P02.md) | Multi-sede / filiali | ✅ Implementato (mock, SPRINT-18) | P2 |
| [STR-P03](STR-P03.md) | Export CSV candidature | ✅ Implementato (mock) | P2 |


## Route dashboard B2B

| Ruolo backend | Route frontend |
|---------------|----------------|
| `UserRole::Agency` | `/dashboard/agenzia` |
| `UserRole::Structure` | `/dashboard/struttura` |

## Brand

Brand unificato **Federico Andreoli** via `src/lib/brand.ts` (SPRINT-09).
