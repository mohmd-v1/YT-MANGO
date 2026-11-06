// Global state, settings object and element registry.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)


// State
let currentData = null;
let formats = [];
let selectedVideoId = null;
let selectedAudioId = null;
let activeTab = 'combined'; // combined, mixed
let currentDownloadProcess = null; // Track current download process
let currentDownloadProcessPid = null; // Track OS PID
let currentAnalyzeProcess = null; // Track current analyze process ID
let currentAnalyzeProcessPid = null; // Track OS PID for analyze process
let isAnalysisCancelled = false; // Track analysis cancellation state
let sectionTime = ''; // Track applied sections time range
let currentPlaylistData = null;
let playlistItemsToDownload = []; // Array of indices (1-indexed)
let isPlaylistMode = false;
// New playlist manager state
let playlistData = null;
let playlistSelection = new Set();
let playlistDownloads = new Map();
let playlistMaxConcurrent = 3;
let resolutionSelections = {}; // Track user selections per resolution: { '1920x1080': { cType: 'av01', formatId: '...' } }
let selectedSubtitles = []; // Array of language codes
let autoSubsEnabled = false;
let settings = {
    downloadPath: 'Downloads',
    cookiesPath: '',
    useCookies: false,
    embedMetadata: false,
    embedThumbnail: false,
    restrictFilenames: false,
    noPlaylist: false,
    writeSubs: false,
    ignoreErrors: false,
    concurrentFragments: 8,
    quickAudioFormat: 'opus',
    jsRuntime: 'none',
    theme: 'system',
    shortcuts: {
        analyze: 'Ctrl+KeyV',
        quickAudio: 'Alt+Digit1',
        playlist: 'Alt+Digit2'
    }
};

// Elements

