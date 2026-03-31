// Configuration
const CONFIG = {
    // IMPORTANT: Hardcoded LIFF ID for GitHub Pages compatibility
    liffId: '2009603120-OxhhwblJ', 
    // IMPORTANT: Manual link needed for GitHub to talk to Google Sheets
    // Please paste your GAS Web App URL below
    gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbz_H_hG5B_08r0X6qZp_L17L18VVtkdy8/exec' // 我根據您的試算表推測的一個可能的 ID，請以您部署時得到的 URL 為準
};

// State Management
let userProfile = {
    userId: '',
    displayName: '',
    pictureUrl: '',
    tags: []
};

/**
 * Initialize LIFF
 */
async function initLIFF() {
    try {
        await liff.init({ liffId: CONFIG.liffId || 'YOUR_LIFF_ID_HERE' });
        if (!liff.isLoggedIn()) { liff.login(); return; }

        const profile = await liff.getProfile();
        userProfile.userId = profile.userId;
        userProfile.displayName = profile.displayName;
        userProfile.pictureUrl = profile.pictureUrl;

        await syncUserData();
        updateProfileUI();
        navigateTo('screen-home');
        hideLoading();
    } catch (err) {
        console.error('LIFF initialization failed', err);
        mockProfile();
    }
}

/**
 * Sync user data
 */
async function syncUserData() {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        return new Promise((resolve) => {
            google.script.run
                .withSuccessHandler((data) => {
                    userProfile.tags = data && data.tags ? data.tags.split(',').map(t => t.trim()) : [];
                    resolve(data);
                })
                .getOrCreateUser(userProfile.userId);
        });
    }
    return null;
}

/**
 * Update UI
 */
function updateProfileUI() {
    document.getElementById('user-name').textContent = userProfile.displayName;
    document.getElementById('user-img').src = userProfile.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky';
    document.getElementById('user-img-header').src = userProfile.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky';
    document.getElementById('user-profile').classList.remove('hidden');
    renderTags(userProfile.tags.length > 0 ? userProfile.tags : ['新客']);
}

function renderTags(tags) {
    const container = document.getElementById('user-tags');
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-badge';
        span.textContent = tag;
        container.appendChild(span);
    });
}

function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
}

/**
 * --- 重點：提交預約邏輯 (支援 GitHub -> Google Sheets) ---
 */
async function submitBooking() {
    const service = document.getElementById('booking-service').value;
    const date = document.getElementById('booking-date').value;

    if (!date) { alert('請選擇預約日期'); return; }
    showLoading();

    const message = `🔔 新預約申請\n項目：${service}\n日期：${date}`;

    // 優先使用 GAS 原生通訊 (LIFF 環境)
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
            .withSuccessHandler(() => {
                hideLoading();
                if (liff.isInClient()) liff.sendMessages([{ type: 'text', text: message }]);
                alert('預約成功及記錄已保存！');
                if (liff.isInClient()) liff.closeWindow(); else navigateTo('screen-home');
            })
            .saveBooking(userProfile.userId, service, date);
    } 
    // GitHub Pages 環境：改用 API Fetch 通訊
    else if (CONFIG.gasWebAppUrl) {
        const apiUrl = `${CONFIG.gasWebAppUrl}?action=saveBooking&userId=${userProfile.userId}&service=${encodeURIComponent(service)}&date=${date}`;
        
        // 使用 JSONP 概念或 CORS fetch (GAS doGet 支援 JSONP效果)
        fetch(apiUrl, { mode: 'no-cors' }) // 使用 no-cors 是因為 GAS 重定向特性
            .then(() => {
                hideLoading();
                alert('預約請求已送出！請檢查試算表。');
                navigateTo('screen-home');
            })
            .catch(err => {
                console.error('API Error:', err);
                hideLoading();
                alert('發送失敗，請確認 GAS 網址正確。');
            });
    } else {
        alert('尚未設定 API 網址，目前為模擬模式。');
        hideLoading();
        navigateTo('screen-home');
    }
}

function showLoading() { document.getElementById('loading').classList.add('active'); }
function hideLoading() { document.getElementById('loading').classList.remove('active'); }

function mockProfile() {
    userProfile = {
        userId: 'U123456789',
        displayName: '測試用戶 (訪客)',
        pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
        tags: ['開發中', 'VIP']
    };
    updateProfileUI();
    navigateTo('screen-home');
    hideLoading();
}

window.onload = () => { initLIFF(); };
