# Modulo Professionista (PRO)

Supply side: wizard registrazione 20 step + dashboard professionista post-login.

## Indice funzionalità

| ID | Titolo | Stato | Priorità |
|----|--------|-------|----------|
| [PRO-001](PRO-001.md) | Dashboard home professionista | ✅ Implementato (mock) | P0 |
| [PRO-002](PRO-002.md) | Editor profilo professionista | ✅ Implementato (mock locale) | P0 |
| [PRO-003](PRO-003.md) | Richieste di contatto ricevute | ✅ Implementato (mock) | P0 |
| [PRO-004](PRO-004.md) | Le mie candidature | ✅ Implementato (mock) | P0 |
| [PRO-005](PRO-005.md) | Piano e abbonamento | ✅ Implementato (mock) | P0 |
| [PRO-006](PRO-006.md) | Centro notifiche | ✅ Implementato (mock) | P1 |
| [PRO-007](PRO-007.md) | Modal upgrade Premium | ✅ Mock checkout (Stripe reale pending, SPRINT-08) | P0 |
| [PRO-W01](PRO-W01.md) | Wizard — Ruolo principale | ✅ | P1 |
| [PRO-W02](PRO-W02.md) | Wizard — Anni di esperienza | ✅ | P1 |
| [PRO-W03](PRO-W03.md) | Wizard — Referenze | ✅ | P1 |
| [PRO-W04](PRO-W04.md) | Wizard — Sesso e data di nascita | ✅ | P1 |
| [PRO-W05](PRO-W05.md) | Wizard — Lingua madre | ✅ | P1 |
| [PRO-W06](PRO-W06.md) | Wizard — Altre lingue | ✅ | P1 |
| [PRO-W07](PRO-W07.md) | Wizard — Persone assistite contemporaneamente | ✅ | P1 |
| [PRO-W08](PRO-W08.md) | Wizard — Fascia tariffaria | ✅ | P1 |
| [PRO-W09](PRO-W09.md) | Wizard — Tipo disponibilità | ✅ | P1 |
| [PRO-W10](PRO-W10.md) | Wizard — Griglia settimanale | ✅ | P1 |
| [PRO-W11](PRO-W11.md) | Wizard — Come ti descriveresti | ✅ | P1 |
| [PRO-W12](PRO-W12.md) | Wizard — Altre informazioni | ✅ | P1 |
| [PRO-W13](PRO-W13.md) | Wizard — Presentati (bio) | ✅ | P1 |
| [PRO-W14](PRO-W14.md) | Wizard — Foto profilo | ✅ | P1 |
| [PRO-W15](PRO-W15.md) | Wizard — Nome e cognome | ✅ | P1 |
| [PRO-W16](PRO-W16.md) | Wizard — Indirizzo e comune | ✅ | P1 |
| [PRO-W17](PRO-W17.md) | Wizard — Mobilità e copertura | ✅ | P1 |
| [PRO-W18](PRO-W18.md) | Wizard — Documenti | ✅ | P1 |
| [PRO-W19](PRO-W19.md) | Wizard — Consensi legali | ✅ | P1 |
| [PRO-W20](PRO-W20.md) | Wizard — Invio registrazione | ✅ | P1 |


## Wizard offro — 20 step

Configurazione: `federicoandreoli-web/src/pages/auth/wizard/stepConfig.ts`

| # | Step ID | Doc |
|---|---------|-----|
| 1 | `ruolo-principale` | [PRO-W01](PRO-W01.md) |
| 2 | `anni-esperienza` | [PRO-W02](PRO-W02.md) |
| 3 | `referenze` | [PRO-W03](PRO-W03.md) |
| 4 | `sesso-e-nascita` | [PRO-W04](PRO-W04.md) |
| 5 | `lingua-madre` | [PRO-W05](PRO-W05.md) |
| 6 | `altre-lingue` | [PRO-W06](PRO-W06.md) |
| 7 | `persone-contemporaneamente` | [PRO-W07](PRO-W07.md) |
| 8 | `fascia-tariffaria` | [PRO-W08](PRO-W08.md) |
| 9 | `tipo-disponibilita` | [PRO-W09](PRO-W09.md) |
| 10 | `griglia-settimanale` | [PRO-W10](PRO-W10.md) |
| 11 | `come-ti-descriveresti` | [PRO-W11](PRO-W11.md) |
| 12 | `altre-informazioni` | [PRO-W12](PRO-W12.md) |
| 13 | `presentati` | [PRO-W13](PRO-W13.md) |
| 14 | `foto` | [PRO-W14](PRO-W14.md) |
| 15 | `nome` | [PRO-W15](PRO-W15.md) |
| 16 | `indirizzo` | [PRO-W16](PRO-W16.md) |
| 17 | `mobilita-copertura` | [PRO-W17](PRO-W17.md) |
| 18 | `documenti` | [PRO-W18](PRO-W18.md) |
| 19 | `consensi` | [PRO-W19](PRO-W19.md) |
| 20 | `invio` | [PRO-W20](PRO-W20.md) |

## Dashboard sezioni

| Sezione | ID doc |
|---------|--------|
| Home | [PRO-001](PRO-001.md) |
| Profilo | [PRO-002](PRO-002.md) |
| Richieste | [PRO-003](PRO-003.md) |
| Candidature | [PRO-004](PRO-004.md) |
| Piano | [PRO-005](PRO-005.md) |
| Notifiche | [PRO-006](PRO-006.md) |
| Upgrade modal | [PRO-007](PRO-007.md) |

