# Zeitstrahl CH – Geschichte & RZG interaktiv

Interaktive Zeitstrahlen für den Unterricht: Überblick mit zwei Spuren (z. B. Welt / Schweiz),
«Datum schätzen», «Sortier-Sprint» und «Selbst bauen».

## Funktionen

| Funktion | Ohne Login | Mit Lehrpersonen-Login |
|---|---|---|
| Standard-Themen (2. Weltkrieg & Schweiz, Industrialisierung, 1. Weltkrieg) | ✓ | ✓ |
| Eigene Zeitstrahlen bauen | ✓ (auf dem Gerät / als Datei) | ✓ (Cloud, auf allen Geräten) |
| KI-Chat: Prompt kopieren → Antwort einfügen | ✓ | ✓ |
| KI direkt (Gemini, Schlüssel aus dem Konto wie im Sek Planer) | – | ✓ |
| Bilder aus Wikipedia/Wikimedia Commons mit Urheber & Lizenz | ✓ | ✓ |
| Thema für die Klasse freigeben (QR-Code, Link) | nur Standard-Themen | ✓ |
| Abgabe-Aufträge (Code) und Abgaben ansehen | Abgeben ✓ | Aufträge erstellen ✓ |

## Aufrufe

- `./` – App
- `./?topic=ww2` – Standard-Thema direkt öffnen
- `./?t=<ID>` – freigegebenes Thema einer Lehrperson (nur lesen)
- `./?abgabe=1234` – Auftrag öffnen und Zeitstrahl abgeben

## Daten

- Firebase Firestore, Projekt «Unterrichtscockpit» (Region europe-west6, Zürich).
- `zeitstrahlTopics/<ID>` – Themen der Lehrperson; lesbar für alle nur, wenn freigegeben.
- `zeitstrahlTasks/<Code>/submissions/<Geräteschlüssel>` – Abgaben; nur die Lehrperson sieht die Liste.
- Schüler/innen brauchen kein Konto. Nur Vornamen verwenden.
- `firestore.rules` ist eine Kopie der aktiven Regeln (gemeinsam mit Sek Planer, Zufallsgenerator und Lightning).
