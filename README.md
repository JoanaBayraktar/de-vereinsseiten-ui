# CiviScraper – Fortschrittsübersicht

Stand: 2026-06-09

## Legende
- **Gemeinden**: Anzahl Einträge in `lists/gemeinden_webseiten_*.json`
- **Link-Einträge**: Gesamtanzahl gefundener URLs in `results/links_*.json`
- **Link-Quellen**: Anzahl unterschiedlicher Gemeinden/Startseiten in `results/links_*.json`
- **Ergebnis-Einträge**: Anzahl Einträge in `results/*_vereinsseiten.json`
- **Gemeinden mit Treffer**: Gemeinden mit mindestens einem Eintrag in `vereinsseiten`
- **Vereinsseiten-Links**: Gesamtanzahl gefundener Vereinsseiten-Links

---

## Diagnose-CLI

Die wichtigsten Debug- und Auswertungsskripte sind über `diagnostics.js` gebündelt:

```bash
node diagnostics.js all-links https://www.example.de --depth=1
node diagnostics.js test-crawl https://www.example.de
node diagnostics.js missing
node diagnostics.js diagnose
node diagnostics.js uncrawled
node diagnostics.js single
node diagnostics.js report
```

| Befehl | Zweck |
|--------|-------|
| `all-links` | Einzel-URL-Debug-Crawler; gibt erreichbare Links einer Seite aus. |
| `test-crawl` | Problemfall-/Cloudflare-Diagnose für einzelne URLs. |
| `missing` | Findet Gemeinden ohne Vereinsseiten-Link bzw. nicht gescrapte Bundesländer. |
| `diagnose` | Erklärt fehlende Treffer mit `KEIN_CRAWL`, `EXCLUDED` oder `KEIN_TREFFER`. |
| `uncrawled` | Listet Gemeinden, bei denen der Link-Crawl keine Unterseiten fand. |
| `single` | Findet Gemeinden mit genau einem Vereinsseiten-Treffer. |
| `report` | Führt `missing`, `diagnose`, `uncrawled` und `single` nacheinander aus. |

Hinweis: Einige Befehle schreiben JSON-Dateien in `results/`, z. B. `fehlende_vereinsseiten.json`, `diagnose_missing_vereine.json` oder `single_link_gemeinden.json`.

---

## Aktueller Stand

| Bundesland | Gemeinden | Link-Einträge | Link-Quellen | Ergebnis-Einträge | Gemeinden mit Treffer | Ohne Treffer | Vereinsseiten-Links | Status |
|------------|----------:|--------------:|-------------:|-------------------:|----------------------:|-------------:|--------------------:|--------|
| Baden-Württemberg | 1.101 | — | — | — | — | — | — | Noch nicht gecrawlt |
| Berlin | 109 | — | — | — | — | — | — | Noch nicht gecrawlt |
| Brandenburg | 413 | 42.733 | 408 | 413 | 327 | 86 | 446 | Fertig |
| Bremen | 20 | — | — | — | — | — | — | Noch nicht gecrawlt |
| Hamburg | 7 | — | — | — | — | — | — | Noch nicht gecrawlt |
| Hessen | 421 | 73.168 | 419 | 421 | 363 | 58 | 1.187 | Fertig |
| Mecklenburg-Vorpommern | 725 | — | — | — | — | — | — | Noch nicht gecrawlt |
| Niedersachsen | 939 | 117.461 | 839 | 939 | 645 | 294 | 1.938 | Fertig |
| Nordrhein-Westfalen | 396 | 70.753 | 396 | 396 | 272 | 124 | 617 | Fertig |
| Rheinland-Pfalz | 2.299 | 7.769 | 104 | 2.299 | 82 | 2.217 | 114 | In Bearbeitung |
| Saarland | 52 | 5.928 | 52 | 52 | 43 | 9 | 94 | Fertig |
| Sachsen | 418 | 51.435 | 417 | 418 | 339 | 79 | 909 | Fertig |
| Sachsen-Anhalt | 218 | 24.907 | 195 | 218 | 150 | 68 | 241 | Fertig |
| Schleswig-Holstein | 1.104 | 103.394 | 1.091 | 1.104 | 653 | 451 | 1.557 | Fertig |
| Thüringen | 601 | 44.336 | 570 | 601 | 383 | 218 | 856 | Fertig |
| **Gesamt** | **8.823** | **541.884** | **4.491** | **6.861** | **3.257** | **3.604** | **7.959** | — |

---

## Zusammenfassung

| Status | Bundesländer | Gemeinden |
|--------|-------------:|----------:|
| Fertig | 9 | 4.562 |
| In Bearbeitung | 1 | 2.299 |
| Noch nicht gecrawlt | 5 | 1.962 |
| **Total (ohne Bayern)** | **15** | **8.823** |

Fortschritt: **9/15 Bundesländer** abgeschlossen (ohne Bayern); **3.257/6.861** Ergebnis-Einträge haben mindestens einen Vereinsseiten-Treffer.
