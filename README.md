# Unterricht: Stunden planen mit Claude

Das Plugin „unterricht“ plant mit einem einzigen Befehl eine Unterrichtsstunde. Am Ende hast du einen Verlaufsplan als Datei in deinem Arbeitsordner und das Tafelbild als Seite in deinem OneNote-Notizbuch.

Bevor du etwas zu sehen bekommst, prüft Claude den Plan und das Tafelbild gegen deine eigenen Kriterien und überarbeitet sie, bis sie passen. Alles, was für deine Schule gilt (Stundenlänge, Phasenmodell, besondere Regeln, wie dein Notizbuch aufgebaut ist), stellst du selbst ein. Das Plugin selbst kennt keine Schule.

Du brauchst kein Terminal. Alles geht mit Klicks und mit Nachrichten an Claude.

## Was du brauchst

- Ein Claude-Abo, das Claude Code enthält.
- Die Claude-Desktop-App für Windows, angemeldet mit deinem Konto von claude.ai. Das Plugin läuft dort im Tab „Code“. In Cowork kann Claude die OneNote-Verbindung des Plugins nicht nutzen, dort entsteht also kein Tafelbild.
- Die OneNote-Desktop-App für Windows, angemeldet, mit dem Notizbuch, in das die Tafelbilder sollen. Das Notizbuch muss synchronisiert sein.

## Installation

1. Öffne claude.ai im Browser und gehe zu *Customize → Plugins → Add marketplace*.
2. Gib als Marktplatz `noelroehrig/ai-schulstunde-plugin` ein und installiere dort das Plugin `unterricht`.
3. Starte eine neue Sitzung im Tab „Code“ der Desktop-App. Das Plugin erscheint dort beim nächsten Start einer Sitzung.
4. Lege einen Arbeitsordner an, zum Beispiel `Dokumente\Unterricht`, und öffne ihn im Tab „Code“.

## Erste Schritte

1. Tippe `/unterricht:einrichten`. Claude legt die nötigen Dateien an und fragt dich nach deiner Schule, der Stundenlänge, deinen Klassen, deinen Kriterien und deinem OneNote-Notizbuch. Wenn du schon Anweisungen in einem Claude-Projekt hast, kannst du sie einfügen, und Claude sortiert sie ein. Claude schreibt nur, wenn du zugestimmt hast.
2. Lege Lehrpläne und anderes Material in den Ordner `material/`. Word-Dateien speicherst du vorher als PDF.
3. Plane deine erste Stunde, zum Beispiel:

   `/unterricht:stunde-planen Brüche als Anteile, 6b, Einstieg mit Pizza-Beispiel`

## Freigabe für OneNote

Claude darf nur in den Notizbüchern lesen und Seiten anlegen, die du freigegeben hast. `/unterricht:einrichten` fragt dich nach dem Namen deines Notizbuchs, trägt ihn in `onenote.md` ein und gibt das Notizbuch nach deinem Ja einmal frei. Die Freigabe steht in deinen Claude-Einstellungen, in der Datei `.claude\settings.json` in deinem Benutzerordner. Claude fragt dich vorher, ob es diese Datei ändern darf. Die Freigabe gilt ab dem nächsten Chat: Öffne danach einen neuen Chat in deinem Arbeitsordner und starte `/unterricht:einrichten` noch einmal.

Unterrichtest du mehrere Fächer mit je einem Notizbuch, lege für jedes Fach einen eigenen Arbeitsordner an und richte ihn mit `/unterricht:einrichten` ein. Jeder Ordner bekommt sein Notizbuch, und die Freigaben der anderen Ordner bleiben bestehen.

## Einstellungen

`/unterricht:einrichten` legt in deinem Arbeitsordner die Datei `einstellungen.md` an und fragt dich, ob die Werte so passen:

