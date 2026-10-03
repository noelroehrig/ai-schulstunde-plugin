# Änderungen

## 0.1.0 (2026-10-03)

Erste Version.

- `/unterricht:einrichten` richtet den Arbeitsordner mit `schulkontext.md`, `kriterien.md` und `onenote.md` ein, prüft die Verbindung zu OneNote, misst auf Wunsch die sichtbare Fläche aus und bietet die Freigaben für weniger Rückfragen an. Ein zweiter Aufruf prüft, ob noch alles stimmt.
- `/unterricht:stunde-planen` plant eine neue Stunde: Der Plan wird gegen deine Kriterien geprüft und höchstens dreimal überarbeitet, du kannst ihn vor dem Tafelbild prüfen, und das Tafelbild entsteht als Seite in OneNote, ebenfalls mit Prüfung.
- `/unterricht:stunde-ueberarbeiten` setzt eine unterbrochene Stunde fort oder überarbeitet eine fertige Stunde mit deinen Änderungen auf einer neuen OneNote-Seite.
- Bleiben nach drei Runden Mängel offen, entscheidest du: übernehmen, Hinweise geben oder abbrechen.
- Deine eigenen Dateien und fertigen OneNote-Seiten werden nie überschrieben.
