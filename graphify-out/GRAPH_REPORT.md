# Graph Report - yt_dlp_gui  (2026-11-11)

## Corpus Check
- 16 files · ~22,749 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 8, (none) 2)

## Summary
- 182 nodes · 259 edges · 15 communities (14 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4cde3bab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- neutralino.config.json
- utils.js
- window
- YT-MANGO
- settings.js
- notifs.js
- analyze.js
- sections.js
- state.js
- tools.js
- download.js
- playlist.js
- grid.js
- tabs.js
- command.js

## God Nodes (most connected - your core abstractions)
1. `window` - 16 edges
2. `YT-MANGO` - 8 edges
3. `cli` - 7 edges
4. `renderNotifPanel()` - 6 edges
5. `analyzeUrl()` - 5 edges
6. `renderGrid()` - 5 edges
7. `renderDualColumn()` - 5 edges
8. `renderCompactRow()` - 5 edges
9. `updateNotifBadge()` - 5 edges
10. `renderPlaylistList()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (15 total, 1 thin omitted)

### Community 0 - "neutralino.config.json"
Cohesion: 0.09
Nodes (22): applicationId, cli, binaryName, binaryVersion, clientLibrary, clientVersion, extensionsPath, resourcesPath (+14 more)

### Community 1 - "utils.js"
Cohesion: 0.13
Nodes (11): applySmartDir(), detectErrorFix(), formatBytes(), formatSizeValue(), getDurationSeconds(), getFormatDisplaySize(), getTextDir(), removeToast() (+3 more)

### Community 2 - "window"
Cohesion: 0.12
Nodes (16): window, alwaysOnTop, borderless, center, enableInspector, exitProcessOnClose, fullScreen, height (+8 more)

### Community 3 - "YT-MANGO"
Cohesion: 0.12
Nodes (15): Advanced, Core, Credits, 📥 Download, Features, First Launch, Getting Started, License (+7 more)

### Community 4 - "settings.js"
Cohesion: 0.28
Nodes (14): checkAllRuntimes(), checkboxes, checkRuntime(), handleCheckRuntime(), initRuntimeManagers(), initSettingsTabs(), initShortcutInputs(), installedRuntimes (+6 more)

### Community 5 - "notifs.js"
Cohesion: 0.29
Nodes (12): addNotif(), clearNotifHistory(), escapeHtml(), formatNotifTime(), loadNotifHistory(), notifBtn, notifClearBtn, notifHistory (+4 more)

### Community 6 - "analyze.js"
Cohesion: 0.33
Nodes (8): analyzePlaylist(), analyzeUrl(), cancelPreviousAnalysisProcess(), escapeCmdArg(), quickM4a(), runSpawnalyze(), updateDynamicBackground(), openGithubBtn

### Community 7 - "sections.js"
Cohesion: 0.38
Nodes (10): downloadSubtitle(), escapeCmdArg(), getTimeFromInputs(), onSliderInput(), reconcileRange(), renderSubtitles(), safeFormatDuration(), setTimePicker() (+2 more)

### Community 8 - "state.js"
Cohesion: 0.20
Nodes (8): el, formats, playlistDownloads, playlistItemsToDownload, playlistSelection, resolutionSelections, selectedSubtitles, settings

### Community 9 - "tools.js"
Cohesion: 0.42
Nodes (9): checkFfmpeg(), checkYtdlp(), checkYtdlpVersion(), downloadYtdlp(), ensureToolsInstalled(), getSharedCache(), handleInstallError(), installFfmpeg() (+1 more)

### Community 10 - "download.js"
Cohesion: 0.39
Nodes (7): buildWindowsRevealCommand(), encodePowershellScript(), extractDestinationPath(), openFileLocation(), psSingleQuote(), removePanel(), startDownload()

### Community 11 - "playlist.js"
Cohesion: 0.44
Nodes (8): buildPlaylistItemCmd(), downloadPlaylistItems(), escapeCmdArg(), fetchPlaylistLanguages(), populatePlaylistModal(), renderPlaylistList(), statusLabel(), updatePlaylistSelectionInfo()

### Community 12 - "grid.js"
Cohesion: 0.57
Nodes (7): getNormalizedResolution(), getResolutionSortValue(), handleRowClick(), renderAudioColumn(), renderCompactRow(), renderDualColumn(), renderGrid()

### Community 13 - "tabs.js"
Cohesion: 0.53
Nodes (3): closeTab(), createNewTab(), switchToTab()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `window` connect `window` to `neutralino.config.json`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `neutralino.config.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `modes` connect `neutralino.config.json` to `window`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `utils.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `window` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `YT-MANGO` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._