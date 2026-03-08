document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const ideaInput = document.getElementById('idea-input');
    const sendBtn = document.getElementById('send-btn');
    const suggestionChips = document.querySelectorAll('.chip');

    // Auto-resize textarea
    ideaInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 150 ? this.scrollHeight : 150) + 'px';
        
        if (this.value.trim().length > 0) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    });

    // Handle suggestion chips click
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.textContent;
            ideaInput.value = text;
            ideaInput.style.height = 'auto'; // Reset before recalculating
            ideaInput.style.height = ideaInput.scrollHeight + 'px';
            sendBtn.disabled = false;
            ideaInput.focus();
        });
    });

    // Enter to send (Shift+Enter for new line)
    ideaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Handle form submit
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = ideaInput.value.trim();
        if (!msg) return;

        // Add user message
        appendMessage('user', msg);
        
        // Clear input
        ideaInput.value = '';
        ideaInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Simulate AI thinking and response
        simulateAIResponse(msg);
    });

    function appendMessage(role, content) {
        const msgGroup = document.createElement('div');
        msgGroup.className = `message-group ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = role === 'robot' ? '🤖' : '👤';

        const msgContent = document.createElement('div');
        msgContent.className = 'message-content glass-panel';
        
        if (typeof content === 'string') {
            msgContent.innerHTML = `<p>${escapeHTML(content)}</p>`;
        } else {
            msgContent.appendChild(content); // For animated DOM elements
        }

        msgGroup.appendChild(avatar);
        msgGroup.appendChild(msgContent);
        
        chatContainer.appendChild(msgGroup);
        scrollToBottom();

        return msgContent; // Return the container if we want to manipulate it later (like replacing loader)
    }

    function simulateAIResponse(userIdea) {
        // Show loading state
        const loaderHTML = document.createElement('div');
        loaderHTML.className = 'loader-dots';
        loaderHTML.innerHTML = '<span></span><span></span><span></span>';
        
        const contentBox = appendMessage('robot', loaderHTML);

        // Simulate network delay
        setTimeout(() => {
            contentBox.innerHTML = `
                <p>收到！您的灵感：<em>“${escapeHTML(userIdea)}”</em> 已作为一颗<strong>「数字种子」</strong>入库。</p>
                <p>我将开始对它进行多维度的需求分析，并建立初始化工程上下文。一旦评估通过，管理员将审批进入孵化阶段（Demo / MVP）。</p>
                <p>您可以继续补充细节，或者返回伊甸园首页查看其他已孵化的项目。</p>
            `;
            scrollToBottom();
        }, 2000);
    }

    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});