- **Plan vor dem Tafelbild prüfen:** ob Claude dir den fertigen Plan zeigt, bevor das Tafelbild entsteht. Voreingestellt ist „ja“.
- **Tafelbild vor Abschluss prüfen:** ob Claude dich das Tafelbild in OneNote ansehen lässt, bevor die Stunde fertig ist. Voreingestellt ist „ja“.
- **Modell für Plan und Planprüfung:** welches Claude-Modell den Plan schreibt und prüft. Voreingestellt ist Opus.
- **Modell für das Tafelbild:** welches Claude-Modell das Tafelbild in OneNote anlegt und prüft. Voreingestellt ist Sonnet, weil es günstiger ist und dafür meist ausreicht.

Zur Wahl stehen Opus, Sonnet, Haiku und „wie die Sitzung“, also das Modell, das du gerade im Chat verwendest. Opus verbraucht mehr von deinem Kontingent als Sonnet, Haiku am wenigsten. Später änderst du die Werte direkt in `einstellungen.md`, oder du bittest Claude darum.

## Die drei Befehle

- `/unterricht:einrichten` richtet deinen Arbeitsordner und die Verbindung zu OneNote ein und prüft beim nächsten Aufruf, ob noch alles stimmt.
- `/unterricht:stunde-planen <Thema, Klasse, Hinweise>` plant eine neue Stunde und legt das Tafelbild in OneNote an.
- `/unterricht:stunde-ueberarbeiten [Stunde] [Änderungen]` setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige Stunde mit deinen Änderungen.

## So entsteht eine Stunde

1. **Planung:** Claude entwirft den Plan, und ein zweiter Durchgang prüft ihn gegen deine `kriterien.md` und `schulkontext.md`. Entwurf und Prüfung sind eine Runde. Wird ein Muss-Kriterium verfehlt, folgt eine weitere Runde, in der der Plan überarbeitet und erneut geprüft wird, insgesamt höchstens drei Runden.
2. **Prüfpunkt:** Claude zeigt dir eine kurze Zusammenfassung des Plans und fragt, ob er so passt. Antworte mit „weiter“, oder schreib, was geändert werden soll. Deine Rückmeldung geht vor deinen Kriterien, und der Plan wird damit neu überarbeitet. Den Prüfpunkt kannst du in `einstellungen.md` abschalten.
3. **Tafelbild:** Claude legt die Seite in OneNote an und liest sie danach zur Prüfung wieder aus. Auch hier gibt es höchstens drei Runden.
4. **Prüfpunkt Tafelbild:** Claude nennt dir die Seite in OneNote und fragt, ob das Tafelbild so passt. Tippe noch nichts auf der Seite ein: Wenn du etwas ändern möchtest, überarbeitet Claude sie mit deiner Rückmeldung und ersetzt dabei ihren Inhalt. Auch diesen Prüfpunkt kannst du in `einstellungen.md` abschalten.

Wenn nach drei Runden noch Muss-Mängel offen sind, zeigt Claude sie dir und du entscheidest: „So übernehmen“, „Ich gebe Hinweise“ oder „Abbrechen“.

Am Ende nennt Claude dir die Datei mit dem fertigen Plan und die Seite in OneNote. Öffne die Seite vor der Stunde einmal auf dem Gerät, mit dem du sie zeigst, damit sie dort synchronisiert ist.

Eine fertige Tafelbild-Seite überarbeitet Claude nur, wenn du es ausdrücklich willst. Überarbeitest du eine fertige Stunde, fragt Claude dich, ob es die bisherige Seite überarbeiten oder eine neue anlegen soll. Auf der bisherigen Seite ersetzt Claude dabei alles, was du dort getippt oder eingefügt hast. Deine Handschrift bleibt erhalten, und Claude setzt neuen Inhalt nicht darüber. Steht Handschrift in einem Textfeld, hält Claude an und bittet dich, sie aus dem Textfeld herauszuziehen, damit sie nicht verloren geht. Eine neue Seite bekommt „(überarbeitet)“ im Titel, und Claude sagt dir, welche alte Seite du löschen kannst.

