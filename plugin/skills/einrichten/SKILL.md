---
name: einrichten
description: Richtet deinen Arbeitsordner für die Unterrichtsplanung ein oder prüft ihn, mit Dateien, Einstellungen, OneNote und Berechtigungen.
disable-model-invocation: true
---

# Set up or check the working folder

The teacher wants to set up their working folder, or check one that is already set up. Go through the steps below in order. Everything you say to the teacher is German; use the wording quoted here where it is given.

Plugin root: ${CLAUDE_PLUGIN_ROOT}
OneNote notebook: ${user_config.notebook}

The working folder is the current working directory: use its absolute path, with forward slashes. Every file named below without a folder is in the working folder. The templates are in `${CLAUDE_PLUGIN_ROOT}/templates/`.

Rules for the whole procedure:

- When you need the teacher's answer, ask in German and end your turn; the next message continues at that point. Read answers by meaning, not by exact spelling: `ja`, `weiter`, `passt`, or `ok` alone mean yes. An answer that asks for a change is feedback. When an answer is unclear, ask once more.
- Never overwrite a file. A template is copied only when its file is missing. An existing file is changed only after you showed the change and the teacher said yes. On a no, ask what to change and propose again, or skip the step when the teacher says so.
- `Abbrechen`, or an answer that means it, at any question stops the procedure: change nothing more, and say `Abgebrochen. Was bis hierher eingerichtet ist, bleibt erhalten. Du kannst /unterricht:einrichten jederzeit noch einmal ausführen.`
- In a folder that is already set up, this procedure is a health check: it reports the state and changes nothing without a yes.
- Keep a list of what is set up and what is missing for the summary in step 7.
- Never write student names or other personal data into a file or a page.

## 1. Confirm the working folder

Ask `Ich richte diesen Ordner als deinen Arbeitsordner ein: <absoluter Pfad>. Ist das der richtige Ordner?` and end your turn. On a no, say `Bitte öffne im Code-Tab den Ordner, den du für die Unterrichtsplanung nutzen willst, und starte dort /unterricht:einrichten.` and stop.

## 2. Files and folders

1. For each of `CLAUDE.md`, `schulkontext.md`, `kriterien.md`, and `onenote.md`: when the file is missing in the working folder, read the template of the same name in `${CLAUDE_PLUGIN_ROOT}/templates/` and write it unchanged into the working folder. When the file exists, do not read the template and do not touch the file.
2. Create the folders `material/` and `Stunden/` when they are missing.
3. Tell the teacher what you created and what already existed, for example:

   ```
   Neu angelegt: kriterien.md, onenote.md, Stunden/
   Schon vorhanden, nicht verändert: CLAUDE.md, schulkontext.md, material/
   ```

   When everything existed, say `Alle Dateien und Ordner sind schon vorhanden. Ich habe nichts verändert.`
4. Add: `Lehrpläne, Vorlagen und anderes Material legst du selbst in den Ordner material/. Word-Dateien speicherst du bitte vorher als PDF.`

## 3. Configuration

Read `schulkontext.md`, `kriterien.md`, and `onenote.md`. A placeholder is text in square brackets, for example `[Minuten eintragen]`.

The values the templates need:

- `schulkontext.md`: the Schule (Schulform, Bundesland, Besonderheiten), the Stundenlänge in minutes, the Besondere Regeln, the Phasenmodell, the Fächer und Klassen (Klasse, Fach, Lehrplan or Kerncurriculum, Lehrwerk), the Ausstattung im Unterricht, and what every plan should take into account.
- `kriterien.md`: the teacher's criteria for the Planung and the Tafelbild, each split into Muss and Soll.

The Ablage and Ansicht of `onenote.md` are filled in steps 4 and 5.

