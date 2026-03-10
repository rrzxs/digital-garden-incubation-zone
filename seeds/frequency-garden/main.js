import {
  buildGuidancePrompt,
  createFallbackGuidance,
  createSessionBlueprint,
  getSoundConfig,
  listEmotionConfigs,
  listSceneConfigs
} from './lib/frequency-engine.js';

const sceneButtons = Array.from(document.querySelectorAll('[data-scene-choice]'));
const emotionButtons = Array.from(document.querySelectorAll('[data-emotion]'));
const soundButtons = Array.from(document.querySelectorAll('[data-sound-choice]'));

const stepPanels = {
  'step-01': document.getElementById('step-01'),
  'step-02': document.getElementById('step-02'),
  'step-03': document.getElementById('step-03')
};

const stepCopyNodes = {
  'step-01': document.getElementById('step-01-state-copy'),
  'step-02': document.getElementById('step-02-state-copy'),
  'step-03': document.getElementById('step-03-state-copy')
};

const noteInput = document.getElementById('emotion-note');
const guidanceOutput = document.getElementById('guidance-output');
const generateGuidanceBtn = document.getElementById('generate-guidance-btn');
const sessionStartBtn = document.getElementById('session-start-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const breathingStage = document.getElementById('breathing-stage');
const phaseText = document.getElementById('phase-text');
const phaseCountdown = document.getElementById('phase-countdown');
const phaseHint = document.getElementById('phase-hint');
const protocolSteps = document.getElementById('protocol-steps');
const protocolLabel = document.getElementById('protocol-label');
const sceneName = document.getElementById('scene-name');
const soundName = document.getElementById('sound-name');
const roundStatus = document.getElementById('round-status');
const sessionMessage = document.getElementById('session-message');
const aiStatus = document.getElementById('ai-status');

const externalAi = globalThis.__FREQUENCY_GARDEN_AI__;
const emotionLookup = Object.fromEntries(listEmotionConfigs().map((item) => [item.id, item]));
const sceneLookup = Object.fromEntries(listSceneConfigs().map((item) => [item.id, item]));

const STEP_COPY = {
  'step-01': {
    current: '先选定情绪底色，并写下一句此刻最需要被接住的话。',
    ready: '你已经把当下状态交给了这个花园。'
  },
  'step-02': {
    locked: '完成上一步后，这里会展开专属引导与呼吸节律。',
    active: '你的专属引导已经展开。先读一遍，再开始调频。',
    ready: '这段引导会继续陪着你，随时可以回看。'
  },
  'step-03': {
    locked: '引导生成后，呼吸舞台才会向你打开。',
    ready: '你已经准备好了，点“开始调频”让呼吸舞台亮起。',
    active: '正在跟随节律调频。',
    complete: '这一轮已经完成。你可以停一会儿，或再来一次。'
  }
};

const state = {
  emotion: 'anxious',
  note: '',
  sceneId: 'moon',
  soundId: 'rain',
  guidance: '',
  session: null,
  generatedBy: 'local',
  guidanceReady: false,
  sessionComplete: false,
  sessionTimer: null,
  isRunning: false,
  audioEnabled: false
};

class AmbientAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.currentNodes = [];
  }

  ensureContext() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    return this.audioContext;
  }

  stop() {
    this.currentNodes.forEach((cleanup) => cleanup());
    this.currentNodes = [];

    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setTargetAtTime(0.0001, this.audioContext.currentTime, 0.18);
    }
  }

  start(soundId) {
    const context = this.ensureContext();

    if (!context || !this.masterGain) {
      return false;
    }

    this.stop();
    this.masterGain.gain.setTargetAtTime(0.12, context.currentTime, 0.4);

    if (soundId === 'bowl') {
      this.currentNodes.push(...this.createBowlLayer(context));
      return true;
    }

    const noiseSource = this.createNoiseSource(context);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    if (soundId === 'forest') {
      filter.type = 'bandpass';
      filter.frequency.value = 680;
      filter.Q.value = 0.3;
      gain.gain.value = 0.38;
    } else {
      filter.type = 'highpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.14;
      gain.gain.value = 0.24;
    }

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.currentNodes.push(() => noiseSource.stop());
    this.currentNodes.push(() => {
      noiseSource.disconnect();
      filter.disconnect();
      gain.disconnect();
    });

    return true;
  }

  createNoiseSource(context) {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  createBowlLayer(context) {
    const fundamental = context.createOscillator();
    const shimmer = context.createOscillator();
    const gain = context.createGain();
    const shimmerGain = context.createGain();

    fundamental.type = 'sine';
    fundamental.frequency.value = 110;
    shimmer.type = 'triangle';
    shimmer.frequency.value = 220;
    gain.gain.value = 0.05;
    shimmerGain.gain.value = 0.015;

    fundamental.connect(gain);
    shimmer.connect(shimmerGain);
    gain.connect(this.masterGain);
    shimmerGain.connect(this.masterGain);

    fundamental.start();
    shimmer.start();

    return [
      () => fundamental.stop(),
      () => shimmer.stop(),
      () => {
        fundamental.disconnect();
        shimmer.disconnect();
        gain.disconnect();
        shimmerGain.disconnect();
      }
    ];
  }
}

