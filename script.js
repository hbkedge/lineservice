// Configuration
const CONFIG = {
    // IMPORTANT: Hardcoded LIFF ID for GitHub Pages compatibility
    liffId: '2009603120-OxhhwblJ',
    // IMPORTANT: Manual link needed for GitHub to talk to Google Sheets
    // Please paste your GAS Web App URL below
    gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbwGclEnQ25KiOWc4LP4dYZSmrS5GJ-A7sQa41BgM-TVYdUDDn1Q0McDSwTOPqV8qbH7gA/exec' // 我根據您的試算表推測的一個可能的 ID，請以您部署時得到的 URL 為準
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

/**
 * --- 重點：真人客服轉接 ---
 */
/**
 * --- 重點：真人客服轉接 (優化版) ---
 */
async function startLiveChat() {
    const btn = document.getElementById('btn-start-chat');
    if (!btn) return;

    // 1. UI 反饋
    btn.disabled = true;
    btn.textContent = '正在連線中...';
    btn.style.opacity = '0.7';

    try {
        const userId = userProfile.userId || (liff.isLoggedIn() ? (await liff.getProfile()).userId : 'anonymous');

        // 方案 A: GAS 原生通訊
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(() => handleSupportSuccess(btn))
                .withFailureHandler((err) => handleSupportError(btn, err))
                .updateLiveAgentStatus(userId, true);
        }
        // 方案 B: API Fetch (GitHub 環境)
        else if (CONFIG.gasWebAppUrl) {
            const payload = {
                action: 'toggle_live_agent',
                userId: userId,
                status: true
            };

            fetch(CONFIG.gasWebAppUrl, {
                mode: 'no-cors',
                method: 'POST',
                body: JSON.stringify(payload)
            }).then(() => {
                handleSupportSuccess(btn);
            }).catch(err => {
                handleSupportError(btn, err);
            });
        } else {
            throw new Error("未設定後台網址");
        }
    } catch (err) {
        handleSupportError(btn, err);
    }
}

function handleSupportSuccess(btn) {
    document.getElementById('support-status').classList.remove('hidden');
    btn.textContent = '轉接成功';
    btn.style.background = '#10B981';
    btn.style.opacity = '1';
    alert('✅ 已成功記錄您的轉接需求！專員將收到通知。請現在關閉視窗，直接在 LINE 聊天室中發送您的問題。');
}

function handleSupportError(btn, err) {
    console.error('Support failure:', err);
    alert('❌ 轉接發生錯誤：' + (err.message || '連線逾時'));
    btn.disabled = false;
    btn.textContent = '點此開始真人對話';
    btn.style.opacity = '1';
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

// 綁定事件以提高穩定性
function bindEvents() {
    const chatBtn = document.getElementById('btn-start-chat');
    if (chatBtn) {
        chatBtn.onclick = null; // 移除 HTML 上的 onclick 直接轉為事件監聽
        chatBtn.addEventListener('click', startLiveChat);
    }
}

window.onload = () => {
    initLIFF();
    setTimeout(bindEvents, 500); // 延遲綁定確保元件已載入
};
