# Unterricht: Stunden planen mit Claude

Das Plugin „unterricht“ plant mit einem einzigen Befehl eine Unterrichtsstunde. Am Ende hast du einen Verlaufsplan als Datei in deinem Arbeitsordner und das Tafelbild als Seite in deinem OneNote-Notizbuch.

Bevor du etwas zu sehen bekommst, prüft Claude den Plan und das Tafelbild gegen deine eigenen Kriterien und überarbeitet sie, bis sie passen. Alles, was für deine Schule gilt (Stundenlänge, Phasenmodell, besondere Regeln, wie dein Notizbuch aufgebaut ist), stellst du selbst ein. Das Plugin selbst kennt keine Schule.

Du brauchst kein Terminal. Alles geht mit Klicks und mit Nachrichten an Claude.

## Was du brauchst

- Ein Claude-Abo, das Claude Code enthält.
- Die Claude-Desktop-App für Windows, angemeldet mit deinem Konto von claude.ai. Das Plugin läuft dort im Tab „Code“.
- Die OneNote-Desktop-App für Windows, angemeldet, mit dem Notizbuch, in das die Tafelbilder sollen. Das Notizbuch muss synchronisiert sein.

## Installation

1. Öffne claude.ai im Browser und gehe zu *Customize → Plugins → Add marketplace*.
2. Gib als Marktplatz `noelroehrig/schulstunde-plugin` ein und installiere dort das Plugin `unterricht`.
3. Starte eine neue Sitzung im Tab „Code“ der Desktop-App. Das Plugin erscheint dort beim nächsten Start einer Sitzung.
4. Wenn das Plugin aktiviert wird, fragt Claude nach zwei Einstellungen:
   - **OneNote-Notizbuch:** der Name deines Notizbuchs, genau so geschrieben wie in OneNote, mit Groß- und Kleinschreibung. Nur in diesem Notizbuch darf das Plugin lesen und Seiten anlegen.
   - **Plan vor dem Tafelbild prüfen:** ob Claude dir den fertigen Plan zeigt, bevor das Tafelbild entsteht. Voreingestellt ist „ja“.

   Später änderst du beides mit `/config`.
5. Lege einen Arbeitsordner an, zum Beispiel `Dokumente\Unterricht`, und öffne ihn im Tab „Code“.

## Erste Schritte

1. Tippe `/unterricht:einrichten`. Claude legt die nötigen Dateien an und fragt dich nach deiner Schule, der Stundenlänge, deinen Klassen und deinen Kriterien. Wenn du schon Anweisungen in einem Claude-Projekt hast, kannst du sie einfügen, und Claude sortiert sie ein. Claude schreibt nur, wenn du zugestimmt hast.
2. Lege Lehrpläne und anderes Material in den Ordner `material/`. Word-Dateien speicherst du vorher als PDF.
3. Plane deine erste Stunde, zum Beispiel:

   `/unterricht:stunde-planen Brüche als Anteile, 6b, Einstieg mit Pizza-Beispiel`

## Die drei Befehle

- `/unterricht:einrichten` richtet deinen Arbeitsordner und die Verbindung zu OneNote ein und prüft beim nächsten Aufruf, ob noch alles stimmt.
- `/unterricht:stunde-planen <Thema, Klasse, Hinweise>` plant eine neue Stunde und legt das Tafelbild in OneNote an.
- `/unterricht:stunde-ueberarbeiten [Stunde] [Änderungen]` setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige Stunde mit deinen Änderungen.

## So entsteht eine Stunde

1. **Planung:** Claude entwirft den Plan, und ein zweiter Durchgang prüft ihn gegen deine `kriterien.md` und `schulkontext.md`. Entwurf und Prüfung sind eine Runde. Wird ein Muss-Kriterium verfehlt, folgt eine weitere Runde, in der der Plan überarbeitet und erneut geprüft wird, insgesamt höchstens drei Runden.
2. **Prüfpunkt:** Claude zeigt dir eine kurze Zusammenfassung des Plans und fragt, ob er so passt. Antworte mit „weiter“, oder schreib, was geändert werden soll. Deine Rückmeldung geht vor deinen Kriterien, und der Plan wird damit neu überarbeitet. Den Prüfpunkt kannst du in den Einstellungen abschalten.
3. **Tafelbild:** Claude legt die Seite in OneNote an und liest sie danach zur Prüfung wieder aus. Auch hier gibt es höchstens drei Runden.

Wenn nach drei Runden noch Muss-Mängel offen sind, zeigt Claude sie dir und du entscheidest: „So übernehmen“, „Ich gebe Hinweise“ oder „Abbrechen“.

Am Ende nennt Claude dir die Datei mit dem fertigen Plan und die Seite in OneNote. Öffne die Seite vor der Stunde einmal auf dem Gerät, mit dem du sie zeigst, damit sie dort synchronisiert ist.