const el = {
    urlInput: document.getElementById('urlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    analyzePlaylistBtn: document.getElementById('analyzePlaylistBtn'),
    quickM4aBtn: document.getElementById('quickM4aBtn'),
    quickAudioLabel: document.getElementById('quickAudioLabel'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    cancelAnalyzeBtn: document.getElementById('cancelAnalyzeBtn'),
    contentArea: document.getElementById('contentArea'),
    videoInfo: document.getElementById('videoInfo'),
    thumbnailWrapper: document.getElementById('thumbnailWrapper'),
    videoThumbnail: document.getElementById('videoThumbnail'),
    videoDurationOverlay: document.getElementById('videoDurationOverlay'),
    mainEmbedMeta: document.getElementById('mainEmbedMetadata'),
    mainEmbedThumb: document.getElementById('mainEmbedThumbnail'),
    gridBody: document.getElementById('gridBody'),
    videoGridBody: document.getElementById('videoGridBody'),
    audioGridBody: document.getElementById('audioGridBody'),
    subSelectorWrapper: document.getElementById('subSelectorWrapper'),
    subMultiSelect: document.getElementById('subMultiSelect'),
    subCountText: document.getElementById('subCountText'),
    subOptionsList: document.getElementById('subOptionsList'),
    dualView: document.getElementById('dualView'),
    standardView: document.getElementById('standardView'),
    emptyState: document.getElementById('emptyState'),
    tabs: document.querySelectorAll('.tab-btn'),
    cmdPreview: document.getElementById('cmdPreview'),
    downloadBtn: document.getElementById('downloadBtn'),
    downloadSectionBtn: document.getElementById('downloadSectionBtn'),
    clearSectionBadge: document.getElementById('clearSectionBadge'),
    clearFormatBadge: document.getElementById('clearFormatBadge'),
    formatTooltip: document.getElementById('formatTooltip'),
    selectedFormatInfoText: document.getElementById('selectedFormatInfoText'),
    toggleSettings: document.getElementById('toggleSettings'),
    toggleCommand: document.getElementById('toggleCommand'),
    videoOnlyNote: document.getElementById('videoOnlyNote'),
    settingsModal: document.getElementById('settingsModal'),
    commandModal: document.getElementById('commandModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    closeCommandBtn: document.getElementById('closeCommandBtn'),
    statusMsg: document.getElementById('statusMsg'),
    inputs: {
        path: document.getElementById('downloadPath'),
        browse: document.getElementById('browseBtn'),
        cookiesPath: document.getElementById('cookiesPath'),
        useCookies: document.getElementById('useCookies'),
        browseCookies: document.getElementById('browseCookiesBtn'),
        clearCookies: document.getElementById('clearCookiesBtn'),
        embedMeta: document.getElementById('embedMetadata'),
        embedThumb: document.getElementById('embedThumbnail'),
        restrict: document.getElementById('restrictFilenames'),
        noPlaylist: document.getElementById('noPlaylist'),
        writeSubs: document.getElementById('writeSubs'),
        ignoreErrors: document.getElementById('ignoreErrors'),
        concurrentFragments: document.getElementById('concurrentFragments'),
        quickAudioFormat: document.getElementById('quickAudioFormat'),
        jsRuntimeSelect: document.getElementById('jsRuntimeSelect'),
        themeSelect: document.getElementById('themeSelect'),
        shortcutAnalyze: document.getElementById('shortcutAnalyze'),
        shortcutQuickAudio: document.getElementById('shortcutQuickAudio'),
        shortcutPlaylist: document.getElementById('shortcutPlaylist')
    },
    ytdlpVersionText: document.getElementById('ytdlpVersionText'),
    ffmpegVersionText: document.getElementById('ffmpegVersionText'),
    updateYtdlpBtn: document.getElementById('updateYtdlpBtn'),
    modal: {
        self: document.getElementById('progressModal'),
        bar: document.getElementById('progressBar'),
        log: document.getElementById('progressLog'),
        close: document.getElementById('closeModalBtn'),
        open: document.getElementById('openFolderBtn'),
        cancel: document.getElementById('cancelDownloadBtn'),
        processing: document.getElementById('processingView'),
        success: document.getElementById('successView')
    },
    sections: {
        modal: document.getElementById('sectionsModal'),
        closeBtn: document.getElementById('closeSectionsBtn'),
        startH: document.getElementById('startH'),
        startM: document.getElementById('startM'),
        startS: document.getElementById('startS'),
        endH: document.getElementById('endH'),
        endM: document.getElementById('endM'),
        endS: document.getElementById('endS'),
        applyBtn: document.getElementById('applySectionBtn'),
        clearBtn: document.getElementById('clearSectionBtn'),
        chapterContainer: document.getElementById('chapterContainer'),
        chapterSelect: document.getElementById('chapterSelect'),
        sliderContainer: document.getElementById('sliderContainer'),
        startSlider: document.getElementById('startSlider'),
        endSlider: document.getElementById('endSlider'),
        sliderTrackFill: document.getElementById('sliderTrackFill'),
        startTimeDisp: document.getElementById('sliderStartTimeDisplay'),
        endTimeDisp: document.getElementById('sliderEndTimeDisplay')
    },
    playlist: {
        modal: document.getElementById('playlistModal'),
        list: document.getElementById('playlistList'),
        closeBtn: document.getElementById('closePlaylistBtn'),
        selectAllBtn: document.getElementById('selectAllPlaylistBtn'),
        deselectAllBtn: document.getElementById('deselectAllPlaylistBtn'),
        invertBtn: document.getElementById('invertPlaylistBtn'),
        searchInput: document.getElementById('playlistSearchInput'),
        countLabel: document.getElementById('playlistCountLabel'),
        titleEl: document.getElementById('playlistTitle'),
        videoQualitySelect: document.getElementById('playlistVideoQuality'),
        audioQualitySelect: document.getElementById('playlistAudioQuality'),
        audioLangSelect: document.getElementById('playlistAudioLang'),
        audioOnlyCheckbox: document.getElementById('playlistAudioOnly'),
        embedMetaCheckbox: document.getElementById('playlistEmbedMeta'),
        embedThumbCheckbox: document.getElementById('playlistEmbedThumb'),
        selectionInfo: document.getElementById('playlistSelectionInfo'),
        pauseAllBtn: document.getElementById('pauseAllPlaylistBtn'),
        downloadSelectedBtn: document.getElementById('downloadSelectedPlaylistBtn'),
        downloadAllBtn: document.getElementById('downloadAllPlaylistBtn')
    },
    install: {
        modal: document.getElementById('installModal'),
        promptView: document.getElementById('installPromptView'),
        progressView: document.getElementById('installProgressView'),
        status: document.getElementById('installStatusText'),
        startBtn: document.getElementById('startInstallBtn'),
        exitBtn: document.getElementById('exitAppBtn'),
        skipBtn: document.getElementById('skipInstallBtn'),
        title: document.getElementById('installTitle'),
        desc: document.getElementById('installDesc'),
        progTitle: document.getElementById('progressTitle'),
        progDesc: document.getElementById('progressDesc')
    },
    alert: {
        modal: document.getElementById('alertModal'),
        title: document.getElementById('alertTitle'),
        msg: document.getElementById('alertMsg'),
        closeBtn: document.getElementById('closeAlertBtn')
    }
};


function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') {
        applyTheme('system');
    }
});

// Receive theme changes broadcast by the browser shell (when theme is changed in another tab)
window.addEventListener('message', (e) => {
    const theme = e.data && e.data.theme;
    if (e.data && e.data.type === 'theme-change' &&
        (theme === 'light' || theme === 'dark' || theme === 'system')) {
        settings.theme = theme;
        applyTheme(theme);
        if (el.inputs.themeSelect) el.inputs.themeSelect.value = theme;
    }
});