1. When no placeholder is left in either file, tell the teacher the Stundenlänge, the Phasenmodell, and the classes you found, and ask `Die Angaben in schulkontext.md und kriterien.md sind ausgefüllt. Möchtest du etwas ändern? Antworte mit „weiter“, oder schreib, was sich ändern soll.` and end your turn. On `weiter`, go to step 4.
2. Otherwise ask, and end your turn:

   ```
   Jetzt brauche ich ein paar Angaben zu deiner Schule. Wenn du Anweisungen aus einem Claude-Projekt hast, kannst du sie einfach hier einfügen. Sonst beantworte bitte diese Fragen:
   1. An welcher Schule unterrichtest du (Schulform, Bundesland, Besonderheiten)?
   2. Wie viele Minuten dauert eine Unterrichtsstunde?
   3. Welche Phasen hat eine Stunde bei dir (zum Beispiel Einstieg, Erarbeitung, Sicherung)?
   4. Gibt es besondere Regeln, zum Beispiel feste Rituale?
   5. Welche Klassen und Fächer unterrichtest du, mit welchem Lehrplan und Lehrwerk?
   6. Was muss eine gute Planung und ein gutes Tafelbild für dich erfüllen, und was wäre nur schön?
   ```

   Ask only for values that still hold a placeholder. Use the questions verbatim.
3. Pasted instructions from a Claude project: sort what they say into `schulkontext.md` (school, lesson length, phases, rules, classes, equipment, what every plan should take into account), `kriterien.md` (Muss and Soll for the Planung and the Tafelbild), and `onenote.md` (where pages go, page titles, visible area, colors). Do not invent values the instructions do not contain; ask for what is still missing. Leave out student names and other personal data, and tell the teacher you did.
4. Keep every heading, the privacy note, and the line formats of the templates, for example `Stundenlänge: 45 Minuten` with a decimal comma when needed. Remove the example lines (`[...]`) the teacher's values replace. Keep `Die Phasen ergeben zusammen genau die Stundenlänge.` and `Alles, was die Klasse gleichzeitig sehen soll, passt in die sichtbare Breite.` unless the teacher asks to remove them.
5. Show the change of each file you would change: the new lines, and the lines they replace. Ask `Soll ich das so in <Dateien> eintragen? Antworte mit „ja“, oder schreib, was anders sein soll.` and end your turn. Write only after a yes. On feedback, change the proposal and ask again.

## 4. OneNote

On a OneNote error, or `onenote_responsive: false`, in this step or in step 5: tell the teacher in German what happened, for example `OneNote reagiert gerade nicht. Bitte öffne OneNote und schließe alle offenen Dialoge.`, show an error message from the server verbatim, skip the remaining OneNote steps of steps 4 and 5, and list them as missing in the summary. A OneNote error arrives as `Error executing tool <tool>: <code>: <message>`; the code is `timeout`, `backend_error`, or `bad_request`. Never create a notebook or a section.

1. The `notebook` setting (`OneNote notebook` above) must not be blank and must not contain a comma. Otherwise call no OneNote tool and say `Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Öffne mit /config die Einstellungen des Plugins „unterricht“ und trag bei „OneNote-Notizbuch“ genau den Namen eines Notizbuchs ein, zum Beispiel „Unterricht“. Führe danach /unterricht:einrichten noch einmal aus.` Skip steps 4 and 5.
2. Call `mcp__plugin_unterricht_onenote__ping`. It must report `onenote_responsive: true`.
3. Call `mcp__plugin_unterricht_onenote__get_notebooks`. The notebook whose name is exactly the `notebook` setting, case-sensitive, must be in the list. Otherwise say `Das Notizbuch „<notebook>“ wurde in OneNote nicht gefunden. Der Name muss genau stimmen, auch bei Groß- und Kleinschreibung. Du kannst ihn mit /config in der Einstellung „OneNote-Notizbuch“ ändern. Ich lege nie ein Notizbuch an.` and skip the rest of steps 4 and 5. Sections inside section groups are not listed and not supported.
4. For each section of the notebook, call `mcp__plugin_unterricht_onenote__list_pages`. Read titles only; read no page.
5. Draft the `## Ablage` of `onenote.md` from the section names and the page titles:
   - `Abschnitt:` `Klasse` when the sections are named like the classes (one section per class), else the name of the section the lessons go into.
   - `Seitentitel:` the scheme the existing page titles follow, written with `JJJJ-MM-TT` for the date, `Klasse` for the class, and `Thema` for the topic, for example `JJJJ-MM-TT Klasse Thema`. When the titles show no scheme, propose `JJJJ-MM-TT Klasse Thema`.
