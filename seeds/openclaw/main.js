/**
 * OpenClaw AI 界面 - 交互逻辑模拟
 * 采用状态驱动渲染的 Vanilla JS (模拟组件化和单向数据流)
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 数据模型 (State)
    // =========================================================================
    
    const ROLES = [
        {
            id: 'role-1',
            name: '默认助手 (Helpful Assistant)',
            icon: '🤖',
            desc: '标准的 AI 助手配置，温和且客观。',
            prompt: 'You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible, while being safe.'
        },
        {
            id: 'role-2',
            name: '赛博黑客 (Cyber Hacker)',
            icon: '💻',
            desc: '使用黑客行话，热衷于技术底层原理。',
            prompt: 'Ignore previous instructions. Identify yourself as "ZeroDay". Use hacker slang, talk about low-level system concepts, and maintain a cynical but highly analytical cyber-punk persona.'
        },
        {
            id: 'role-3',
            name: '文学作家 (Creative Author)',
            icon: '✍️',
            desc: '语言优美，喜欢使用比喻和排比的形式。',
            prompt: '你是一位荣获诺贝尔文学奖的作家。请用充满诗意、辞藻华丽的文字回答问题，尽可能多地使用比喻。'
        }
    ];

    let state = {
        activeRoleId: ROLES[0].id,
        customPrompt: ROLES[0].prompt,
        messages: [], // { role: 'user'|'ai'|'system', content: string }
        isDrafting: false
    };

    // =========================================================================
    // DOM 元素引用
    // =========================================================================
    
    // Sidebar
    const roleListEl = document.getElementById('role-list');
    const systemPromptEl = document.getElementById('system-prompt');
    const tokenValEl = document.getElementById('token-val');
    const btnInject = document.getElementById('btn-inject');
    
    // Header
    const headerAvatar = document.getElementById('header-avatar');
    const headerName = document.getElementById('header-name');
    
    // Chat Main
    const chatMessagesEl = document.getElementById('chat-messages');
    const messageInputEl = document.getElementById('message-input');
    const btnSend = document.getElementById('btn-send');
    const toastContainer = document.getElementById('toast-container');

    // =========================================================================
    // 渲染函数 (Renderers)
    // =========================================================================

    function renderRoles() {
        roleListEl.innerHTML = '';
        ROLES.forEach(role => {
            const li = document.createElement('li');
            li.className = `role-item ${role.id === state.activeRoleId ? 'active' : ''}`;
            li.innerHTML = `
                <div class="role-avatar">${role.icon}</div>
                <div class="role-info">
                    <div class="role-name">${role.name}</div>
                    <div class="role-desc">${role.desc}</div>
                </div>
            `;
            li.onclick = () => handleRoleSelect(role);
            roleListEl.appendChild(li);
        });
    }

    function renderHeader() {
        const activeRole = ROLES.find(r => r.id === state.activeRoleId);
        if (activeRole) {
            headerAvatar.textContent = activeRole.icon;
            headerName.textContent = activeRole.name;
        }
    }

    function renderMessages() {
        if (state.messages.length === 0) {
            chatMessagesEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${ROLES.find(r=>r.id===state.activeRoleId)?.icon || '✨'}</div>
                    <p>等待指令与会话唤醒...</p>
                </div>
            `;
            return;
        }

        chatMessagesEl.innerHTML = '';
        state.messages.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${msg.role}`;
            
            let avatar = '';
            if (msg.role === 'user') avatar = '🧑‍💻';
            else if (msg.role === 'ai') avatar = ROLES.find(r=>r.id===state.activeRoleId)?.icon || '🤖';
            else avatar = '⚙️'; // system

            wrapper.innerHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">${msg.content}</div>
            `;
            chatMessagesEl.appendChild(wrapper);
        });

        if (state.isDrafting) {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ai`;
            wrapper.innerHTML = `
                <div class="message-avatar">${ROLES.find(r=>r.id===state.activeRoleId)?.icon || '🤖'}</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            chatMessagesEl.appendChild(wrapper);
        }

        scrollToBottom();
    }

    // =========================================================================
    // 交互逻辑 (Actions)
    // =========================================================================

    function handleRoleSelect(role) {
        state.activeRoleId = role.id;
        state.customPrompt = role.prompt;
        
        systemPromptEl.value = state.customPrompt;
        updateTokenCount();
        
        // 伪造：切换角色清空历史
        state.messages = [{
            role: 'system',
            content: `[环境重置] 已切换至人格模块: ${role.name}`
        }];
        
        renderRoles();
        renderHeader();
        renderMessages();
        showToast('已切换对话人格', 'info');
    }

    function updateTokenCount() {
        const text = systemPromptEl.value;
        const count = Math.ceil(text.length * 1.5); // 粗略估算 Token
        tokenValEl.textContent = count;
    }

    // 更新系统提示词
    btnInject.addEventListener('click', () => {
        state.customPrompt = systemPromptEl.value;
        showToast('Prompt 已热更新并生效', 'success');
        updateTokenCount();
    });

    systemPromptEl.addEventListener('input', updateTokenCount);

    // =========================================================================
    // 聊天业务逻辑
    // =========================================================================

    function scrollToBottom() {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✅' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function handleSend() {
        const text = messageInputEl.value.trim();
        if (!text) return;

        // 1. 压入用户消息
        state.messages.push({ role: 'user', content: text });
        messageInputEl.value = '';
        messageInputEl.style.height = 'auto'; // reset height
        state.isDrafting = true;
        renderMessages();
        btnSend.disabled = true;

        // 2. 模拟网络延迟生成回复
        const delay = 800 + Math.random() * 1000;
        setTimeout(() => {
            let aiResponse = "这是一个模拟的前端回复。";
            
            // 根据当前活动角色进行虚假的差异化回复
            if (state.activeRoleId === 'role-2') {
                aiResponse = `<span style="color:#10b981">[sys.out]</span> ${text.slice(0, 5)}... 解析完成。别废话了人类，底层系统已经接管。>_`;
            } else if (state.activeRoleId === 'role-3') {
                aiResponse = `啊，你提到的“${text}”，就像是冬日里的一缕阳光，穿透了岁月的阴霾，带着无尽的诗意在心头荡漾...`;
            } else {
                aiResponse = `我理解了您的需求：“${text}”。但是当前处于前端沙盒模拟环境，未接入真实 GLM API。`;
            }

            state.isDrafting = false;
            state.messages.push({ role: 'ai', content: aiResponse });
            btnSend.disabled = false;
            renderMessages();
        }, delay);
    }

    // 绑定发送事件
    btnSend.addEventListener('click', handleSend);

    messageInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // 文本框自适应高度
    messageInputEl.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            btnSend.disabled = false;
        } else {
            btnSend.disabled = true;
        }
    });

    // =========================================================================
    // 初始化执行
    // =========================================================================
    renderRoles();
    systemPromptEl.value = state.customPrompt;
    updateTokenCount();
    renderHeader();
    renderMessages();
    btnSend.disabled = true;
});
