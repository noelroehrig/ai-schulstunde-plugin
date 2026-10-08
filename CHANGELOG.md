# Änderungen

## 0.4.0 (2026-10-08)

- Tafelbilder können jetzt Banner und Symbole aus deinen eigenen Vorlagenseiten in OneNote zeigen. Du trägst die Banner-Seite, die Symbol-Seite und eine fertige Tafelbild-Seite als Vorbild in `onenote.md` ein. `/unterricht:einrichten` prüft die Seiten, ordnet jeder Phase ihr Banner zu und misst auf der Vorbild-Seite aus, wo Banner, Symbole und Text stehen. Auf den Vorlagenseiten muss jedes Bild mit seiner Beschriftung im selben Textfeld stehen; Bilder ohne Beschriftung zeigt dir `/unterricht:einrichten`.
- Das Tafelbild beginnt unterhalb des Seitentitels, und das Stundenthema als erste Zeile kannst du abschalten.
- Für jede Buchaufgabe lässt Claude im Tafelbild Platz in der Form und Größe, die ihr Screenshot braucht, und dort steht, welchen Screenshot du einfügen sollst.
- Rechts neben der sichtbaren Fläche kann Claude Notizen für dich in einer eigenen Farbe ablegen, zum Beispiel Zeiten und Material aus dem Plan.
- Bilder und Dateien, die du `/unterricht:stunde-planen` mitschickst, schreibt Claude in den Stundenordner ab, und Planung und Prüfung nutzen sie.
- Neue Tafelbilder können als Unterseiten unter einer Kapitelseite liegen (`Elternseite` in `onenote.md`), und der Seitentitel kann eine fortlaufende Nummer haben, zum Beispiel „04 Einheiten von Flächeninhalten“.
- Heißen die Abschnitte anders als die Klassen, zum Beispiel „Mathe 5a“ für die Klasse 5a, trägst du das in `onenote.md` unter „Abschnitte der Klassen“ ein. Steht eine Klasse nicht in `schulkontext.md`, fragt Claude vor dem Planen nach.
- Neuer Prüfpunkt: Claude zeigt dir das Tafelbild in OneNote, bevor die Stunde fertig ist. Deine Rückmeldung geht direkt in die Überarbeitung des Tafelbilds. Abschalten kannst du ihn in `einstellungen.md`.
- Beim Überarbeiten einer fertigen Stunde kannst du jetzt wählen, ob Claude die bisherige Seite überschreibt oder eine neue anlegt. Auf der bisherigen Seite ersetzt Claude dabei alles, was du dort getippt oder eingefügt hast.
- Server aktualisiert auf v1.2.0.
- Rufe nach dem Update einmal `/unterricht:einrichten` auf: Es ergänzt die neue Einstellung in `einstellungen.md` und fragt nach Vorlagen und Seitenaufbau. Ohne die neue Einstellung hält Claude vor dem Planen an und verweist auf `/unterricht:einrichten`.

## 0.3.0 (2026-10-08)

- Das Notizbuch steht jetzt in `onenote.md` (Zeile `Notizbuch:`) statt in den Plugin-Einstellungen. `/unterricht:einrichten` fragt nach dem Namen und gibt das Notizbuch nach deinem Ja einmal für Claude frei. Das funktioniert jetzt auch in der Desktop-App, in der sich die Plugin-Einstellungen nicht ändern lassen. Rufe nach dem Update einmal `/unterricht:einrichten` auf.
- Für mehrere Fächer mit je einem Notizbuch richtest du je Fach einen Arbeitsordner ein. Alle freigegebenen Notizbücher bleiben freigegeben.
- Ohne deine Freigabe nutzt Claude kein Notizbuch, auch keines, das „Unterricht“ heißt.
- Server aktualisiert auf v1.1.0.

## 0.2.1 (2026-10-08)

- Läuft die Sitzung in Cowork, sagt Claude jetzt, dass die OneNote-Verbindung nur im Tab „Code“ funktioniert. Die Anleitung sagt das auch.

## 0.2.0 (2026-10-04)

- Prüfpunkt und Modelle stehen jetzt in der Datei `einstellungen.md` in deinem Arbeitsordner statt in den Plugin-Einstellungen. Rufe nach dem Update einmal `/unterricht:einrichten` auf: Es legt die Datei mit den bisherigen Voreinstellungen an und fragt, ob sie passen. Werte, die du vorher mit `/config` geändert hattest, trägst du dort neu ein.
- Beim Ausmessen der sichtbaren Fläche findet `/unterricht:einrichten` jetzt auch einen Abschnitt, den du gerade erst in OneNote angelegt hast.

## 0.1.1 (2026-10-04)

- Server aktualisiert auf v1.0.1.

## 0.1.0 (2026-10-03)

Erste Version.

- `/unterricht:einrichten` richtet den Arbeitsordner mit `schulkontext.md`, `kriterien.md` und `onenote.md` ein, prüft die Verbindung zu OneNote, misst auf Wunsch die sichtbare Fläche aus und bietet die Freigaben für weniger Rückfragen an. Ein zweiter Aufruf prüft, ob noch alles stimmt.
- `/unterricht:stunde-planen` plant eine neue Stunde: Der Plan wird gegen deine Kriterien in höchstens drei Runden geprüft und überarbeitet, du kannst ihn vor dem Tafelbild prüfen, und das Tafelbild entsteht als Seite in OneNote, ebenfalls mit Prüfung.
- `/unterricht:stunde-ueberarbeiten` setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige Stunde mit deinen Änderungen auf einer neuen OneNote-Seite.
- Bleiben nach drei Runden Mängel offen, entscheidest du: übernehmen, Hinweise geben oder abbrechen.
- Für Plan und Planprüfung und für das Tafelbild wählst du je ein Claude-Modell, voreingestellt Opus und Sonnet.
- Deine eigenen Dateien und fertigen OneNote-Seiten werden nie überschrieben.