6. When `## Ablage` is already filled, compare it with the notebook: name a section it needs that does not exist. Ask whether it should stay.
7. Show the draft with the sections and a few page titles it is based on, and ask `Soll ich die Ablage so in onenote.md eintragen? Antworte mit „ja“, oder schreib, was anders sein soll.` and end your turn. Write only after a yes. When `Abschnitt` names a section that does not exist yet, say `Bitte lege den Abschnitt „<Abschnitt>“ in OneNote an. Ich lege keine Abschnitte an.`

## 5. Visible area (Ansicht)

Ask `Zeigst du das Tafelbild auf einer festen sichtbaren Fläche, zum Beispiel auf einem gespiegelten Tablet mit fester Zoomstufe? Dann messen wir einmal aus, wie viel davon zu sehen ist. Antworte mit „ja“ oder „nein“.` and end your turn. When `## Ansicht` of `onenote.md` already holds numbers, name them first and ask whether to measure again. On a no, leave `## Ansicht` as it is and go to step 6. When step 4 was skipped, skip the calibration too and list it as missing.

1. Ask `In welchem Abschnitt soll ich die Seite „Kalibrierung Ansicht“ anlegen?`, naming the notebook's sections, and end your turn. The section must exist; note its ID.
2. Call `list_pages` on that section. When a page `Kalibrierung Ansicht` already exists, say `Im Abschnitt „<Abschnitt>“ gibt es schon eine Seite „Kalibrierung Ansicht“, vielleicht von einem früheren Versuch. Bitte lösche sie in OneNote und antworte dann mit „weiter“.` and end your turn; then check again. Never write to a page that existed before.
3. Call `mcp__plugin_unterricht_onenote__create_page` once, with that section and the title `Kalibrierung Ansicht`. Never retry it. After a `timeout`, say `OneNote hat nicht rechtzeitig geantwortet. Vielleicht wurde die Seite trotzdem angelegt. Bitte sieh im Abschnitt „<Abschnitt>“ nach einer Seite „Kalibrierung Ansicht“, lösche sie, und führe /unterricht:einrichten später noch einmal aus.`, skip the rest of this step, and list the Ansicht as missing.
4. Call `mcp__plugin_unterricht_onenote__replace_page` on the new page's ID, with the title `Kalibrierung Ansicht` and the payload format of `${CLAUDE_PLUGIN_ROOT}/skills/lesson-conventions/board.md`: one outline per label, each holding one paragraph with the label as text and `font_size` 14.
   - Top row: labels `100`, `200`, ... up to `2000`, the outline for label `n` at `position` `{ "x": n, "y": 0 }`.
   - Left edge: labels `100`, `200`, ... up to `1500`, the outline for label `n` at `position` `{ "x": 0, "y": n }`.

   On a `timeout` or `backend_error`, send the same payload once more; when that fails too, say that the page `Kalibrierung Ansicht` may be empty and should be deleted, and handle it as a OneNote error.
5. Ask, and end your turn:

   ```
   Ich habe im Abschnitt „<Abschnitt>“ die Seite „Kalibrierung Ansicht“ angelegt. Öffne sie bitte auf dem Gerät, mit dem du projizierst, mit der Zoomstufe, die du im Unterricht nutzt, und scroll ganz nach oben links.
   1. Welche Zahl in der oberen Reihe ist die letzte, die du noch ganz siehst?
   2. Welche Zahl am linken Rand ist die letzte, die du noch ganz siehst?
   3. Welche Schriftgröße soll das Tafelbild mindestens haben (in Punkt, zum Beispiel 20)?
   4. Welche Farben nutzt du, und was bedeuten sie (zum Beispiel #C00000: wichtige Begriffe)?
   ```
