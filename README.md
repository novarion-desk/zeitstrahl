# Zeitstrahl – Geschichte & RZG interaktiv

Interaktive Zeitstrahlen für den Unterricht: Überblick mit zwei Spuren (z. B. Welt / Schweiz),
«Datum schätzen», «Quiz», «Sortier-Sprint» und «Selbst bauen».

## Funktionen

| Funktion | Ohne Login | Mit Lehrpersonen-Login |
|---|---|---|
| 10 Standard-Themen (Antike, Mittelalter, Französische Revolution, Reformation neu, im Faktencheck; Alte Eidgenossenschaft, Industrialisierung, 1. Weltkrieg, 2. Weltkrieg, Kalter Krieg, Frauenstimmrecht – je mit Schweizer Spur) | ✓ | ✓ |
| Eigene Zeitstrahlen bauen | ✓ (auf dem Gerät / als Datei) | ✓ (Cloud, auf allen Geräten) |
| KI-Chat: Prompt kopieren → Antwort einfügen | ✓ | ✓ |
| KI direkt (Gemini, Claude, ChatGPT oder Mistral; ein Schlüsselfeld, Anbieter wird erkannt; Schlüssel wie im Sek Planer) | – | ✓ |
| KI-Assistent: Änderungen in eigenen Worten oder per Schnellknopf (+5 Ereignisse, Texte −50 %, mehr Schweiz …), mit Vorschau und Rückgängig | – | ✓ |
| KI pro Ereignis im Steckbrief (neu schreiben, kürzer, länger, neue Denkfrage) | – | ✓ |
| Bearbeiten: einzelne Ereignisse anpassen, löschen, Bild ändern; Rückgängig | ✓ | ✓ |
| Design-Panel: Schrift, Grösse, Kartenstil, Hintergrund, Abstand, Farben | ✓ | ✓ |
| Bilder aus Wikipedia/Wikimedia Commons mit Urheber & Lizenz | ✓ | ✓ |
| Thema für die Klasse freigeben (QR-Code, Link) | nur Standard-Themen | ✓ |
| Abgabe-Aufträge (Code) und Abgaben ansehen | Abgeben ✓ | Aufträge erstellen ✓ |
| Import (Drag & Drop, Einfügen, Word/Excel/PDF/CSV) mit Kontrollübersicht | ✓ | ✓ + KI für Fliesstext und Ergänzungen |
| Export: Heft-PDF, Poster-PDF, Arbeitsblatt-PDF, Webseite (.html), Bild (.png) | ✓ | ✓ |
| Datum (Tag/Monat) ein-/ausblendbar, «Ausführlich»-Text im Steckbrief | ✓ | ✓ |
| Farbpaletten, Beamer-Modus | ✓ | ✓ |

## Aufrufe

- `./` – App
- `./?topic=ww2` – Standard-Thema direkt öffnen
- `./?t=<ID>` – freigegebenes Thema einer Lehrperson
- `&ansicht=1` – an `?topic=` oder `?t=` anhängen: reine Schüleransicht (nichts veränderbar). Teilen-Links enthalten das automatisch.
- `./?abgabe=1234` – Auftrag öffnen und Zeitstrahl abgeben

## Daten

- Firebase Firestore, Projekt «Unterrichtscockpit» (Region europe-west6, Zürich).
- `zeitstrahlTopics/<ID>` – Themen der Lehrperson; lesbar für alle nur, wenn freigegeben.
- `zeitstrahlTasks/<Code>/submissions/<Geräteschlüssel>` – Abgaben; nur die Lehrperson sieht die Liste.
- Schüler/innen brauchen kein Konto. Nur Vornamen verwenden.
- `firestore.rules` ist eine Kopie der aktiven Regeln (gemeinsam mit Sek Planer, Zufallsgenerator und Lightning).

## Feedback
Der Knopf «💬 Feedback» öffnet ein externes, anonymes Formular bei Tally (Fehler, Wünsche, Inhalte). Nur dann werden Angaben gesendet – zusammen mit App-Name, Version und Gerätetyp. Namen werden nicht abgefragt.
