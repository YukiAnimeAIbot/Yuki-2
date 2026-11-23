# Command Audit — v5.4.0

The active command inventory is maintained in `YUKI-COMMANDS.md`. Runtime routing is slash-only. `/play` is the only retained music/media download command. Anime metadata and cover-image delivery remain part of the anime feature set.

The automated smoke test verifies removed routes are not registered, Owner-only group lifecycle operations work, and no group-add event triggers a voluntary leave.
