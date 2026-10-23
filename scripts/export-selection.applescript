-- Exports the photos currently selected in Photos.app to a destination folder.
-- Called by scripts/add-photos.mjs — not meant to be run standalone, but you can:
--   osascript scripts/export-selection.applescript /path/to/folder

on run argv
    if (count of argv) = 0 then
        error "Usage: export-selection.applescript <destination-folder>"
    end if
    set destFolder to POSIX file (item 1 of argv)

    tell application "Photos"
        activate
        set theSelection to selection
        if (count of theSelection) = 0 then
            error "No photos are selected in Photos.app. Select some, then try again."
        end if
        export theSelection to destFolder
    end tell
end run
