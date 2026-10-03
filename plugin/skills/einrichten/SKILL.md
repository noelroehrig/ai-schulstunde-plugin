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

Read `schulkontext.md`, `kriterien.md`, and `onenote.md`. A placeholder is text in square brackets, for example `[Minuten eintragen]` or `[...]`.

The fields, each with its question and the rule for when it still needs a value:

| Field | File and place | Needs a value when | Question |
|---|---|---|---|
| Schule | `schulkontext.md`, `## Schule` | the section holds a placeholder or is empty | 1 |
| Stundenlänge | `schulkontext.md`, line `Stundenlänge:` | the value is not a number (decimal comma allowed) | 2 |
| Phasenmodell | `schulkontext.md`, `## Phasenmodell` | always: the template's default is only a suggestion, so the teacher confirms it at every run | 3 |
| Besondere Regeln | `schulkontext.md`, list under `Besondere Regeln:` | the list holds a placeholder or is empty | 4 |
| Fächer und Klassen | `schulkontext.md`, table of `## Fächer und Klassen` | the table has no row below its header and separator, or a row holds a placeholder | 5 |
| Ausstattung | `schulkontext.md`, `## Ausstattung im Unterricht` | the section holds a placeholder or is empty | 6 |
| Was jede Planung beachten soll | `schulkontext.md`, `## Was jede Planung beachten soll` | the list holds a placeholder or is empty | 7 |
| Kriterien | `kriterien.md`, the Muss and Soll lists of `## Planung` and `## Tafelbild` | a list holds a placeholder | 8 |

The Ablage and Ansicht of `onenote.md` are filled in steps 4 and 5.

1. When no field needs a value other than the Phasenmodell, the files are complete. Tell the teacher the Stundenlänge, the Phasenmodell, and the classes you found, and ask `Die Angaben in schulkontext.md und kriterien.md sind ausgefüllt. Passt das Phasenmodell so, und möchtest du sonst etwas ändern? Antworte mit „weiter“, oder schreib, was sich ändern soll.` and end your turn.
   - `weiter`: the Phasenmodell is confirmed; change nothing and go to step 4.
   - Feedback: build the change as in item 4 and propose it as in item 5.
2. Otherwise ask the questions of every field that needs a value, the Phasenmodell always included, and end your turn. Start with `Jetzt brauche ich ein paar Angaben zu deiner Schule. Wenn du Anweisungen aus einem Claude-Projekt hast, kannst du sie einfach hier einfügen. Sonst beantworte bitte diese Fragen:`, then list the questions in this order, numbered from 1, verbatim:

   1. `An welcher Schule unterrichtest du (Schulform, Bundesland, Besonderheiten)?`
   2. `Wie viele Minuten dauert eine Unterrichtsstunde?`
   3. `Welche Phasen hat eine Stunde bei dir? Bisher steht dort: <Phasenmodell aus schulkontext.md>. Passt das?`
   4. `Gibt es besondere Regeln, zum Beispiel feste Rituale? Sonst schreib „keine“.`
   5. `Welche Klassen und Fächer unterrichtest du, mit welchem Lehrplan und Lehrwerk?`
   6. `Welche Ausstattung hast du im Unterricht, zum Beispiel Beamer, Tablet mit Spiegelung oder Tafel?`
   7. `Gibt es etwas, das jede Planung beachten soll? Sonst schreib „nichts“.`
   8. `Was muss eine gute Planung und ein gutes Tafelbild für dich erfüllen, und was wäre nur schön? Sonst schreib „nichts weiter“.`

   When the answer leaves a field open, ask once more for that field only. A field the teacher explicitly leaves open stays as it is and is listed as missing in the summary.
3. Pasted instructions from a Claude project: sort what they say into `schulkontext.md` (school, lesson length, phases, rules, classes, equipment, what every plan should take into account), `kriterien.md` (Muss and Soll for the Planung and the Tafelbild), and `onenote.md` (where pages go, page titles, visible area, colors). Do not invent values the instructions do not contain; ask the questions of the fields that still need a value, the Phasenmodell included when the instructions do not name the phases. Leave out student names and other personal data, and tell the teacher you did.
4. Build the change. Keep every heading, the privacy note, and the line formats of the templates, for example `Stundenlänge: 45 Minuten` with a decimal comma when needed. Replace each placeholder line the teacher's answer covers. An answer of `keine` or `nichts` becomes the line `- keine`, so that the field no longer needs a value. Keep `Die Phasen ergeben zusammen genau die Stundenlänge.` and `Alles, was die Klasse gleichzeitig sehen soll, passt in die sichtbare Breite.` unless the teacher asks to remove them.
5. Show the change of each file you would change: the new lines, and the lines they replace. When nothing changes (the Phasenmodell confirmed, nothing else asked), say so and go to step 4. Otherwise ask `Soll ich das so in <Dateien> eintragen? Antworte mit „ja“, oder schreib, was anders sein soll.` and end your turn. Write only after a yes, then go to step 4. On feedback, change the proposal and ask again. On a no without feedback, ask what to change; when the teacher wants to skip, write nothing and list the open fields as missing.

## 4. OneNote

On a OneNote error, or `onenote_responsive: false`, in this step or in step 5: tell the teacher in German what happened, for example `OneNote reagiert gerade nicht. Bitte öffne OneNote und schließe alle offenen Dialoge.`, show an error message from the server verbatim, skip the remaining OneNote steps of steps 4 and 5, and list them as missing in the summary. A OneNote error arrives as `Error executing tool <tool>: <code>: <message>`; the code is `timeout`, `backend_error`, or `bad_request`. Never create a notebook or a section.