6. The answer to question 1 is the `Sichtbare Breite`, the answer to question 2 the `Sichtbare Höhe`, both in points. Show the `## Ansicht` you would write, in the line format of the template (`Sichtbare Breite: <Zahl> pt`, `Sichtbare Höhe: <Zahl> pt`, `Mindestschriftgröße: <Zahl> pt`, and the `Farben:` list as `- #RRGGBB: Bedeutung`), and ask `Soll ich das so in onenote.md eintragen? Antworte mit „ja“, oder schreib, was anders sein soll.` and end your turn. Write only after a yes.
7. Say `Du kannst die Seite „Kalibrierung Ansicht“ jetzt in OneNote löschen. Ich kann keine Seiten löschen.`

## 6. Permissions

Offer allow rules for `.claude/settings.json` in the working folder, so that the teacher is not asked for permission at every step. The rules:

```json
{
  "permissions": {
    "allow": [
      "Edit(/Stunden/**)",
      "Read(~/.claude/plugins/**)",
      "mcp__plugin_unterricht_onenote__ping",
      "mcp__plugin_unterricht_onenote__get_notebooks",
      "mcp__plugin_unterricht_onenote__list_pages",
      "mcp__plugin_unterricht_onenote__get_page",
      "mcp__plugin_unterricht_onenote__create_page",
      "mcp__plugin_unterricht_onenote__replace_page"
    ]
  }
}
```

1. When `.claude/settings.json` is missing, the proposal is exactly the block above.
2. When it exists and is valid JSON, the proposal is the file with every rule above that is missing appended to `permissions.allow`. Keep everything else unchanged: other keys, other rules, and their order. When every rule is already there, say `Die Berechtigungen in .claude/settings.json sind schon eingetragen.` and go to step 7.
3. When it exists and is not valid JSON, or `permissions.allow` is not a list, do not change it. Say `Die Datei .claude/settings.json kann ich nicht sicher ergänzen, weil sie kein gültiges JSON enthält. Ich ändere sie nicht. Wenn du die Regeln selbst eintragen möchtest, gehören diese Einträge in die Liste „allow“ unter „permissions“:`, show the rules, and go to step 7.
4. Show the proposal and say which rules are new, then ask `Damit du nicht bei jedem Schritt eine Erlaubnis bestätigen musst, kann ich diese Regeln in .claude/settings.json in deinem Arbeitsordner eintragen. Sie erlauben das Schreiben in Stunden/, das Lesen der Plugin-Dateien und die OneNote-Werkzeuge des Plugins. Soll ich sie eintragen? Antworte mit „ja“ oder „nein“.` and end your turn. Write only after a yes; create `.claude/` when it is missing. On a no, write nothing and list the permissions as not set up.

## 7. Summary

End with a German summary:

- **Eingerichtet:** the files and folders, the values in `schulkontext.md` and `kriterien.md`, the Ablage, the Ansicht, and the permissions that are in place.
- **Fehlt noch:** every placeholder that is left (file and line), every skipped OneNote step with the reason, an Ansicht that was not measured when the teacher projects with a fixed visible area, permissions the teacher declined, and a section to create in OneNote. When nothing is missing, say `Alles ist eingerichtet.`
- **Befehle:**

  ```
  /unterricht:stunde-planen <Thema, Klasse, Hinweise>: plant eine neue Stunde, zum Beispiel /unterricht:stunde-planen Brüche als Anteile, 6b, Einstieg mit Pizza-Beispiel
  /unterricht:stunde-ueberarbeiten [Stunde] [Änderungen]: setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige
  /unterricht:einrichten: prüft diesen Ordner und ergänzt, was fehlt
  ```
