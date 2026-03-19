/**
 * 数字花园主页脚本
 * 处理交互逻辑、交叉观察器入场动画与滚动特效
 */

document.addEventListener('DOMContentLoaded', () => {
    const seedConfig = globalThis.DigitalGardenSeedConfig;
    if (!seedConfig) {
        console.error('DigitalGardenSeedConfig is missing.');
        return;
    }

    // -------------------------------------------------------------------------
    // 1. 数据配置与 DOM 元素获取
    // -------------------------------------------------------------------------

    const seeds = seedConfig.getOrderedSeeds();

    const grid = document.getElementById('seeds-grid');
    const emptyState = document.getElementById('empty-state');
    const displaySeedCount = document.getElementById('seed-count');
    const displayCommitCount = document.getElementById('commit-count'); // 模拟的一个指标
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const navAccountShell = document.getElementById('nav-account-shell');
    const navAccountName = document.getElementById('nav-account-name');
    const navAccountMeta = document.getElementById('nav-account-meta');
    const navAccountBalance = document.getElementById('nav-account-balance');
    const navAccountLogout = document.getElementById('nav-account-logout');

    const authConfig = resolveAuthConfig();
    const authStorage = createAuthStorage();

    const authState = {
        busy: false,
        tone: 'neutral',
        message: '未登录也可以浏览数字花园；登录后会接入通用后端服务会话与积分体系。',
        accessToken: authStorage.getAccessToken(),
        user: authStorage.getUser(),
        balance: null
    };

    bindAuthActions();
    renderAuthState();
    void bootstrapAuth();

    // -------------------------------------------------------------------------
    // 2. 项目卡片渲染
    // -------------------------------------------------------------------------

    if (seeds.length > 0) {
        emptyState.style.display = 'none';

        // 设置目标数字供递增计算使用
        const publishedSeedCount = seedConfig.countPublishedSeeds(seeds);
        displaySeedCount.setAttribute('data-target', publishedSeedCount);
        displayCommitCount.setAttribute('data-target', publishedSeedCount * 12 + 25); // 随便算个伪数据

        seeds.forEach((seed, index) => {
            const card = createSeedCard(seed, index);
            grid.appendChild(card);
        });
    } else {
        displaySeedCount.setAttribute('data-target', 0);
        displayCommitCount.setAttribute('data-target', 0);
    }

    // -------------------------------------------------------------------------
    // 3. UI 交互：移动端菜单与固定导航
    // -------------------------------------------------------------------------
    const header = document.getElementById('header');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // 点击导航链接后收起移动菜单
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    window.addEventListener('scroll', () => {
        // 头部的变小变隐效果
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // -------------------------------------------------------------------------
    // 3.5 分类过滤逻辑 (Category Filtering)
    // -------------------------------------------------------------------------
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            const allCards = document.querySelectorAll('.seed-card');

            allCards.forEach(card => {
                const category = card.getAttribute('data-category');

                card.classList.remove('anim-in');

                // For 'all', show everything. Otherwise, show matching or special ones
                if (filterValue === 'all' || category === filterValue || category === 'special') {
                    if (card.classList.contains('hidden-card')) {
                        card.classList.remove('hidden-card');
                        setTimeout(() => {
                            card.classList.add('anim-in');
                        }, 50);
                    } else {
                        card.classList.add('anim-in');
                    }
                } else {
                    card.classList.add('anim-out');
                    setTimeout(() => {
                        if (card.classList.contains('anim-out')) {
                            card.classList.add('hidden-card');
                            card.classList.remove('anim-out');
                        }
                    }, 300);
                }
            });
        });
    });

    // -------------------------------------------------------------------------
    // 4. 入场动画处理 (Intersection Observer)
    // -------------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // 解除监听以避免重复动画
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => revealOnScroll.observe(el));

    // -------------------------------------------------------------------------
    // 5. 数字递增动画 (Count Up)
    // -------------------------------------------------------------------------
    const countUpElements = document.querySelectorAll('.count-up');

    const countUpObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetEl = entry.target;
                const finalVal = parseInt(targetEl.getAttribute('data-target') || 0, 10);

                if (finalVal > 0) {
                    animateValue(targetEl, 0, finalVal, 1500);
                }

                observer.unobserve(targetEl);
            }
        });
    }, { threshold: 0.5 });

    countUpElements.forEach(el => countUpObserver.observe(el));

    /**
     * 简易的数字滚动函数
     */
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // 使用 easeOutQuart 缓动函数让末尾减速
            const easeProgress = 1 - Math.pow(1 - progress, 4);

            obj.innerHTML = Math.floor(easeProgress * (end - start) + start);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end; // 确保最后是精确的结束值
            }
        };
        window.requestAnimationFrame(step);
    }

    function bindAuthActions() {
        navAuthBtn?.addEventListener('click', async (event) => {
            event.preventDefault();
            if (authState.busy) return;
            await startLogin();
        });

        navAccountLogout?.addEventListener('click', async () => {
            if (authState.busy || !authState.accessToken) return;
            await logout();
        });
    }

    async function bootstrapAuth() {
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (callbackError) {
            cleanCallbackUrl();
            setAuthFeedback(`授权失败：${humanizeAuthError(callbackError)}`, 'error');
            return;
        }

        if (code && state) {
            await exchangeCallback(code, state);
            return;
        }

        if (authState.accessToken) {
            await loadCreditBalance();
            if (!authState.message || authState.message.startsWith('未登录')) {
                setAuthFeedback('当前页面已连接通用后端服务会话。', 'success');
            } else {
                renderAuthState();
            }
            return;
        }

        try {
            await refreshSession({ silent: true });
            await loadCreditBalance();
            setAuthFeedback('已恢复通用后端服务会话。', 'success');
        } catch {
            renderAuthState();
        }
    }

    async function startLogin() {
        setBusy(true);
        setAuthFeedback('正在发起统一登录授权...', 'neutral');

        try {
            const query = new URLSearchParams({
                app_id: authConfig.appId,
                redirect_uri: authConfig.redirectUri,
                return_to: authConfig.returnTo
            });

            const payload = await requestJson(`${authConfig.apiBase}/api/v1/auth/sso/authorize-url?${query.toString()}`);
            authStorage.setStateTicket(payload.state_ticket || '');

            if (!payload.authorize_url) {
                throw new Error('未获取到统一登录跳转地址');
            }

            window.location.href = payload.authorize_url;
        } catch (error) {
            setBusy(false);
            setAuthFeedback(`无法发起登录：${humanizeAuthError(error)}`, 'error');
        }
    }

    async function exchangeCallback(code, state) {
        const stateTicket = authStorage.getStateTicket();
        if (!stateTicket) {
            cleanCallbackUrl();
            setAuthFeedback('缺少 state_ticket，无法完成授权换票，请重新点击登录。', 'error');
            return;
        }

        setBusy(true);
        setAuthFeedback('正在完成授权换票...', 'neutral');

        try {
            const payload = await requestJson(`${authConfig.apiBase}/api/v1/auth/sso/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: authConfig.appId,
                    state_ticket: stateTicket,
                    code,
                    state,
                    redirect_uri: authConfig.redirectUri
                })
            });

            authStorage.setStateTicket('');
            authStorage.setAccessToken(payload.access_token || '');
            authStorage.setUser(payload.user || null);

            authState.accessToken = authStorage.getAccessToken();
            authState.user = authStorage.getUser();
            authState.balance = null;

            cleanCallbackUrl();
            await loadCreditBalance();
            setBusy(false);
            setAuthFeedback('登录成功，数字花园已接入通用后端服务会话。', 'success');
        } catch (error) {
            authStorage.setStateTicket('');
            authStorage.clearSession();
            authState.accessToken = '';
            authState.user = null;
            authState.balance = null;
            cleanCallbackUrl();
            setBusy(false);
            setAuthFeedback(`授权换票失败：${humanizeAuthError(error)}`, 'error');
        }
    }

    async function refreshSession({ silent = false } = {}) {
        if (!silent) {
            setBusy(true);
            setAuthFeedback('正在恢复会话...', 'neutral');
        }

        try {
            const payload = await requestJson(`${authConfig.apiBase}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: {
                    'X-App-Id': authConfig.appId
                }
            });

            authStorage.setAccessToken(payload.access_token || '');
            authState.accessToken = authStorage.getAccessToken();

            if (!silent) {
                setAuthFeedback('会话已刷新。', 'success');
            }
        } catch (error) {
            authStorage.clearSession();
            authState.accessToken = '';
            authState.user = null;
            authState.balance = null;

            if (!silent) {
                setAuthFeedback(`会话恢复失败：${humanizeAuthError(error)}`, 'error');
            }

            throw error;
        } finally {
            if (!silent) {
                setBusy(false);
            }
        }
    }

    async function loadCreditBalance({ allowRefresh = true } = {}) {
        if (!authState.accessToken) {
            authState.balance = null;
            renderAuthState();
            return;
        }

        try {
            const payload = await requestJson(`${authConfig.apiBase}/api/v1/credits/balance`, {
                headers: {
                    Authorization: `Bearer ${authState.accessToken}`,
                    'X-App-Id': authConfig.appId
                }
            });

            authState.balance = typeof payload.balance === 'number' ? payload.balance : null;
            renderAuthState();
        } catch (error) {
            if (allowRefresh && error && typeof error === 'object' && error.status === 401) {
                await refreshSession({ silent: true });
                await loadCreditBalance({ allowRefresh: false });
                return;
            }

            authState.balance = null;
            setAuthFeedback(`已登录，但积分读取失败：${humanizeAuthError(error)}`, 'error');
        }
    }

    async function logout() {
        setBusy(true);
        setAuthFeedback('正在退出当前站点会话...', 'neutral');

        try {
            await requestJson(`${authConfig.apiBase}/api/v1/auth/logout`, {
                method: 'POST'
            });
        } catch (error) {
            setBusy(false);
            setAuthFeedback(`退出失败：${humanizeAuthError(error)}`, 'error');
            return;
        }

        authStorage.clearSession();
        authState.accessToken = '';
        authState.user = null;
        authState.balance = null;
        setBusy(false);
        setAuthFeedback('已退出数字花园会话。如需彻底退出统一登录态，请在统一登录中心执行全局退出。', 'neutral');
    }

    function renderAuthState() {
        const isAuthenticated = Boolean(authState.accessToken);
        const userName = authState.user && authState.user.name ? authState.user.name : '已登录用户';
        const isError = authState.tone === 'error';

        navAccountShell?.toggleAttribute('hidden', !isAuthenticated);
        navAuthBtn?.toggleAttribute('hidden', isAuthenticated);
        navAccountShell?.classList.toggle('is-error', isAuthenticated && isError);
        navAccountShell?.classList.toggle('is-busy', isAuthenticated && authState.busy);

        if (navAccountName) {
            navAccountName.textContent = userName;
        }

        if (navAccountMeta) {
            navAccountMeta.textContent = isError
                ? '会话波动'
                : '已接入通用会话';
        }

        if (navAccountBalance) {
            navAccountBalance.textContent = typeof authState.balance === 'number' ? `积分 ${authState.balance}` : '积分 --';
        }

        updateButtonText(navAuthBtn, authState.busy ? '处理中...' : '登录');
        updateButtonText(navAccountLogout, authState.busy ? '处理中...' : '退出');

        if (navAuthBtn) {
            navAuthBtn.setAttribute('href', '#');
            navAuthBtn.setAttribute('aria-disabled', authState.busy ? 'true' : 'false');
        }
        if (navAccountLogout) {
            navAccountLogout.disabled = authState.busy;
        }
    }

    function setBusy(nextBusy) {
        authState.busy = nextBusy;
        renderAuthState();
    }

    function setAuthFeedback(message, tone = 'neutral') {
        authState.message = message;
        authState.tone = tone;
        renderAuthState();
    }

    function cleanCallbackUrl() {
        const target = new URL(authConfig.returnTo || authConfig.redirectUri, window.location.origin);
        target.search = '';
        target.hash = '';
        window.history.replaceState({}, document.title, target.toString());
    }

    function requestJson(url, options = {}) {
        const headers = {
            ...(options.headers || {})
        };

        return fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        }).then(async (response) => {
            const contentType = response.headers.get('content-type') || '';
            const payload = contentType.includes('application/json') ? await response.json() : await response.text();

            if (!response.ok) {
                const error = new Error(extractErrorMessage(payload, response.status));
                error.status = response.status;
                error.payload = payload;
                throw error;
            }

            return payload;
        });
    }

    function extractErrorMessage(payload, status) {
        if (typeof payload === 'string' && payload.trim()) {
            return payload.trim();
        }

        if (payload && typeof payload === 'object') {
            if (typeof payload.detail === 'string' && payload.detail.trim()) {
                return payload.detail.trim();
            }

            if (Array.isArray(payload.detail)) {
                return payload.detail
                    .map((item) => item && typeof item === 'object' && typeof item.msg === 'string' ? item.msg : '')
                    .filter(Boolean)
                    .join('; ') || `请求失败: ${status}`;
            }

            if (payload.detail && typeof payload.detail === 'object') {
                if (typeof payload.detail.message === 'string') {
                    return payload.detail.message;
                }
                if (typeof payload.detail.error_code === 'string') {
                    return payload.detail.error_code;
                }
            }
        }

        return `请求失败: ${status}`;
    }

    function humanizeAuthError(error) {
        const raw = error instanceof Error ? error.message : String(error || '');

        switch (raw) {
            case 'APP_NOT_ALLOWED':
                return '数字花园尚未在通用后端服务完成应用接入配置';
            case 'INVALID_STATE_TICKET':
                return '授权票据已失效，请重新点击登录';
            case 'AUTH_REFRESH_INVALID':
                return '当前登录会话已失效，请重新登录';
            case 'AUTH_TOKEN_INVALID':
                return '当前访问令牌已失效，请重新登录';
            default:
                return raw;
        }
    }

    function updateButtonText(button, text) {
        if (!button) return;

        const textElement = button.querySelector('.btn-text, .cta-text');
        if (textElement) {
            textElement.textContent = text;
            return;
        }

        button.textContent = text;
    }

    function resolveAuthConfig() {
        const override = globalThis.DigitalGardenAuthConfig || {};
        const currentUrl = new URL(window.location.href);
        currentUrl.search = '';
        currentUrl.hash = '';

        if (currentUrl.pathname === '/seed/' || currentUrl.pathname === '/seed/index.html') {
            currentUrl.pathname = '/seed';
        }

        return {
            apiBase: String(override.apiBase || window.location.origin).replace(/\/$/, ''),
            appId: String(override.appId || 'digital_garden'),
            redirectUri: String(override.redirectUri || currentUrl.toString()),
            returnTo: String(override.returnTo || currentUrl.toString())
        };
    }

    function createAuthStorage() {
        const ACCESS_TOKEN_KEY = 'digital_garden_access_token';
        const STATE_TICKET_KEY = 'digital_garden_state_ticket';
        const USER_KEY = 'digital_garden_user';

        return {
            getAccessToken() {
                return sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
            },
            setAccessToken(token) {
                if (token) {
                    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
                    return;
                }

                sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            },
            getStateTicket() {
                return sessionStorage.getItem(STATE_TICKET_KEY) || '';
            },
            setStateTicket(ticket) {
                if (ticket) {
                    sessionStorage.setItem(STATE_TICKET_KEY, ticket);
                    return;
                }

                sessionStorage.removeItem(STATE_TICKET_KEY);
            },
            getUser() {
                const raw = sessionStorage.getItem(USER_KEY);
                if (!raw) return null;

                try {
                    return JSON.parse(raw);
                } catch {
                    sessionStorage.removeItem(USER_KEY);
                    return null;
                }
            },
            setUser(user) {
                if (user) {
                    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
                    return;
                }

                sessionStorage.removeItem(USER_KEY);
            },
            clearSession() {
                sessionStorage.removeItem(ACCESS_TOKEN_KEY);
                sessionStorage.removeItem(STATE_TICKET_KEY);
                sessionStorage.removeItem(USER_KEY);
            }
        };
    }
});

