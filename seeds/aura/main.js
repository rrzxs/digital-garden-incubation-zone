/**
 * Aura 灵韵 - 前端交互逻辑
 * 处理播放状态切换、倒计时、呼吸吸呼提示及模式切换。
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素获取
    const playPauseBtn = document.getElementById('play-pause-btn');
    const iconPlay = playPauseBtn.querySelector('.icon-play');
    const iconPause = playPauseBtn.querySelector('.icon-pause');
    const breatheArea = document.querySelector('.breathe-area');
    const breatheText = document.getElementById('breathe-text');
    const timerDisplay = document.getElementById('timer');
    const modeToggle = document.getElementById('mode-toggle');
    const statusText = document.getElementById('status-text');

    // 状态变量
    let isPlaying = false;
    let isFocusMode = false;
    
    // 计时器相关
    let timeLeft = 5 * 60; // 5分钟
    let timerInterval = null;
    
    // 呼吸周期控制 (毫秒)
    const BREATHE_PHASE_MS = 4000; // 吸/呼各4秒
    let breatheInterval = null;
    let isToxin = true; // true=吸气阶段, false=呼气阶段

    // =========================================================================
    // 播放/暂停控制
    // =========================================================================
    playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        
        if (isPlaying) {
            // 切为暂停图标，开启律动
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
            breatheArea.classList.add('is-playing');
            
            startSession();
        } else {
            // 切为播放图标，暂停律动
            iconPlay.style.display = 'block';
            iconPause.style.display = 'none';
            breatheArea.classList.remove('is-playing');
            
            pauseSession();
        }
    });

    // =========================================================================
    // 模式切换控制
    // =========================================================================
    modeToggle.addEventListener('click', () => {
        isFocusMode = !isFocusMode;
        const tooltipSpan = modeToggle.querySelector('.tooltip');
        
        if (isFocusMode) {
            document.body.classList.add('mode-focus');
            tooltipSpan.textContent = "放松模式";
            if(!isPlaying) statusText.textContent = "准备进入专注心流";
        } else {
            document.body.classList.remove('mode-focus');
            tooltipSpan.textContent = "专注模式";
            if(!isPlaying) statusText.textContent = "深呼吸，感知当下";
        }
    });

    // =========================================================================
    // 核心逻辑：倒计时与呼吸文字调度
    // =========================================================================
    
    function startSession() {
        statusText.textContent = "保持节奏...";
        
        // 呼吸文字提示同步器
        // 由于 CSS 动画周期是 8s (4s 吸，4s 呼)，刚按下播放时即刻开始"吸气"
        breatheText.textContent = "吸气";
        isToxin = true;
        
        breatheInterval = setInterval(() => {
            isToxin = !isToxin;
            requestAnimationFrame(() => {
                breatheText.style.opacity = '0';
                setTimeout(() => {
                    breatheText.textContent = isToxin ? "吸气" : "呼气";
                    breatheText.style.opacity = '1';
                }, 300); // 轻微淡入淡出过渡
            });
        }, BREATHE_PHASE_MS);

        // 倒计时
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                // 时间到
                completeSession();
            }
        }, 1000);
    }

    function pauseSession() {
        statusText.textContent = "已暂停";
        clearInterval(breatheInterval);
        clearInterval(timerInterval);
    }
    
    function completeSession() {
        isPlaying = false;
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        breatheArea.classList.remove('is-playing');
        
        clearInterval(breatheInterval);
        clearInterval(timerInterval);
        
        breatheText.textContent = "";
        statusText.textContent = "练习完成，状态已重置";
        
        // 重置时间 (可选恢复为初始时间)
        timeLeft = 5 * 60;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerDisplay.textContent = formattedTime;
    }

    // 初始化显示
    updateTimerDisplay();
    
    // =========================================================================
    // 音效模拟 (由于没有内置音频资源，这里仅做按钮交互反馈)
    // =========================================================================
    const soundToggle = document.getElementById('sound-toggle');
    let isSoundOn = false;
    soundToggle.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        if(isSoundOn) {
            soundToggle.style.color = 'var(--color-accent)';
            soundToggle.querySelector('.tooltip').textContent = "关闭环境音";
        } else {
            soundToggle.style.color = 'var(--color-text-sub)';
            soundToggle.querySelector('.tooltip').textContent = "打开环境音";
        }
    });
});
