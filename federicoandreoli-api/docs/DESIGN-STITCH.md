# UI con Google Stitch (riferimento Sitly / Airbnb)

## Obiettivo

Definire in **Stitch** (o strumento equivalente) un kit visivo coerente prima di espandere le schermate React nel repo `federicoandreoli-web`.

## Ordine di lavoro in Stitch

1. **Design tokens**: colori primari/secondari, neutri, stati (success, warning, error), raggio bordi, elevazioni ombre, scala spaziature (4/8 px), breakpoint responsive.
2. **Tipografia**: famiglia font (sistema o web font leggibile), scale per H1–H6, body, caption; line-height generoso (stile marketplace “pulito”).
3. **Componenti base**: pulsante primario/secondario/ghost, input di ricerca, chip filtro, card con immagine + rating + meta, avatar, badge “verificato KYC”.
4. **Layout chiave** (ispirazione [Sitly](https://www.sitly.it/) + pattern tipo Airbnb):
   - Header con logo, lingua, CTA “Accedi / Registrati”.
   - Hero con ricerca principale (ruolo, zona, disponibilità).
   - Griglia risultati / mappa affiancata (desktop) e stack (mobile).
   - Scheda professionista: foto, titoli multipli, area servizio, CTA contatto (lead).
   - Footer con link legali (testi a carico del committente per FRD).

5. **Esportazione verso codice**: annotare valori token e nomi componenti; replicare in `federicoandreoli-web/src/design-system/` (`tokens.css`, `tokens.ts`).

## Webapp

Il FRD copre **web responsive** (non app native). Valutare PWA (manifest + service worker minimo) solo dopo il MVP se serve installazione da home screen.
