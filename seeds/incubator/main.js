function initDigitalGardenIncubator() {
    const SUGGESTIONS = [
        '创建一个帮助大学生坚持晨间复盘的轻应用',
        '我想做一个让内向者练习表达的微型训练工具',
        '做一个帮助团队整理灵感并筛选 MVP 的数字白板'
    ];

    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const ideaInput = document.getElementById('idea-input');
    const sendBtn = document.getElementById('send-btn');
    const suggestBtn = document.getElementById('suggest-btn');
    const authActionBtn = document.getElementById('auth-action-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const sessionPill = document.getElementById('session-pill');
    const authHeading = document.getElementById('auth-heading');
    const authMessage = document.getElementById('auth-message');
    const balancePill = document.getElementById('balance-pill');
    const ideaPanel = document.getElementById('idea-panel');
    const ideaTitle = document.getElementById('idea-title');
    const ideaSummary = document.getElementById('idea-summary');
    const ideaStatus = document.getElementById('idea-status');
    const ideaScore = document.getElementById('idea-score');
    const submitIdeaBtn = document.getElementById('submit-idea-btn');
    const inputFootnote = document.getElementById('input-footnote');

    const config = resolveConfig();
    const authStorage = createAuthStorage();
    const markdownRenderer = globalThis.DigitalGardenIncubatorMarkdown;

    const state = {
        accessToken: authStorage.getAccessToken(),
        user: authStorage.getUser(),
        stateTicket: authStorage.getStateTicket(),
        busy: false,
        bootstrapped: false,
        conversationId: '',
        ideaDraft: null,
        balance: null,
        shownMessageIds: new Set()
    };

    bindEvents();
    renderGuestState();
    void bootstrapPage();

    function bindEvents() {
        ideaInput.addEventListener('input', handleInputResize);
        ideaInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });

        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (state.busy) return;

            const message = ideaInput.value.trim();
            if (!message) return;

            if (!state.accessToken) {
                await startLogin();
                return;
            }

            await sendMessage(message);
        });

        suggestBtn.addEventListener('click', () => {
            const next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
            ideaInput.value = next;
            handleInputResize.call(ideaInput);
            updateComposerState();
            ideaInput.focus();
        });

        authActionBtn.addEventListener('click', async () => {
            if (state.busy) return;
            if (state.accessToken) {
                chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            await startLogin();
        });

        logoutBtn.addEventListener('click', async () => {
            if (state.busy) return;
            await logout();
        });

        submitIdeaBtn.addEventListener('click', async () => {
            if (state.busy || !state.conversationId) return;
            await submitIdea();
        });
    }

    async function bootstrapPage() {
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        const stateParam = url.searchParams.get('state');

        if (callbackError) {
            cleanCallbackUrl();
            renderSystemMessage(`授权失败：${humanizeError(callbackError)}`);
            return;
        }

        if (code && stateParam) {
            await exchangeCallback(code, stateParam);
            return;
        }

        if (!state.accessToken) {
            try {
                await refreshSession({ silent: true });
            } catch {
                renderGuestState();
                return;
            }
        }

        await bootstrapConversation();
    }

    async function startLogin() {
        setBusy(true, '正在发起统一登录授权...');
        try {
            const query = new URLSearchParams({
                app_id: config.appId,
                redirect_uri: config.redirectUri,
                return_to: config.returnTo
            });
            const payload = await requestJson(`${config.apiBase}/api/v1/auth/sso/authorize-url?${query.toString()}`);
            authStorage.setStateTicket(payload.state_ticket || '');
            window.location.href = payload.authorize_url;
        } catch (error) {
            setBusy(false);
            renderSystemMessage(`无法发起登录：${humanizeError(error)}`);
        }
    }

    async function exchangeCallback(code, stateParam) {
        const stateTicket = authStorage.getStateTicket();
        if (!stateTicket) {
            cleanCallbackUrl();
            renderSystemMessage('缺少 state_ticket，无法完成登录，请重新点击登录。');
            return;
        }

        setBusy(true, '正在完成授权换票...');
        try {
            const payload = await requestJson(`${config.apiBase}/api/v1/auth/sso/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: config.appId,
                    state_ticket: stateTicket,
                    code,
                    state: stateParam,
                    redirect_uri: config.redirectUri
                })
            });
            authStorage.setStateTicket('');
            authStorage.setAccessToken(payload.access_token || '');
            authStorage.setUser(payload.user || null);
            state.accessToken = authStorage.getAccessToken();
            state.user = authStorage.getUser();
            cleanCallbackUrl();
            await bootstrapConversation();
        } catch (error) {
            authStorage.clearSession();
            state.accessToken = '';
            state.user = null;
            cleanCallbackUrl();
            setBusy(false);
            renderSystemMessage(`授权换票失败：${humanizeError(error)}`);
        }
    }

    async function refreshSession({ silent = false } = {}) {
        if (!silent) {
            setBusy(true, '正在恢复会话...');
        }
        try {
            const payload = await requestJson(`${config.apiBase}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'X-App-Id': config.appId }
            });
            authStorage.setAccessToken(payload.access_token || '');
            state.accessToken = authStorage.getAccessToken();
            if (!silent) {
                setBusy(false, '会话已刷新。');
            }
        } catch (error) {
            authStorage.clearSession();
            state.accessToken = '';
            state.user = null;
            state.balance = null;
            if (!silent) {
                setBusy(false);
                renderSystemMessage(`会话恢复失败：${humanizeError(error)}`);
            }
            throw error;
        }
    }

    async function bootstrapConversation() {
        setBusy(true, '正在恢复 EDEN 会话...');
        try {
            const payload = await requestAuthedJson(`${config.dgApiBase}/api/v1/eden/conversations/bootstrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry: 'digital_garden_incubator' })
            });
            state.conversationId = payload.conversation.id;
            state.ideaDraft = payload.idea_draft || null;
            state.bootstrapped = true;
            state.shownMessageIds.clear();
            chatContainer.innerHTML = '';
            renderMessages(payload.messages || []);
            await loadCreditBalance();
            updateAuthUI('EDEN 已在线，开始描述你的种子想法。');
            updateIdeaPanel();
            setBusy(false);
        } catch (error) {
            setBusy(false);
            renderSystemMessage(`会话恢复失败：${humanizeError(error)}`);
        }
    }

    async function sendMessage(message) {
        appendMessage('user', message, '', new Date().toISOString());
        ideaInput.value = '';
        handleInputResize.call(ideaInput);
        updateComposerState();

        const loader = appendLoader();
        setBusy(true, 'EDEN 正在整理你的创意...');

        try {
            const payload = await requestAuthedJson(`${config.dgApiBase}/api/v1/eden/conversations/${state.conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': createIdempotencyKey()
                },
                body: JSON.stringify({ message })
            });
            loader.remove();
            appendMessage(
                'robot',
                payload.assistant_message.content_text,
                payload.assistant_message.id,
                payload.assistant_message.created_at || ''
            );
            state.ideaDraft = payload.idea_draft || null;
            if (payload.credit && typeof payload.credit.balance === 'number') {
                state.balance = payload.credit.balance;
            }
            updateIdeaPanel();
            const charged = typeof payload.credit?.charged === 'number' ? payload.credit.charged : 0;
            const authMessage = state.ideaDraft
                ? (
                    state.ideaDraft.is_ready_for_submit
                        ? `本次已使用 ${charged} 积分，种子需求已收集清晰，可点击“提交种子”进入后台审核阶段。`
                        : `本次已使用 ${charged} 积分，EDEN 已更新种子草稿。`
                )
                : 'EDEN 正在继续澄清你的需求，当前还未生成种子草稿。';
            setBusy(false, authMessage);
        } catch (error) {
            loader.remove();
            renderSystemMessage(humanizeError(error));
            setBusy(false);
        }
    }

    async function submitIdea() {
        setBusy(true, '正在提交种子...');
        try {
            const payload = await requestAuthedJson(`${config.dgApiBase}/api/v1/eden/conversations/${state.conversationId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: true })
            });
            if (state.ideaDraft) {
                state.ideaDraft.status = payload.status;
            }
            updateIdeaPanel();
            updateAuthUI('种子已提交审核，EDEN 将等待进入孵化阶段。');
            renderSystemMessage('种子已提交审核，后续会进入人工评估与孵化流程。');
            setBusy(false);
        } catch (error) {
            setBusy(false);
            renderSystemMessage(humanizeError(error));
        }
    }

    async function loadCreditBalance() {
        if (!state.accessToken) {
            state.balance = null;
            updateAuthUI();
            return;
        }
        try {
            const payload = await requestAuthedJson(`${config.apiBase}/api/v1/credits/balance`);
            state.balance = typeof payload.balance === 'number' ? payload.balance : null;
            updateAuthUI();
        } catch {
            state.balance = null;
            updateAuthUI();
        }
    }

    async function logout() {
        setBusy(true, '正在退出数字花园会话...');
        try {
            await requestJson(`${config.apiBase}/api/v1/auth/logout`, { method: 'POST' });
        } catch (error) {
            setBusy(false);
            renderSystemMessage(`退出失败：${humanizeError(error)}`);
            return;
        }
        authStorage.clearSession();
        state.accessToken = '';
        state.user = null;
        state.balance = null;
        state.ideaDraft = null;
        state.conversationId = '';
        state.bootstrapped = false;
        state.shownMessageIds.clear();
        chatContainer.innerHTML = '';
        renderGuestState();
        setBusy(false);
    }

    function renderGuestState() {
        updateAuthUI('登录后，EDEN 会围绕你的创意进行追问、澄清和结构化整理。');
        ideaPanel.hidden = true;
        chatContainer.innerHTML = '';
        const intro = document.createElement('div');
        intro.className = 'message-group robot';
        intro.innerHTML = `
            <div class="avatar">🌱</div>
            <div class="message-content glass-panel">
                <p>你好，我是 <strong>EDEN</strong>。这里不是普通聊天框，而是数字种子的共创入口。</p>
                <p>登录后，我会围绕你的灵感持续追问，帮助你把模糊想法收敛成一个可孵化的 MVP 方向。</p>
                <div class="suggestion-chips">
                    ${SUGGESTIONS.map((item) => `<button class="chip" type="button">${escapeHtml(item)}</button>`).join('')}
                </div>
            </div>
        `;
        chatContainer.appendChild(intro);
        intro.querySelectorAll('.chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                ideaInput.value = chip.textContent || '';
                handleInputResize.call(ideaInput);
                updateComposerState();
                ideaInput.focus();
            });
        });
        updateComposerState();
    }

    function renderMessages(messages) {
        messages.forEach((message) => {
            appendMessage(
                message.role === 'assistant' ? 'robot' : message.role,
                message.content_text,
                message.id,
                message.created_at || ''
            );
        });
    }

    function appendMessage(role, content, messageId = '', createdAt = '') {
        if (messageId && state.shownMessageIds.has(messageId)) {
            return null;
        }
        if (messageId) {
            state.shownMessageIds.add(messageId);
        }

        const group = document.createElement('div');
        group.className = `message-group ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = role === 'user' ? '👤' : (role === 'system' ? '⚠' : '🌱');

        const contentNode = document.createElement('div');
        contentNode.className = 'message-content glass-panel';
        const timeLabel = formatMessageTime(createdAt);
        const bodyMarkup = role === 'robot' || role === 'system'
            ? renderMarkdownContent(content)
            : `<p>${escapeHtml(content)}</p>`;
        contentNode.innerHTML = `
            ${bodyMarkup}
            ${timeLabel ? `<div class="message-time" title="${escapeHtml(formatMessageTime(createdAt, { detailed: true }))}">${escapeHtml(timeLabel)}</div>` : ''}
        `;

        group.appendChild(avatar);
        group.appendChild(contentNode);
        chatContainer.appendChild(group);
        scrollToBottom();
        return group;
    }

    function appendLoader() {
        const group = document.createElement('div');
        group.className = 'message-group robot';
        group.innerHTML = `
            <div class="avatar">🌱</div>
            <div class="message-content glass-panel">
                <div class="loader-dots"><span></span><span></span><span></span></div>
            </div>
        `;
        chatContainer.appendChild(group);
        scrollToBottom();
        return group;
    }

    function renderSystemMessage(message) {
        appendMessage('system', message, '', new Date().toISOString());
    }

    function renderMarkdownContent(content) {
        if (markdownRenderer && typeof markdownRenderer.renderMarkdown === 'function') {
            return markdownRenderer.renderMarkdown(content);
        }
        return `<p>${escapeHtml(content)}</p>`;
    }

    function formatMessageTime(value, { detailed = false } = {}) {
        if (!value) {
            return '';
        }

        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const locale = 'zh-CN';
        if (detailed) {
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(date);
        }

        const now = new Date();
        const isSameDay = now.toDateString() === date.toDateString();
        return new Intl.DateTimeFormat(locale, isSameDay ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        } : {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    }

    function updateIdeaPanel() {
        if (!state.ideaDraft) {
            ideaPanel.hidden = true;
            submitIdeaBtn.disabled = true;
            return;
        }
        ideaPanel.hidden = false;
        ideaTitle.textContent = state.ideaDraft.idea_summary ? '已收集的种子需求' : '新的数字生命';
        ideaSummary.textContent = state.ideaDraft.idea_summary || 'EDEN 正在根据当前对话整理摘要。';
        ideaStatus.textContent = state.ideaDraft.status === 'reviewing'
            ? '审核中'
            : (state.ideaDraft.is_ready_for_submit ? '可提交' : '收集中');
        ideaScore.textContent = `清晰度 ${Math.round(Number(state.ideaDraft.maturity_score || 0))}`;
        submitIdeaBtn.disabled = !state.ideaDraft.is_ready_for_submit || state.ideaDraft.status === 'reviewing';
    }

    function updateAuthUI(message) {
        const isAuthenticated = Boolean(state.accessToken);
        const userName = state.user && state.user.name ? state.user.name : '已登录用户';
        sessionPill.textContent = isAuthenticated ? `${userName} · 在线` : '游客模式';
        authActionBtn.textContent = state.busy ? '处理中...' : (isAuthenticated ? '已连接' : '登录');
        authHeading.textContent = isAuthenticated ? 'EDEN 已进入共创状态' : '登录后即可唤醒新的数字生命';
        authMessage.textContent = message || (isAuthenticated ? '你现在可以直接把模糊灵感交给 EDEN，一起收敛为可孵化种子。' : '接入统一登录后，EDEN 会围绕你的创意进行追问、澄清和结构化整理。');
        logoutBtn.hidden = !isAuthenticated;
        balancePill.hidden = !(isAuthenticated && typeof state.balance === 'number');
        if (!balancePill.hidden) {
            balancePill.textContent = `积分 ${state.balance}`;
        }
        inputFootnote.textContent = isAuthenticated
            ? '每次对话会经过积分预扣与回滚链路；失败时会自动回滚。'
            : '游客可以浏览引导文案；真实对话、积分与种子提交需要先登录。';
        updateComposerState();
    }

    function updateComposerState() {
        const enabled = Boolean(state.accessToken) && !state.busy && ideaInput.value.trim().length > 0;
        ideaInput.disabled = !state.accessToken || state.busy;
        ideaInput.placeholder = state.accessToken
            ? '描述你的想法，和 EDEN 一起把它收敛成可孵化的种子...'
            : '登录后，描述你的想法，和 EDEN 一起把它收敛成可孵化的种子...';
        sendBtn.disabled = !enabled;
        suggestBtn.disabled = state.busy;
    }

    function handleInputResize() {
        this.style.height = 'auto';
        this.style.height = `${Math.min(this.scrollHeight, 150)}px`;
        updateComposerState();
    }

    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    async function requestAuthedJson(url, options = {}, allowRefresh = true) {
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${state.accessToken}`,
            'X-App-Id': config.appId
        };
        try {
            return await requestJson(url, { ...options, headers });
        } catch (error) {
            if (allowRefresh && error && error.status === 401) {
                await refreshSession({ silent: true });
                return requestAuthedJson(url, options, false);
            }
            throw error;
        }
    }

    async function requestJson(url, options = {}) {
        const headers = { ...(options.headers || {}) };
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers
        });
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        if (!response.ok) {
            const error = new Error(typeof body === 'string' ? body : (body.message || body.detail || 'Request failed'));
            error.status = response.status;
            error.body = body;
            throw error;
        }
        return body;
    }

    function setBusy(nextBusy, message = '') {
        state.busy = nextBusy;
        updateAuthUI(message || undefined);
    }

    function cleanCallbackUrl() {
        const target = new URL(config.returnTo || config.redirectUri, window.location.origin);
        target.search = '';
        target.hash = '';
        window.history.replaceState({}, document.title, target.toString());
    }

    function humanizeError(error) {
        if (!error) return '发生未知错误';
        if (typeof error === 'string') return error;
        if (error.body && error.body.error_code === 'IDEA_NOT_READY') {
            return '当前需求还不够清晰，继续补充目标用户、核心问题和交付形态后再提交。';
        }
        if (error.body && error.body.error_code === 'INSUFFICIENT_CREDITS') {
            return '当前积分不足，无法继续对话。';
        }
        if (error.body && error.body.message) {
            return error.body.message;
        }
        return error.message || '请求失败';
    }

    function resolveConfig() {
        const override = globalThis.DigitalGardenIncubatorConfig || {};
        const currentUrl = new URL(window.location.href);
        currentUrl.search = '';
        currentUrl.hash = '';
        return {
            apiBase: String(override.apiBase || window.location.origin).replace(/\/$/, ''),
            dgApiBase: String(override.dgApiBase || `${window.location.origin}/dg-api`).replace(/\/$/, ''),
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

    function createIdempotencyKey() {
        return `dg-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDigitalGardenIncubator, { once: true });
} else {
    initDigitalGardenIncubator();
}
