# Scelta database (FRD vs infrastruttura)

## Requisito FRD

Il documento funzionale prevede ricerca geospaziale avanzata e, in fase evolutiva, **PostGIS** (PostgreSQL) e microservizi Python per il calcolo spaziale.

## Opzioni

| Opzione | Pro | Contro |
|---------|-----|--------|
| **MySQL** (tipico su hosting condiviso Hostinger) | Facile provisioning, indici SPATIAL base | Funzioni spaziali meno ricche di PostGIS |
| **PostgreSQL + PostGIS** | Allineamento lungo termine al FRD, query geografiche robuste | Richiede piano/VPS che offra PostgreSQL o servizio gestito esterno |

## Raccomandazione

- **MVP / hosting solo MySQL**: usare `DB_CONNECTION=mysql` con tipi `POINT` / indici `SPATIAL` dove necessario; accettare limiti fino alla fase 2.
- **Allineamento massimo al FRD**: PostgreSQL con estensione PostGIS sullo stesso VPS o DB gestito; aggiornare `config/database.php` e migrazioni (tipi geometrici, indici GIST).

La decisione va presa **prima** di modellare tabelle con coordinate e raggi di copertura, per evitare riscritture di migrazioni.