1. The `notebook` setting (`OneNote notebook` above) must not be blank and must not contain a comma. Otherwise call no OneNote tool and say `Die Einstellung „OneNote-Notizbuch“ ist leer oder enthält ein Komma. Öffne mit /config die Einstellungen des Plugins „unterricht“ und trag bei „OneNote-Notizbuch“ genau den Namen eines Notizbuchs ein, zum Beispiel „Unterricht“. Führe danach /unterricht:einrichten noch einmal aus.` Skip steps 4 and 5.
2. Call `mcp__plugin_unterricht_onenote__ping`. It must report `onenote_responsive: true`.
3. Call `mcp__plugin_unterricht_onenote__get_notebooks`. The notebook whose name is exactly the `notebook` setting, case-sensitive, must be in the list. Otherwise say `Das Notizbuch „<notebook>“ wurde in OneNote nicht gefunden. Der Name muss genau stimmen, auch bei Groß- und Kleinschreibung. Du kannst ihn mit /config in der Einstellung „OneNote-Notizbuch“ ändern. Ich lege nie ein Notizbuch an.` and skip the rest of steps 4 and 5. Sections inside section groups are not listed and not supported.
4. For each section of the notebook, call `mcp__plugin_unterricht_onenote__list_pages`. Read titles only; read no page.
5. Draft the `## Ablage` of `onenote.md` from the section names and the page titles:
   - `Abschnitt:` `Klasse` when the sections are named like the classes (one section per class), else the name of the section the lessons go into.
   - `Seitentitel:` the scheme the existing page titles follow, written with `JJJJ-MM-TT` for the date, `Klasse` for the class, and `Thema` for the topic, for example `JJJJ-MM-TT Klasse Thema`. When the titles show no scheme, propose `JJJJ-MM-TT Klasse Thema`.
6. When `## Ablage` is already filled (no placeholder in `Abschnitt` or `Seitentitel`), do not draft a new one. Show it, name a section it needs that does not exist in the notebook, and ask `In onenote.md steht diese Ablage. Soll sie so bleiben? Antworte mit „weiter“, oder schreib, was sich ändern soll.` and end your turn.
   - `weiter`: change nothing, record the Ablage as set up (with a missing section as missing), and go to step 5.
   - Feedback: draft the change from the teacher's words and the notebook, and continue with item 7.
7. Show the draft with the sections and a few page titles it is based on, and ask `Soll ich die Ablage so in onenote.md eintragen? Antworte mit „ja“, oder schreib, was anders sein soll.` and end your turn. Write only after a yes, then go to step 5. On feedback, change the draft and ask again. On a no without feedback, ask what to change; when the teacher wants to skip, write nothing and list the Ablage as missing. When `Abschnitt` names a section that does not exist yet, say `Bitte lege den Abschnitt „<Abschnitt>“ in OneNote an. Ich lege keine Abschnitte an.`

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
2. When it exists and is valid JSON, the proposal is the file with every rule above that is missing appended to `permissions.allow`. When the file has no `permissions` key, add `"permissions": { "allow": [...] }`; when `permissions` has no `allow` key, add `"allow": [...]` to it. Keep everything else unchanged: other keys, other rules, and their order. When every rule is already there, say `Die Berechtigungen in .claude/settings.json sind schon eingetragen.` and go to step 7.
3. Do not change the file in two cases; show the rules, and go to step 7:
   - It is not valid JSON. Say `Die Datei .claude/settings.json kann ich nicht sicher ergänzen, weil sie kein gültiges JSON enthält. Ich ändere sie nicht. Wenn du die Regeln selbst eintragen möchtest, gehören diese Einträge in die Liste „allow“ unter „permissions“:`
   - It is valid JSON, but the file itself is not an object, `permissions` is not an object, or `permissions.allow` is not a list. Say `Die Datei .claude/settings.json hat einen unerwarteten Aufbau: „permissions“ oder „allow“ hat nicht die erwartete Form. Ich ändere sie nicht. Wenn du die Regeln selbst eintragen möchtest, gehören diese Einträge in die Liste „allow“ unter „permissions“:`
4. Show the proposal and say which rules are new, then ask `Damit du nicht bei jedem Schritt eine Erlaubnis bestätigen musst, kann ich diese Regeln in .claude/settings.json in deinem Arbeitsordner eintragen. Sie erlauben das Schreiben in Stunden/, das Lesen der Plugin-Dateien und die OneNote-Werkzeuge des Plugins. Soll ich sie eintragen? Antworte mit „ja“ oder „nein“.` and end your turn. Write only after a yes; create `.claude/` when it is missing. On a no, write nothing and list the permissions as not set up.

## 7. Summary

End with a German summary:

- **Eingerichtet:** the files and folders, the values in `schulkontext.md` and `kriterien.md`, the Ablage, the Ansicht, and the permissions that are in place.
- **Fehlt noch:** every field of step 3 that still needs a value by the rules of its table (the Phasenmodell counts as set once confirmed), with file and line, a placeholder left in the `## Ablage` of `onenote.md`, every skipped OneNote step with the reason, an Ansicht that was not measured when the teacher projects with a fixed visible area, permissions the teacher declined, and a section to create in OneNote. When nothing is missing, say `Alles ist eingerichtet.`
- **Befehle:**

  ```
  /unterricht:stunde-planen <Thema, Klasse, Hinweise>: plant eine neue Stunde, zum Beispiel /unterricht:stunde-planen Brüche als Anteile, 6b, Einstieg mit Pizza-Beispiel
  /unterricht:stunde-ueberarbeiten [Stunde] [Änderungen]: setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige
  /unterricht:einrichten: prüft diesen Ordner und ergänzt, was fehlt
  ```
