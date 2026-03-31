// Configuration
const CONFIG = {
    // IMPORTANT: If hosting on GitHub, manually paste your LIFF ID here
    liffId: '<?!= liffId ?>'.includes('<?') ? '' : '<?!= liffId ?>', 
    gasWebAppUrl: '<?!= webAppUrl ?>'.includes('<?') ? '' : '<?!= webAppUrl ?>'
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
        // Validation: If liffId is still empty, try to alert user
        if (!CONFIG.liffId) {
            console.warn("LIFF ID is empty. If you are on GitHub Pages, please fill it in script.js manually.");
        }

        await liff.init({ liffId: CONFIG.liffId || 'YOUR_LIFF_ID_HERE' });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }

        // Get Profile
        const profile = await liff.getProfile();
        userProfile.userId = profile.userId;
        userProfile.displayName = profile.displayName;
        userProfile.pictureUrl = profile.pictureUrl;

        // Try to sync with GAS backend
        await syncUserData();

        // Update UI
        updateProfileUI();

        // Show Home Screen
        navigateTo('screen-home');

        // Hide Loading
        hideLoading();

        console.log('LIFF Initialized successfully');
    } catch (err) {
        console.error('LIFF initialization failed', err);
        // Fallback for browser testing or broken config
        mockProfile();
    }
}

/**
 * Sync user data with GAS backend
 */
async function syncUserData() {
    // Check if running in GAS environment
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        return new Promise((resolve) => {
            google.script.run
                .withSuccessHandler((data) => {
                    userProfile.tags = data && data.tags ? data.tags.split(',').map(t => t.trim()) : [];
                    resolve(data);
                })
                .withFailureHandler((err) => {
                    console.error('Sync failed', err);
                    resolve(null);
                })
                .getOrCreateUser(userProfile.userId);
        });
    } else {
        console.log('Not in GAS environment, skipping remote sync.');
        return null;
    }
}

/**
 * Update UI with Profile data
 */
function updateProfileUI() {
    const nameEl = document.getElementById('user-name');
    const imgEl = document.getElementById('user-img');
    const headImgEl = document.getElementById('user-img-header');
    
    if (nameEl) nameEl.textContent = userProfile.displayName;
    if (imgEl) imgEl.src = userProfile.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky';
    if (headImgEl) headImgEl.src = userProfile.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky';
    
    const profileEl = document.getElementById('user-profile');
    if (profileEl) profileEl.classList.remove('hidden');

    renderTags(userProfile.tags.length > 0 ? userProfile.tags : ['新客']);
}

/**
 * Render Tags
 */
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

/**
 * Navigation logic (SPA)
 */
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

    const message = `🔔 新預約申請\n項目：${service}\n日期：${date}`;

    try {
        if (liff.isInClient()) {
            await liff.sendMessages([{ type: 'text', text: message }]);
            alert('預約已提交！');
            liff.closeWindow();
        } else {
            // Environment Check for Backend call
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(() => {
                        hideLoading();
                        alert('預約成功！');
                        navigateTo('screen-home');
                    })
                    .logInteraction(userProfile.userId, 'Booking', `Service: ${service}, Date: ${date}`);
            } else {
                // Pure GitHub / Browser fallback
                console.log('Submitting (Mock)...', { service, date });
                setTimeout(() => {
                    hideLoading();
                    alert('預約成功 (模擬發送)！\n在 GitHub 環境下無法直接存取 Google Sheets。');
                    navigateTo('screen-home');
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Submission failed', error);
        alert('提交失敗，請稍後再試。');
        hideLoading();
    }
}

function showLoading() { 
    const el = document.getElementById('loading');
    if (el) el.classList.add('active'); 
}

function hideLoading() { 
    const el = document.getElementById('loading');
    if (el) el.classList.remove('active'); 
}

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

// Start sequence
window.onload = () => { initLIFF(); };