Schickst du `/unterricht:stunde-planen` Bilder oder Dateien mit, zum Beispiel Screenshots aus dem Buch, schreibt Claude ab, was darauf steht, in den Ordner `material/` der Stunde. Dateien, die auf deinem Rechner liegen, kopiert Claude dorthin. Planung und Prüfung arbeiten mit dieser Abschrift.

## Vorlagen und Seitenaufbau

Zeigen deine Tafelbilder Banner für die Phasen und Symbole, zum Beispiel ein Symbol „Merke“ vor einem Merksatz, kann Claude sie aus deinen eigenen Vorlagenseiten in OneNote übernehmen. Dafür trägst du in `onenote.md` unter „Vorlagen“ die Seite mit den Bannern, die Seite mit den Symbolen und eine fertige Tafelbild-Seite als Vorbild ein, jeweils als „Abschnitt / Seitentitel“. `/unterricht:einrichten` hilft dir dabei:

- Es prüft, ob es die Seiten gibt.
- Es liest die Beschriftungen der Bilder. Jedes Bild muss mit seiner Beschriftung im selben Textfeld stehen. Bilder, bei denen das nicht so ist, zeigt dir `/unterricht:einrichten`, und Claude nutzt sie nicht.
- Es ordnet jeder Phase deines Phasenmodells ein Banner zu und fragt dich, wenn es keines findet. Claude rät nie, welches Banner zu einer Phase gehört.
- Es misst auf der Vorbild-Seite aus, ab welcher Höhe der Inhalt beginnt und wo Banner, Symbole und Text stehen, und trägt das nach deinem Ja unter „Seitenaufbau“ ein.

Für jede Buchaufgabe, die im Plan als `Buchaufgabe:` steht, lässt Claude auf der Seite Platz in der Form und Größe, die der Screenshot dieser Aufgabe braucht, und schreibt dazu, welchen Screenshot du dort einfügst. Unter „Ansicht“ kannst du eine „Notizfarbe“ eintragen: Dann schreibt Claude rechts neben die sichtbare Fläche Notizen für dich, zum Beispiel die Minuten jeder Phase und welches Material du bereitlegst.

## Wo deine Dateien liegen

```
Unterricht/
├── CLAUDE.md          kurze Übersicht über den Ordner
├── schulkontext.md    Schule, Stundenlänge, Phasenmodell, Regeln
├── kriterien.md       deine Kriterien, aufgeteilt in Muss und Soll
├── onenote.md         Notizbuch, Ablage, sichtbare Fläche, Vorlagen und Seitenaufbau
├── einstellungen.md   Prüfpunkte und Modelle
├── material/          Lehrpläne, Vorlagen
└── Stunden/
    └── 2026-10-07 6b Bruchrechnung/
        ├── stunde.md          Auftrag und Stand der Stunde
        ├── planung_v1.md      Entwürfe des Plans
        ├── review_v1.md       Prüfberichte zu den Entwürfen
        ├── material/          Abschrift und Kopien deiner Anhänge
        └── ...
```

Du musst `onenote.md` nicht vorher ausfüllen, Claude plant die Stunde trotzdem. Steht dort noch kein Seitentitel, heißen der Stundenordner und die Seite in OneNote nach dem Schema `JJJJ-MM-TT Klasse Thema`. Mit `NN` im Schema, zum Beispiel `NN Thema`, bekommt die Seite die nächste freie Nummer unter den Seiten, neben denen sie steht. Steht dort noch kein Abschnitt, fragt dich Claude vor dem Tafelbild, in welchen Abschnitt die Seite soll. Mit einer „Elternseite“ legt Claude das Tafelbild als Unterseite unter diese Seite, zum Beispiel unter „Kapitel 6 - Flächeninhalt“; mit „Elternseite: fragen“ fragt Claude dich bei jeder Stunde, unter welche Seite es gehört.

