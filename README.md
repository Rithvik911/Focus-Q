# Focus Queue

Focus Queue is a local-first Obsidian plugin for planning study work without decision paralysis. **Today** is synchronized into **This week**, and the queue surfaces one clear “Next up” task.

## Features

- Real binary-heap priority queue driven by your drag order
- Synchronized Today and This week views—today's tasks also appear in the week
- Drag ordering with no labels or priority decisions
- Optional deadlines with overdue and due-today indicators
- Add, change, or remove a deadline from any task
- Persistent Sort by deadline checkbox; undated tasks stay after dated tasks
- One-click complete, restore, and delete
- Calm responsive interface for desktop and mobile Obsidian
- Local-only persistence through Obsidian's plugin data API
- No network access, accounts, or telemetry

## Install manually

1. Create `<your-vault>/.obsidian/plugins/focus-queue/`.
2. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
3. Restart Obsidian.
4. Open **Settings → Community plugins**, turn on community plugins if needed, and enable **Focus Queue**.
5. Select the checklist icon in the left ribbon, or run **Focus Queue: Open Focus Queue** from the command palette.

## Build from source

Requires Node.js 18 or newer.

```bash
npm install
npm run build
```

The build creates `main.js` at the project root.
