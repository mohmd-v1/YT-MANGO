# AI Developer & Contributor Guide

This guide is designed for AI agents or developers who want to modify, extend, or debug the YT-DLP Dashboard. It outlines the codebase structure, state management, and critical patterns to follow.

---

## 1. Project Map
- **`resources/index.html`**: The UI skeleton. Uses IDs for all interactive elements.
- **`resources/styles.css`**: The design system. Uses CSS variables (`:root` and `[data-theme="light"]`) for easy theming.
- **`resources/js/main.js`**: The core logic. All functionality resides here.
- **`.storage/settings`**: Where user preferences are saved (handled by Neutralino storage).

---

## 2. Key Objects & State
When editing `main.js`, you must interact with these primary objects:

- **`el`**: A central mapping of DOM elements. **Rule**: Always check if an element exists in `el` before using it.
- **`settings`**: A global object containing user preferences (path, cookies, theme, etc.).
- **`currentData`**: Stores the latest `-J` metadata from `yt-dlp`. Use this for any info about the current video (title, thumbnails, formats).
- **Selection State**: 
    - `selectedVideoId`: The format ID of the selected video.
    - `selectedAudioId`: The format ID of the selected audio.
    - `selectedSubtitles`: An array of selected language codes.

---

## 3. Core Workflow Functions
If you want to add or change a feature, look here:

### **A. Analysis & Data**
- `smartAnalyze()`: Initial entry point for a URL. Determines if it's a playlist or video.
- `analyzeUrl()`: Performs the `yt-dlp -J` call and populates `currentData`.

### **B. UI Rendering**
- `renderGrid()`: Orchestrates the display of the format lists.
- `renderCompactRow()`: The most critical UI function. It builds the rows for video/audio streams, including the codec and bitrate selectors.
- `renderSubtitles()`: Handles the multi-select subtitle dropdown in the header.

### **C. Command Generation (The Heart)**
- `updateCommand()`: **CRITICAL.** This function rebuilds the `yt-dlp` command string whenever *any* state changes (selection, settings, subtitles). 
- **Rule**: If you change a setting or selection, you MUST call `updateCommand()` at the end of your logic.

### **D. Execution**
- `startDownload()`: Spawns the `yt-dlp` process and handles the progress modal/log.

---

## 4. Coding Standards for AI
1.  **Persistence**: After changing anything in `settings`, always call `saveSettings()`.
2.  **User Feedback**: Use `showStatus(message, type)` for non-intrusive feedback (footer) and `showAlert(message, title)` for critical errors.
3.  **Path Safety**: On Windows, always wrap paths in double quotes (e.g., `"${path}"`) and use `-P` for directories.
4.  **Performance Flags**: Always include the stability flags (`--no-check-certificates`, `--no-warnings`) in new commands to ensure speed.
5.  **Modularity**: Keep the `renderCompactRow` function clean. If adding complex UI logic, create a helper function.

---

## 5. Extending the UI
- **Styling**: Do not add inline styles unless necessary. Add classes to `styles.css` and use the CSS variable system.
- **Theming**: Ensure any new UI element has a defined style for both `dark` (default) and `light` modes.

---

## 6. Common Pitfalls to Avoid
- **Blocking the UI**: Never use synchronous loops for network/CLI tasks. Use `async/await`.
- **yt-dlp Versions**: Avoid deprecated flags like `--no-call-home`.
- **Zombie Processes**: When adding a new execution type, ensure it can be terminated via `taskkill` if the user cancels.