Die Dateien gehören dir. Das Plugin überschreibt `schulkontext.md`, `kriterien.md`, `onenote.md`, `einstellungen.md`, `CLAUDE.md` und deinen `material/`-Ordner nie. Änderungen daran schlägt `/unterricht:einrichten` nur vor und schreibt sie erst nach deinem Ja.

Wenn OneDrive deinen Arbeitsordner synchronisiert, lade Dateien, die nur online liegen, vorher herunter, sonst kann Claude sie nicht lesen.

## Datenschutz

Schreib keine Namen oder anderen persönlichen Daten von Schülerinnen und Schülern in deine Dateien oder Hinweise. Beschreibe Gruppen, zum Beispiel „leistungsstärkere Schülerinnen und Schüler“. Das Plugin selbst legt keine solchen Daten an.

Dieses Repository ist öffentlich und enthält keine Inhalte von Lehrkräften. Deine Dateien bleiben in deinem Arbeitsordner und in deinem Notizbuch.

## Wenn etwas nicht klappt

- **OneNote reagiert nicht oder zeigt einen Dialog:** Öffne OneNote und schließe offene Dialoge, zum Beispiel eine Anmeldung oder eine Meldung zur Synchronisierung. Claude versucht es dann noch einmal. Klappt es trotzdem nicht, bleibt der Plan erhalten, und du machst später mit `/unterricht:stunde-ueberarbeiten` weiter.
- **Claude meldet, dass die OneNote-Verbindung des Plugins nicht läuft:** Prüfe, ob du im Tab „Code“ arbeitest, denn in Cowork gibt es die Verbindung nicht. Im Tab „Code“ starte die Claude-App neu. Wenn das nicht hilft, prüfe, ob Windows Defender oder SmartScreen die Datei `onenote-mcp.exe` blockiert, und gib sie dort frei. Die Datei ist der OneNote-Server des Plugins aus github.com/noelroehrig/onenote-mcp; welche Version es ist, steht in `plugin/server/VERSION`, ihre Prüfsumme in `plugin/server/onenote-mcp.exe.sha256`. Bis dahin plant Claude die Stunde trotzdem, und das Tafelbild machst du danach mit `/unterricht:stunde-ueberarbeiten`.
- **Das Notizbuch wird nicht gefunden oder ist nicht freigegeben:** Starte `/unterricht:einrichten`. Es prüft den Namen in `onenote.md` und die Freigabe und hilft dir, beides zu korrigieren. Der Name muss genau so geschrieben sein wie in OneNote, mit Groß- und Kleinschreibung und ohne Komma.
- **Der Abschnitt fehlt:** Das Plugin legt keine Abschnitte an. Lege den Abschnitt in OneNote an oder nenne Claude einen anderen. Abschnitte in Abschnittsgruppen werden nicht unterstützt.
- **Eine Vorlagenseite wird nicht gefunden oder ein Banner fehlt:** Starte `/unterricht:einrichten`. Es prüft die Seiten unter „Vorlagen“ in `onenote.md`, zeigt dir Bilder ohne Beschriftung und fragt nach dem Banner für jede Phase, die noch keines hat. Den Titel einer Vorlagenseite änderst du am besten nicht mehr, nachdem sie eingetragen ist.
- **Claude fragt bei jedem Schritt um Erlaubnis:** `/unterricht:einrichten` bietet dir an, die nötigen Freigaben in `.claude/settings.json` in deinem Arbeitsordner einzutragen. Stimme zu, dann fragt Claude seltener.
- **Eine Planung wurde unterbrochen:** Tippe `/unterricht:stunde-ueberarbeiten`. Claude zeigt dir deine Stunden und macht dort weiter, wo es aufgehört hat.

## Updates

Neue Versionen kommen automatisch über claude.ai. Starte danach die Claude-Desktop-App neu. Was sich geändert hat, steht in `CHANGELOG.md`. Neue Vorlagen überschreiben nie deine eigenen Dateien. Fehlt nach einem Update eine Datei, sagt dir Claude, dass du `/unterricht:einrichten` aufrufen sollst.