Eine fertige Tafelbild-Seite wird nie überschrieben, denn du hast vielleicht schon darauf geschrieben. Überarbeitest du eine fertige Stunde, entsteht eine neue Seite mit „(überarbeitet)“ im Titel, und Claude sagt dir, welche alte Seite du löschen kannst.

## Wo deine Dateien liegen

```
Unterricht/
├── CLAUDE.md          kurze Übersicht über den Ordner
├── schulkontext.md    Schule, Stundenlänge, Phasenmodell, Regeln
├── kriterien.md       deine Kriterien, aufgeteilt in Muss und Soll
├── onenote.md         Abschnitt, Seitentitel und sichtbare Fläche in OneNote
├── material/          Lehrpläne, Vorlagen
└── Stunden/
    └── 2026-10-07 6b Bruchrechnung/
        ├── stunde.md          Auftrag und Stand der Stunde
        ├── planung_v1.md      Entwürfe des Plans
        ├── review_v1.md       Prüfberichte zu den Entwürfen
        └── ...
```

Du musst `onenote.md` nicht vorher ausfüllen, Claude plant die Stunde trotzdem. Steht dort noch kein Seitentitel, heißen der Stundenordner und die Seite in OneNote nach dem Schema `JJJJ-MM-TT Klasse Thema`. Steht dort noch kein Abschnitt, fragt dich Claude vor dem Tafelbild, in welchen Abschnitt die Seite soll.

Die Dateien gehören dir. Das Plugin überschreibt `schulkontext.md`, `kriterien.md`, `onenote.md`, `CLAUDE.md` und deinen `material/`-Ordner nie. Änderungen daran schlägt `/unterricht:einrichten` nur vor und schreibt sie erst nach deinem Ja.

Wenn OneDrive deinen Arbeitsordner synchronisiert, lade Dateien, die nur online liegen, vorher herunter, sonst kann Claude sie nicht lesen.

## Datenschutz

Schreib keine Namen oder anderen persönlichen Daten von Schülerinnen und Schülern in deine Dateien oder Hinweise. Beschreibe Gruppen, zum Beispiel „leistungsstärkere Schülerinnen und Schüler“. Das Plugin selbst legt keine solchen Daten an.

Dieses Repository ist öffentlich und enthält keine Inhalte von Lehrkräften. Deine Dateien bleiben in deinem Arbeitsordner und in deinem Notizbuch.

## Wenn etwas nicht klappt

- **OneNote reagiert nicht oder zeigt einen Dialog:** Öffne OneNote und schließe offene Dialoge, zum Beispiel eine Anmeldung oder eine Meldung zur Synchronisierung. Claude versucht es dann noch einmal. Klappt es trotzdem nicht, bleibt der Plan erhalten, und du machst später mit `/unterricht:stunde-ueberarbeiten` weiter.
- **Claude meldet, dass die OneNote-Verbindung des Plugins nicht läuft:** Starte die Claude-App neu. Wenn das nicht hilft, prüfe, ob Windows Defender oder SmartScreen die Datei `onenote-mcp.exe` blockiert, und gib sie dort frei. Bis dahin plant Claude die Stunde trotzdem, und das Tafelbild machst du danach mit `/unterricht:stunde-ueberarbeiten`.
- **Das Notizbuch wird nicht gefunden:** Der Name in der Einstellung „OneNote-Notizbuch“ muss genau so geschrieben sein wie in OneNote, mit Groß- und Kleinschreibung und ohne Komma. Ändere ihn mit `/config`.
- **Der Abschnitt fehlt:** Das Plugin legt keine Abschnitte an. Lege den Abschnitt in OneNote an oder nenne Claude einen anderen. Abschnitte in Abschnittsgruppen werden nicht unterstützt.
- **Claude fragt bei jedem Schritt um Erlaubnis:** `/unterricht:einrichten` bietet dir an, die nötigen Freigaben in `.claude/settings.json` in deinem Arbeitsordner einzutragen. Stimme zu, dann fragt Claude seltener.
- **Eine Planung wurde unterbrochen:** Tippe `/unterricht:stunde-ueberarbeiten`. Claude zeigt dir deine Stunden und macht dort weiter, wo es aufgehört hat.

## Updates

Neue Versionen kommen automatisch über claude.ai. Starte danach die Claude-Desktop-App neu. Was sich geändert hat, steht in `CHANGELOG.md`. Neue Vorlagen überschreiben nie deine eigenen Dateien. Fehlt nach einem Update eine Datei, sagt dir Claude, dass du `/unterricht:einrichten` aufrufen sollst.

---

Für Entwickler: Aufbau und Entscheidungen stehen in [`SPEC.md`](SPEC.md).
