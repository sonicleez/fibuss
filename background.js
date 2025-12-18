// background.js - Service Worker for Google Labs Flow Automator

console.log('[Flow Automator] Background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Flow Automator] Extension installed');

        // Set default settings
        chrome.storage.local.set({
            queue: [],
            characters: [],
            settings: {
                delayMs: 5000,
                autoDownload: true
            }
        });
    }
});

// Handle download requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'download_video') {
        chrome.downloads.download({
            url: message.url,
            filename: message.filename || 'flow_video.mp4',
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('[Flow Automator] Download failed:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('[Flow Automator] Download started:', downloadId);
                sendResponse({ success: true, downloadId });
            }
        });
        return true; // Keep message channel open
    }
});

// Monitor download completion
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        console.log('[Flow Automator] Download completed:', delta.id);
    }
});
