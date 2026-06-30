# CiviScraper – Fertige Daten

Stand: 2026-06-22

## Inhalt

| Ordner | Inhalt |
|--------|--------|
| `links/` | Rohe Link-Sammlungen je Bundesland |
| `vereinsseiten/` | Vereinsseiten-Übersichten je Bundesland |
| `vereinsseiten_ags/` | Wie `vereinsseiten/`, aber mit AGS-Feld |

## Bestand

| Bundesland | Link-Einträge | Gemeinden | davon mit Treffer | AGS gemappt |
|------------|-------------:|----------:|------------------:|------------:|
| Baden-Württemberg | 134.964 | 1.101 | 915 | 1.055 |
| Bayern | 208.342 | 2.056 | 1.650 | 2.055 |
| Brandenburg | 42.733 | 413 | 327 | 413 |
| Hessen | 73.168 | 421 | 363 | 421 |
| Mecklenburg-Vorpommern | 70.709 | 725 | 420 | 725 |
| Niedersachsen | 117.461 | 939 | 645 | 939 |
| Nordrhein-Westfalen | 70.753 | 396 | 272 | 396 |
| Saarland | 5.928 | 52 | 43 | 52 |
| Sachsen | 51.435 | 418 | 339 | 416 |
| Sachsen-Anhalt | 24.907 | 218 | 150 | 217 |
| Schleswig-Holstein | 103.394 | 1.104 | 653 | 1.101 |
| Thüringen | 44.336 | 601 | 383 | 601 |
| **Gesamt** | **948.130** | **8.444** | **6.160** | **8.395** |

## Datenformat

### `links/`
```json
[{ "url": "...", "text": "...", "source": "..." }, ...]
```

### `vereinsseiten/`
```json
[{
  "name": "Abensberg",
  "typ": "Stadt",
  "quelle_url": "...",
  "webseite": "https://www.abensberg.de",
  "bundesland": "Bayern",
  "vereinsseiten": [{ "titel": "Vereine", "url": "..." }]
}, ...]
```

### `vereinsseiten_ags/`
```json
[{
  "name": "Abensberg",
  "typ": "Stadt",
  "quelle_url": "...",
  "webseite": "https://www.abensberg.de",
  "bundesland": "Bayern",
  "ags": "09273111",
  "vereinsseiten": [{ "titel": "Vereine", "url": "..." }]
}, ...]
```

AGS: 8-stellig, Format `Land(2) + RB(1) + Kreis(2) + Gem(3)`, Quelle: Destatis de.csv (Stand 30.09.2025).