const audioEngine = new AmbientAudioEngine();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function scrollToPanel(panel) {
  panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStepState(stepId, nextState) {
  const panel = stepPanels[stepId];
  if (!panel) {
    return;
  }

  panel.dataset.stepState = nextState;
  const copyNode = stepCopyNodes[stepId];
  const stepCopy = STEP_COPY[stepId]?.[nextState];

  if (copyNode && stepCopy) {
    copyNode.textContent = stepCopy;
  }
}

function syncStepStates() {
  if (state.isRunning) {
    setStepState('step-01', 'ready');
    setStepState('step-02', 'ready');
    setStepState('step-03', 'active');
    return;
  }

  if (state.sessionComplete) {
    setStepState('step-01', 'ready');
    setStepState('step-02', 'ready');
    setStepState('step-03', 'complete');
    return;
  }

  if (state.guidanceReady) {
    setStepState('step-01', 'ready');
    setStepState('step-02', 'active');
    setStepState('step-03', 'ready');
    return;
  }

  setStepState('step-01', 'current');
  setStepState('step-02', 'locked');
  setStepState('step-03', 'locked');
}

function updateSessionBlueprint() {
  state.note = noteInput.value.trim();
  state.session = createSessionBlueprint({
    emotion: state.emotion,
    note: state.note,
    sceneId: state.sceneId,
    soundId: state.soundId
  });
}

function renderEmotionSelection() {
  emotionButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.emotion === state.emotion);
  });
}

function renderSceneSelection() {
  document.body.dataset.scene = state.sceneId;
  sceneButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.sceneChoice === state.sceneId);
  });
  sceneName.textContent = sceneLookup[state.sceneId].name;
}

function renderSoundSelection() {
  soundButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.soundChoice === state.soundId);
  });
  soundName.textContent = getSoundConfig(state.soundId).name;
}

function renderProtocol() {
  if (!state.session) {
    updateSessionBlueprint();
  }

  const { protocol } = state.session;
  protocolSteps.textContent = `${protocol.inhale}-${protocol.hold}-${protocol.exhale}-${protocol.rest}`;
  protocolLabel.textContent = protocol.label;
}

