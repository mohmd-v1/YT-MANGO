# YT-DLP Dashboard: Technical Implementation Details

This document provides a deep dive into the technical architecture and logic behind the YT-DLP GUI dashboard.

## 1. Core Architecture
The application is built using **Neutralinojs**, a lightweight cross-platform desktop application framework.
- **Frontend**: Vanilla JavaScript, CSS3 (Custom Grid & Glassmorphism), and HTML5.
- **Backend Logic**: Orchestrated via JavaScript calling the `yt-dlp` CLI through `Neutralino.os.execCommand` and `Neutralino.os.spawnProcess`.
- **Data Management**: Uses `Neutralino.storage` for persistence of user settings and theme preferences.

---

## 2. Smart Analysis System (`-J` Logic)
To achieve high performance, the application uses a "Single-Pass Analysis" strategy.
- **Implementation**: Instead of calling `yt-dlp` multiple times to get title, thumbnail, and formats, we use the `-J` (or `--dump-json`) flag.
- **JSON Parsing**: The entire metadata of the video is retrieved in one large JSON object. All subsequent UI updates (Thumbnail rendering, Subtitle lists, Format grids) use this cached object.
- **Performance Boost**: Added `--no-check-certificates`, `--no-warnings`, and `--no-call-home` (optimized for older versions) to minimize network overhead during analysis.

---

## 3. Advanced Grid System & Codec Filtering
The application doesn't just list all formats; it intelligently groups and filters them for the user.
- **Grouping Logic**: Formats are grouped by resolution (e.g., 1080p, 720p).
- **Codec Priority**: Within each resolution, the app prioritizes modern codecs:
    - **Video**: AV01 > HEVC (H.265) > VP9 > AVC (H.264).
    - **Audio**: Opus > MP4A (AAC).
- **Dynamic Selectors**: Each row contains a custom dropdown that allows switching between different codecs or bitrates for the *same* resolution without refreshing the page.

---

## 4. Subtitle Management (Compact Integration)
Subtitles are integrated directly into the Audio header to save space.
- **Multi-Selector**: A custom JavaScript component that allows users to check multiple languages.
- **Auto-Caption Detection**: The logic separates manual subtitles from automatic captions. If an auto-caption is selected, the command builder adds `--write-auto-subs`.
- **Direct Download**: Users can download subtitle files independently.
    - **Logic**: It retrieves the direct URL from the cached JSON, uses a sanitized filename, and triggers a `PowerShell` command (`Invoke-WebRequest`) for an instant download without re-running `yt-dlp`.

---

## 5. Audio-Only Optimization
Special handling is implemented for users who only want to download audio.
- **Smart Flags**: If an audio-only format is selected:
    - If the codec is **Opus**, the app appends `-x --audio-format opus`.
    - This ensures `yt-dlp` extracts the stream and saves it in the correct container immediately.

---

## 6. Theme & UX Implementation
- **Theme Engine**: Uses CSS Custom Properties (Variables) and `data-theme` attributes on the `<html>` element.
- **Glassmorphism**: Achieved using `backdrop-filter: blur()` and semi-transparent RGBA backgrounds to create a premium dashboard feel.
- **Safe Pathing**: Implemented drive-aware path validation. If the project is moved (e.g., from Drive F: to D:), the app verifies the existence of the cookies file and clears invalid paths to prevent crashes.

---

## 7. Quick Download System (Keyboard Shortcuts)
- **Alt + 1**: Triggers a "Quick Audio" download using predefined high-quality format IDs (`140` for M4A, `251` for Opus).
- **Visual Feedback**: A badge appears in the input field to show the user exactly which format is being targeted by the shortcut.

---

## 8. Stability & Error Handling
- **Restricted Filenames**: Uses `--restrict-filenames` and manual regex sanitization to ensure Windows compatibility (removing `?`, `*`, `|`, etc.).
- **Process Management**: Uses `taskkill /F /T` to ensure that when a user cancels a download, both `yt-dlp` and its sub-processes (like `ffmpeg`) are terminated completely, preventing "zombie" processes.
