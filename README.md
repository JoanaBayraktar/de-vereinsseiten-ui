# CiviScraper – Fortschrittsübersicht

Stand: 2026-05-26

## Legende
- **Gemeinden**: Anzahl Einträge in `lists/gemeinden_webseiten_*.json`
- **Links gecrawlt**: Gesamtanzahl gefundener URLs in `results/links_*.json` (Tiefe 0–2)
- **Vereinsseiten**: Anzahl gefilterte Vereinsseiten in `results/*_vereinsseiten.json`

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

## Fertig gecrawlt (7 von 16)

| Bundesland           | Gemeinden | Links gecrawlt | Vereinsseiten |
|----------------------|----------:|---------------:|--------------:|
| Brandenburg          |       413 |         42.733 |           413 |
| Hessen               |       421 |         73.168 |           421 |
| Niedersachsen        |       939 |        117.461 |           939 |
| Nordrhein-Westfalen  |       396 |         70.753 |           396 |
| Saarland             |        52 |          5.928 |            52 |
| Sachsen              |       418 |         51.435 |           418 |
| Sachsen-Anhalt       |       218 |         24.907 |           218 |
| **Gesamt**           | **2.857** |    **386.385** |         **2.857** |

---

## Unvollständig gecrawlt (1 von 16)

| Bundesland | Gemeinden | Links gecrawlt | Vereinsseiten | Anmerkung                    |
|------------|----------:|---------------:|--------------:|------------------------------|
| Bayern     |     2.056 |          2.056 |         2.056 | Nur Tiefe 0 (Start-URLs)     |

---

## Noch nicht gecrawlt (8 von 16)

| Bundesland              | Gemeinden |
|-------------------------|----------:|
| Baden-Württemberg       |     1.101 |
| Berlin                  |       109 |
| Bremen                  |        20 |
| Hamburg                 |         7 |
| Mecklenburg-Vorpommern  |       725 |
| Rheinland-Pfalz         |     2.299 |
| Schleswig-Holstein      |     1.104 |
| Thüringen               |       601 |
| **Gesamt**              | **5.966** |

---

## Zusammenfassung

| Status              | Bundesländer | Gemeinden |
|---------------------|-------------:|----------:|
| Fertig gecrawlt     |            7 |     2.857 |
| Unvollständig       |            1 |     2.056 |
| Noch nicht gecrawlt |            8 |     5.966 |
| **Total**           |       **16** |**10.879** |

Fortschritt: **7/16 Bundesländer** fertig (~44 %)