function renderGuidance() {
  if (!state.guidanceReady) {
    guidanceOutput.innerHTML = '<p class="placeholder-copy">当你点击“生成温柔引导”后，这里会出现专属于此刻的四段轻声陪伴。</p>';
    return;
  }

  guidanceOutput.innerHTML = state.guidance
    .split('\n\n')
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function renderAiStatus() {
  aiStatus.textContent = state.generatedBy === 'remote' ? '外部 AI 已增强' : '本地引导模式';
}

function setBusy(isBusy) {
  generateGuidanceBtn.disabled = isBusy;
  generateGuidanceBtn.textContent = isBusy ? '正在生成...' : '生成温柔引导';
}

function invalidateGuidance(reason) {
  if (state.isRunning) {
    stopSession();
  }

  state.guidance = '';
  state.guidanceReady = false;
  state.generatedBy = 'local';
  state.sessionComplete = false;
  sessionStartBtn.disabled = true;
  sessionStartBtn.textContent = '开始调频';
  sessionMessage.textContent = reason;
  roundStatus.textContent = '准备中';
  renderAiStatus();
  renderGuidance();
  syncStepStates();
}

async function generateGuidance() {
  updateSessionBlueprint();
  setBusy(true);

  try {
    const prompt = buildGuidancePrompt({
      emotion: state.emotion,
      note: state.note,
      sceneId: state.sceneId,
      soundId: state.soundId
    });

    let guidance = '';

    if (typeof externalAi?.generateGuidance === 'function') {
      guidance = await externalAi.generateGuidance({ prompt, session: state.session });
    } else if (typeof externalAi === 'function') {
      guidance = await externalAi({ prompt, session: state.session });
    }

    if (!guidance) {
      guidance = createFallbackGuidance({
        emotion: state.emotion,
        note: state.note,
        sceneId: state.sceneId,
        soundId: state.soundId
      });
      state.generatedBy = 'local';
    } else {
      state.generatedBy = 'remote';
    }

    state.guidance = guidance;
    state.guidanceReady = true;
    state.sessionComplete = false;
    sessionStartBtn.disabled = false;
    sessionStartBtn.textContent = '开始调频';
    sessionMessage.textContent = '引导已准备好，可以开始这一轮调频。';
    renderAiStatus();
    renderGuidance();
    renderProtocol();
    syncStepStates();
    scrollToPanel(stepPanels['step-02']);
  } catch (error) {
    console.warn('Frequency Garden AI fallback triggered.', error);
    state.guidance = createFallbackGuidance({
      emotion: state.emotion,
      note: state.note,
      sceneId: state.sceneId,
      soundId: state.soundId
    });
    state.generatedBy = 'local';
    state.guidanceReady = true;
    state.sessionComplete = false;
    sessionStartBtn.disabled = false;
    sessionMessage.textContent = '外部 AI 不可用，已切换到本地温柔引导。';
    renderAiStatus();
    renderGuidance();
    renderProtocol();
    syncStepStates();
    scrollToPanel(stepPanels['step-02']);
  } finally {
    setBusy(false);
  }
}

function stopSession() {
  clearInterval(state.sessionTimer);
  state.sessionTimer = null;
  state.isRunning = false;
  state.sessionComplete = false;
  sessionStartBtn.textContent = '继续调频';
  roundStatus.textContent = '已暂停';
  phaseText.textContent = '暂停中';
  phaseCountdown.textContent = '--';
  phaseHint.textContent = '你可以继续，也可以重新生成一轮更贴近当下的引导。';
  syncStepStates();
}

function finishSession() {
  clearInterval(state.sessionTimer);
  state.sessionTimer = null;
  state.isRunning = false;
  state.sessionComplete = true;
  sessionStartBtn.disabled = false;
  sessionStartBtn.textContent = '再来一次';
  roundStatus.textContent = '本轮完成';
  phaseText.textContent = '回到自己';
  phaseCountdown.textContent = '✓';
  phaseHint.textContent = '你已经把自己带回来了一点点。';
  sessionMessage.textContent = '如果愿意，可以换一个场景，重新生成下一轮。';
  syncStepStates();
}

function runPhaseSequence(phases, phaseIndex, roundIndex, totalRounds) {
  if (!state.isRunning) {
    return;
  }

  if (roundIndex >= totalRounds) {
    finishSession();
    return;
  }

  if (phaseIndex >= phases.length) {
    runPhaseSequence(phases, 0, roundIndex + 1, totalRounds);
    return;
  }

  const phase = phases[phaseIndex];
  let timeLeft = phase.seconds;

  breathingStage.dataset.phase = phase.id;
  phaseText.textContent = phase.label;
  phaseHint.textContent = phase.hint;
  roundStatus.textContent = `第 ${roundIndex + 1} / ${totalRounds} 轮`;
  phaseCountdown.textContent = String(timeLeft);

  clearInterval(state.sessionTimer);
  state.sessionTimer = setInterval(() => {
    if (!state.isRunning) {
      clearInterval(state.sessionTimer);
      return;
    }

    timeLeft -= 1;

    if (timeLeft <= 0) {
      clearInterval(state.sessionTimer);
      runPhaseSequence(phases, phaseIndex + 1, roundIndex, totalRounds);
      return;
    }

    phaseCountdown.textContent = String(timeLeft);
  }, 1000);
}

function startSession() {
  if (!state.guidanceReady) {
    return;
  }

  updateSessionBlueprint();
  state.isRunning = true;
  state.sessionComplete = false;
  sessionStartBtn.textContent = '暂停调频';
  sessionMessage.textContent = `${state.session.emotion.summary} 现在先跟着身体走。`;

  const { protocol } = state.session;
  const phases = [
    { id: 'inhale', label: '吸气', seconds: protocol.inhale, hint: '轻轻扩张胸腔，让空气进来。' },
    { id: 'hold', label: '停留', seconds: protocol.hold, hint: '不用用力，只是安静停一会儿。' },
    { id: 'exhale', label: '呼气', seconds: protocol.exhale, hint: '让今天多余的紧绷慢慢退开。' }
  ];

  if (protocol.rest > 0) {
    phases.push({ id: 'rest', label: '静止', seconds: protocol.rest, hint: '在空白里落地，不急着进入下一轮。' });
  }

  syncStepStates();
  scrollToPanel(stepPanels['step-03']);
  runPhaseSequence(phases, 0, 0, protocol.rounds);
}

function toggleSession() {
  if (state.isRunning) {
    stopSession();
    return;
  }

  startSession();
}

function toggleSound() {
  state.audioEnabled = !state.audioEnabled;

  if (state.audioEnabled) {
    const started = audioEngine.start(state.soundId);
    soundToggleBtn.classList.add('is-on');
    soundToggleBtn.textContent = started ? '关闭环境音' : '当前浏览器不支持环境音';

    if (!started) {
      state.audioEnabled = false;
      soundToggleBtn.classList.remove('is-on');
    }
  } else {
    audioEngine.stop();
    soundToggleBtn.classList.remove('is-on');
    soundToggleBtn.textContent = '开启环境音';
  }
}

function selectEmotion(emotionId) {
  const config = emotionLookup[emotionId];
  if (!config) {
    return;
  }

  state.emotion = config.id;
  state.sceneId = config.defaultScene;
  state.soundId = config.defaultSound;
  updateSessionBlueprint();
  renderEmotionSelection();
  renderSceneSelection();
  renderSoundSelection();
  renderProtocol();
  invalidateGuidance('情绪已经变化，重新生成一段更贴近此刻的引导吧。');
}

function selectScene(sceneId) {
  if (!sceneLookup[sceneId]) {
    return;
  }

  state.sceneId = sceneId;
  updateSessionBlueprint();
  renderSceneSelection();
  renderProtocol();
  invalidateGuidance('场景已经切换，建议重新生成一段与当前氛围相配的引导。');
}

function selectSound(soundId) {
  state.soundId = soundId;
  updateSessionBlueprint();
  renderSoundSelection();
  if (state.audioEnabled) {
    audioEngine.start(soundId);
  }
}

emotionButtons.forEach((button) => {
  button.addEventListener('click', () => selectEmotion(button.dataset.emotion));
});

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => selectScene(button.dataset.sceneChoice));
});

soundButtons.forEach((button) => {
  button.addEventListener('click', () => selectSound(button.dataset.soundChoice));
});

noteInput.addEventListener('input', () => {
  updateSessionBlueprint();
  invalidateGuidance('你修改了此刻的描述，重新生成会更贴近你的当下。');
});

generateGuidanceBtn.addEventListener('click', () => {
  void generateGuidance();
});

sessionStartBtn.addEventListener('click', () => {
  toggleSession();
});

soundToggleBtn.addEventListener('click', () => {
  toggleSound();
});

updateSessionBlueprint();
renderEmotionSelection();
renderSceneSelection();
renderSoundSelection();
renderProtocol();
renderGuidance();
renderAiStatus();
syncStepStates();