function createSeedCard(seed, index) {
    const a = document.createElement('a');
    a.href = seed.path;
    a.setAttribute('data-category', seed.isEntry ? 'special' : (seed.category || 'all'));

    // 维护人标识：如果是 EDEN 就显示机器人，否则显示用户
    const maintainerBadge = seed.maintainer === 'EDEN'
        ? `<span class="maintainer maintainer-bot"><span class="maintainer-icon">🤖</span> EDEN</span>`
        : `<span class="maintainer maintainer-user"><span class="maintainer-icon">👤</span> ${seed.maintainer}</span>`;

    if (seed.isEntry) {
        // 【破局者卡片】完全不同的 DOM 结构
        a.className = `seed-card special-incubator-card reveal fade-bottom delay-100`;
        a.innerHTML = `
            <div class="incubator-bg-anim"></div>
            <div class="incubator-content">
                <div class="incubator-header">
                    <div class="incubator-icon-wrap">
                        <span class="pulsing-orb"></span>
                        <span class="incubator-icon">✨</span>
                    </div>
                    <div class="seed-tags">
                        <span class="tag">AI Co-creation</span>
                        ${maintainerBadge}
                    </div>
                </div>
                
                <div class="incubator-text">
                    <h3 class="incubator-title">唤醒新的数字生命</h3>
                    <p class="incubator-desc">与 AI 架构师 EDEN 深度交流，将那些一闪而过的绝妙灵感，具象化并播种在数字花园中。</p>
                </div>

                <div class="incubator-fake-input">
                    <span class="typing-placeholder">输入你的想法，开始培育...</span>
                    <div class="enter-btn">播种 <span class="enter-icon">↵</span></div>
                </div>
            </div>
        `;
        return a;
    }

    // 常规卡片结构
    a.className = `seed-card reveal fade-bottom delay-${(index % 3 + 1) * 100}`;
    a.innerHTML = `
        <div class="seed-header">
            <div class="seed-icon-wrapper">
                <span class="seed-icon">${seed.icon || '🌱'}</span>
            </div>
            <div class="seed-tags">
                <span class="tag">${seed.status || 'Draft'}</span>
                ${maintainerBadge}
            </div>
        </div>
        <div class="seed-body">
            <h3 class="seed-title">${seed.title}</h3>
            <p class="seed-description">${seed.description}</p>
        </div>
        <div class="seed-footer">
            <span class="enter-link">探索项目 <span class="arrow">→</span></span>
        </div>
    `;

    return a;
}
