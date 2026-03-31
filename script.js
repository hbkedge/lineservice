// Configuration
const CONFIG = {
    liffId: '', // 將由 GAS 動態注入或手動填入
    gasWebAppUrl: '' // 如果是串接 REST API 則需要此 URL
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
        await liff.init({ liffId: CONFIG.liffId });
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        // 取得個人檔案
        const profile = await liff.getProfile();
        userProfile.userId = profile.userId;
        userProfile.displayName = profile.displayName;
        userProfile.pictureUrl = profile.pictureUrl;
        
        // 更新介面
        updateProfileUI();
        
        // 隱藏載入畫面
        hideLoading();
        
        console.log('LIFF Initialized successfully');
    } catch (err) {
        console.error('LIFF initialization failed', err);
        // 如果是在一般瀏覽器測試，顯示模擬數據
        mockProfile();
    }
}

/**
 * Update UI with Profile data
 */
function updateProfileUI() {
    document.getElementById('user-name').textContent = userProfile.displayName;
    document.getElementById('user-img').src = userProfile.pictureUrl || 'https://via.placeholder.com/100';
    document.getElementById('user-img-header').src = userProfile.pictureUrl || 'https://via.placeholder.com/100';
    document.getElementById('user-profile').classList.remove('hidden');
    
    // 渲染標籤 (這裡通常會從 GAS 抓取最新的標籤)
    renderTags(['新客', 'VIP']); 
}

/**
 * Render Tags
 */
function renderTags(tags) {
    const container = document.getElementById('user-tags');
    container.innerHTML = '';
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-badge';
        span.textContent = tag;
        container.appendChild(span);
    });
}

/**
 * Navigation logic (SPA)
 */
function navigateTo(screenId) {
    // 隱藏所有畫面
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));
    
    // 顯示目標畫面
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
}

/**
 * Submit Booking
 */
async function submitBooking() {
    const service = document.getElementById('booking-service').value;
    const date = document.getElementById('booking-date').value;
    
    if (!date) {
        alert('請選擇預約日期');
        return;
    }

    showLoading();
    
    // 這裡演示發送訊息回 LINE 聊天室，或透過 GAS API 儲存
    const message = `🔔 新預約申請\n項目：${service}\n日期：${date}`;
    
    try {
        if (liff.isInClient()) {
            await liff.sendMessages([{ type: 'text', text: message }]);
            alert('預約已提交！將為您返回聊天室。');
            liff.closeWindow();
        } else {
            // 非 LINE 環境模擬行為
            console.log('Submitting to API...', { service, date });
            setTimeout(() => {
                hideLoading();
                alert('預約成功 (模擬模式)');
                navigateTo('screen-home');
            }, 1000);
        }
    } catch (error) {
        console.error('Submission failed', error);
        alert('提交失敗，請稍後再試。');
        hideLoading();
    }
}

/**
 * Loading state control
 */
function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

/**
 * Mock data for browser testing
 */
function mockProfile() {
    userProfile = {
        userId: 'U123456789',
        displayName: '測試用戶 (瀏覽器)',
        pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
        tags: ['開發中', 'QA']
    };
    updateProfileUI();
    hideLoading();
}

// Start sequence
window.onload = () => {
    initLIFF();
};
