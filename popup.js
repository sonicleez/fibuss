// popup.js - Extension popup logic

let queue = [];
let characters = [];

// Load saved data from storage
chrome.storage.local.get(['queue', 'characters', 'settings'], (result) => {
    if (result.queue) queue = result.queue;
    if (result.characters) characters = result.characters;

    updateQueueCount();
    updateCharacterList();

    if (result.settings) {
        document.getElementById('delay-ms').value = result.settings.delayMs || 5000;
        document.getElementById('auto-download').checked = result.settings.autoDownload !== false;
    }
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');
    });
});

// Status logging
function log(message) {
    const statusLog = document.getElementById('status-log');
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'status-line';
    line.textContent = `[${timestamp}] ${message}`;
    statusLog.insertBefore(line, statusLog.firstChild);

    // Keep only last 10 messages
    while (statusLog.children.length > 10) {
        statusLog.removeChild(statusLog.lastChild);
    }
}

// Update queue count
function updateQueueCount() {
    document.getElementById('queue-count').textContent = queue.length;
    saveQueue();
}

// Update character list display
function updateCharacterList() {
    const list = document.getElementById('character-list');
    list.innerHTML = '';

    characters.forEach((char, index) => {
        const item = document.createElement('div');
        item.className = 'character-item';
        item.textContent = `${char.name} (${char.images.length} ảnh)`;
        list.appendChild(item);
    });

    saveCharacters();
}

// Save to storage
function saveQueue() {
    chrome.storage.local.set({ queue });
}

function saveCharacters() {
    chrome.storage.local.set({ characters });
}

function saveSettings() {
    const settings = {
        delayMs: parseInt(document.getElementById('delay-ms').value),
        autoDownload: document.getElementById('auto-download').checked
    };
    chrome.storage.local.set({ settings });
}

// Convert File to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Send message to content script
async function sendToContentScript(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes('labs.google')) {
        log('❌ Vui lòng mở trang Google Labs Flow');
        return null;
    }

    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, message, (response) => {
            if (chrome.runtime.lastError) {
                log('❌ Lỗi: ' + chrome.runtime.lastError.message);
                resolve(null);
            } else {
                resolve(response);
            }
        });
    });
}

// ========================================
// TEXT TO VIDEO
// ========================================
document.getElementById('add-text-queue').addEventListener('click', () => {
    const promptsText = document.getElementById('text-prompts').value.trim();
    if (!promptsText) {
        log('❌ Vui lòng nhập prompts');
        return;
    }

    const prompts = promptsText.split('\n').filter(p => p.trim());
    prompts.forEach(prompt => {
        queue.push({
            type: 'text_to_video',
            prompt: prompt.trim()
        });
    });

    updateQueueCount();
    log(`✅ Đã thêm ${prompts.length} text-to-video tasks`);
    document.getElementById('text-prompts').value = '';
});

// ========================================
// IMAGE TO VIDEO
// ========================================
document.getElementById('add-image-queue').addEventListener('click', async () => {
    const startFiles = document.getElementById('start-images').files;
    const endFiles = document.getElementById('end-images').files;
    const prompt = document.getElementById('image-prompt').value.trim();

    if (startFiles.length === 0 || endFiles.length === 0) {
        log('❌ Vui lòng chọn cả start và end frame images');
        return;
    }

    if (startFiles.length !== endFiles.length) {
        log('❌ Số lượng start và end images phải bằng nhau');
        return;
    }

    log('⏳ Đang xử lý images...');

    for (let i = 0; i < startFiles.length; i++) {
        const startBase64 = await fileToBase64(startFiles[i]);
        const endBase64 = await fileToBase64(endFiles[i]);

        queue.push({
            type: 'image_to_video',
            startImage: startBase64,
            endImage: endBase64,
            prompt: prompt
        });
    }

    updateQueueCount();
    log(`✅ Đã thêm ${startFiles.length} image-to-video tasks`);

    document.getElementById('start-images').value = '';
    document.getElementById('end-images').value = '';
    document.getElementById('image-prompt').value = '';
});

// ========================================
// CHARACTER SYNC
// ========================================
document.getElementById('add-character').addEventListener('click', async () => {
    const name = document.getElementById('char-name').value.trim();
    const files = document.getElementById('char-images').files;

    if (!name) {
        log('❌ Vui lòng nhập tên nhân vật');
        return;
    }

    if (files.length < 1 || files.length > 3) {
        log('❌ Vui lòng chọn 1-3 ảnh cho nhân vật');
        return;
    }

    log('⏳ Đang lưu nhân vật...');

    const images = [];
    for (let i = 0; i < files.length; i++) {
        const base64 = await fileToBase64(files[i]);
        images.push(base64);
    }

    characters.push({ name, images });
    updateCharacterList();

    log(`✅ Đã lưu nhân vật: ${name} (${images.length} ảnh)`);

    document.getElementById('char-name').value = '';
    document.getElementById('char-images').value = '';
});

document.getElementById('add-char-queue').addEventListener('click', () => {
    const actionsText = document.getElementById('char-actions').value.trim();
    if (!actionsText) {
        log('❌ Vui lòng nhập hành động');
        return;
    }

    const actions = actionsText.split('\n').filter(a => a.trim());
    let addedCount = 0;

    actions.forEach(action => {
        // Parse: "CharacterName doing something"
        const parts = action.trim().split(' ');
        const characterName = parts[0];
        const actionText = parts.slice(1).join(' ');

        const character = characters.find(c => c.name === characterName);
        if (!character) {
            log(`⚠️ Nhân vật không tồn tại: ${characterName}`);
            return;
        }

        queue.push({
            type: 'character_video',
            characterName: characterName,
            action: actionText,
            images: character.images
        });
        addedCount++;
    });

    updateQueueCount();
    log(`✅ Đã thêm ${addedCount} character video tasks`);
    document.getElementById('char-actions').value = '';
});

// ========================================
// QUEUE PROCESSING
// ========================================
document.getElementById('start-queue').addEventListener('click', async () => {
    if (queue.length === 0) {
        log('❌ Hàng chờ trống');
        return;
    }

    saveSettings();

    const delayMs = parseInt(document.getElementById('delay-ms').value);
    const autoDownload = document.getElementById('auto-download').checked;

    log(`▶️ Bắt đầu xử lý ${queue.length} tasks...`);

    // Start video monitor
    await sendToContentScript({
        action: 'start_monitor',
        autoDownload: autoDownload
    });

    // Send queue to content script
    const response = await sendToContentScript({
        action: 'process_queue_custom',
        queue: queue,
        delayMs: delayMs
    });

    if (response && response.success) {
        log(`✅ Hàng chờ đã được gửi`);
        // Clear queue after sending
        queue = [];
        updateQueueCount();
    }
});

document.getElementById('clear-queue').addEventListener('click', () => {
    queue = [];
    updateQueueCount();
    log('🗑️ Đã xóa hàng chờ');
});

// ========================================
// AUTO-DOWNLOAD TOGGLE
// ========================================
document.getElementById('auto-download').addEventListener('change', (e) => {
    saveSettings();
    sendToContentScript({
        action: 'set_auto_download',
        enabled: e.target.checked
    });
});

log('🚀 Extension ready!');
