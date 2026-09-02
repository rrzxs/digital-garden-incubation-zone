/* ==========================================================================
   Suspicion Terminal · 猜疑终端
   EDEN-7 原型机失窃案 — 终端诘问模拟器
   结构: 案卷数据 → 状态 → 终端引擎 → 指令解析 → 粒子背景 → 开机序列
   ========================================================================== */

'use strict';

// === 案卷数据 (Case Data) ==================================================

const CASE_BRIEF = [
  '【案件编号 EDEN-7】神经形态原型机失窃案',
  '时间: 昨夜 22:00 前后 · 地点: X-13 实验室',
  '一台重 40kg 的原型机在监控眼皮底下消失，现场只留下一只温热的咖啡杯。',
  '你有三名嫌疑人。门禁、监控、称重记录都在说谎——或者，他们在说谎。',
  '出示证物戳破谎言，当嫌疑值突破临界点，真相会自己裂开。'
];

const SUSPECTS = {
  marlow: {
    name: 'MARLOW', role: '首席工程师 · 冷静防御',
    intro: 'MARLOW 坐下时把工牌反扣在桌上。"我配合调查，但请快点，我在调参。"',
    suspicion: 0,
    topics: {
      alibi: '"我 21 点以后一直在 B 馆调参数，传感器日志可以作证。X-13？我 21 点前就离开了。"',
      prototype: '"那台原型机是我带队造的。谁偷它都是外行——电源模块不拆下来，撑不过两小时。"',
      night: '"昨晚？普通的一夜。咖啡，日志，回家的末班地铁。"',
      keycard: '"我的门禁卡从不离身。你可以去查日志，虽然我不知道日志能证明什么。"',
      camera: '"监控归 KAINE 管。工程部的人都知道，那些摄像头一半是摆设。"',
      vesper: '"实习生？勤快，但总在不对的时间出现在不对的地方。年轻人嘛。"',
      kaine: '"安全主管对每个人都微笑，对每个人的档案也都微笑。你懂我意思。"'
    },
    press: {
      E1: { delta: 35, lines: [
        '你把门禁日志推过去：21:15 才离开 X-13，和"21 点前离开"的说法对不上。',
        'MARLOW 的手指停顿了半秒。"……我记错了。21:15 离开，然后去了 B 馆。这不重要。"'
      ] },
      E4: { delta: 65, lines: [
        '"东西已转移，别打给我。"——21:58 的邮件草稿，收件人空白。',
        'MARLOW 盯着屏幕看了很久，肩膀塌了下去。"好吧。是我打算把它转移到保险库，防止项目被裁撤。"',
        '"但 21:47 我推着空推车回到 X-13 时——它已经不见了。我写那封邮件，只是想掩盖我的失职。"'
      ] }
    },
    crackLines: [
      '▌MARLOW 供认了转移计划，但他不是窃贼——他是第一个发现失窃的人。',
      '「货梯！21:47 我看到货梯的指示灯亮着，没刷卡却在运行。去查称重记录！」'
    ]
  },
  vesper: {
    name: 'VESPER', role: '实习研究员 · 紧张健谈',
    intro: 'VESPER 抱着笔记本坐下，指节发白。"我、我什么都愿意配合。"',
    suspicion: 0,
    topics: {
      alibi: '"我 21:30 就下班走了！回宿舍还和室友打了两把游戏，真的。"',
      prototype: '"那台机器很美。我给它写过一版优化注释，MARLOW 说我……不配碰它。"',
      night: '"宿舍，游戏，泡面。普通的一夜，我发誓。"',
      keycard: '"实习生只有 B 馆权限。X-13？我连门都刷不开——所以不可能是我，对吧？"',
      camera: '"走廊那个摄像头？上周就一闪一闪的，我还报修过。"',
      marlow: '"MARLOW 老师最近很焦躁，昨天他把会议室的白板都擦了，一个字都不留。"',
      kaine: '"KAINE 主管每晚都巡更，时间准得像时钟。昨晚我在楼下还看见他。"'
    },
    press: {
      E3: { delta: 40, lines: [
        '你把咖啡杯的照片放在桌上：22:10 仍温热，杯沿的口红批次与她的完全一致。',
        'VESPER 的视线钉在照片上。"我……我中午用它喝过咖啡！中午！"'
      ] },
      E5: { delta: 45, lines: [
        '货梯称重记录：21:47，未刷卡启动，载重 52kg。推车 12kg + 原型机 40kg。',
        '"未刷卡……"VESPER 的声音越来越小，"货梯的检修模式可以绕过门禁……是我发现的……"',
        '她突然哭了。"我只是想证明我配得上留下来！电源模块我拆了，藏在天台通风井！"'
      ] }
    },
    crackLines: [
      '▌VESPER 崩溃了。她承认利用货梯检修模式搬走了原型机。',
      '「21:47 我从消防通道尾随进入，用货梯运到一层，全程 11 分钟——对不起。」'
    ]
  },
  kaine: {
    name: 'KAINE', role: '安全主管 · 官腔滴水不漏',
    intro: 'KAINE 坐得笔直。"监控、门禁、巡更，三重系统。我相信系统，你也应该。"',
    suspicion: 0,
    topics: {
      alibi: '"21:50 我在西区巡更打卡，系统有记录。我信任系统，如同系统信任我。"',
      prototype: '"失窃时段门禁零记录。要么 Prototype 学会了穿墙，要么——"他顿了顿，"有人绕过了我的系统。"',
      night: '"例行巡更。三次打卡，路线标准，无异常。至少系统这么显示。"',
      keycard: '"门禁日志我每夜复核。21:02 MARLOW 进入，21:15 离开，之后一片干净。"',
      camera: '"监控全程正常，除了一次例行的信号波动。波动是物理现象，不是谎言。"',
      marlow: '"MARLOW 博士？模范员工。虽然上周他申请过保险库权限，被我驳回了。"',
      vesper: '"实习生 VESPER 上个月申请 X-13 权限，理由写的是\'学术热情\'。我驳回了。"'
    },
    press: {
      E2: { delta: 30, lines: [
        '监控空窗 21:47–21:58，恰好 11 分钟。"例行波动"未免太巧。',
        'KAINE 的表情第一次出现裂缝。"那次中断是本地物理屏蔽，不是远程删除。有人站在摄像头旁边。"',
        '"既然说到这里——21:50 巡更经过货梯口时，我看见一个抱着纸箱的背影。很像 VESPER。"',
        '"我没上报，因为我不确定。系统里没有记录的东西，我从不轻信。这是我的职业操守，也是我的软肋。"'
      ] }
    },
    crackLines: [
      '▌KAINE 交出了他的私人巡更笔记：21:50，货梯口，抱纸箱的娇小背影。',
      '「 VESPER 的口红印、她申请权限被驳回的记录——把证物摆到她面前吧，侦探。」'
    ]
  }
};

const EVIDENCE = {
  E1: { name: '门禁日志', desc: 'MARLOW 21:02 进入 X-13，21:15 离开；此后至 02:00 零记录。' },
  E2: { name: '监控空窗', desc: '走廊摄像机 21:47–21:58 出现 11 分钟本地信号中断。' },
  E3: { name: '咖啡杯', desc: '22:10 仍温热，杯沿口红批次与 VESPER 一致。' },
  E4: { name: '未发送邮件', desc: 'MARLOW 草稿箱 21:58："东西已转移，别打给我。"' },
  E5: { name: '货梯称重', desc: '21:47 未刷卡启动，载重 52kg = 推车 12kg + 原型机 40kg。' }
};

const CRACK_THRESHOLD = 70;
const GUILTY = 'vesper';

// === 游戏状态 (Game State) =================================================

const state = {
  trust: 100,
  finished: false,
  pressed: { marlow: [], vesper: [], kaine: [] },
  history: [],
  historyIndex: -1
};

// === DOM Elements ===========================================================

const outputEl = document.getElementById('output');
const inputForm = document.getElementById('input-form');
const cli = document.getElementById('cli');
const trustFill = document.getElementById('trust-fill');
const trustValue = document.getElementById('trust-value');
const trustChip = document.getElementById('trust-chip');
const suspectList = document.getElementById('suspect-list');
const evidenceList = document.getElementById('evidence-list');
const tbStatus = document.getElementById('tb-status');

// === 终端引擎 (Terminal Engine) =============================================

const printQueue = [];
let printing = false;

function print(text, cls = 't-sys') {
  printQueue.push({ text, cls });
  if (!printing) flushQueue();
}

function printAll(lines) {
  lines.forEach((l) => printQueue.push(l));
  if (!printing) flushQueue();
}

function flushQueue() {
  printing = true;
  const item = printQueue.shift();
  if (!item) {
    printing = false;
    return;
  }
  const div = document.createElement('div');
  div.className = `term-line ${item.cls}`;
  outputEl.appendChild(div);
  typeInto(div, item.text, () => {
    const delay = item.cls === 't-crack' ? 320 : 60;
    setTimeout(flushQueue, delay);
  });
}

function typeInto(el, text, done) {
  // 支持极简标记 <b>名字</b>：直接按 HTML 打出，其余逐字
  let i = 0;
  const speed = 9;
  (function step() {
    i += 1 + Math.floor(Math.random() * 2);
    el.textContent = text.slice(0, i);
    outputEl.scrollTop = outputEl.scrollHeight;
    if (i < text.length) {
      setTimeout(step, speed);
    } else {
      el.textContent = text;
      done();
    }
  })();
}

// === 嫌疑光谱 / 证物 UI =====================================================

function initSidePanels() {
  Object.values(SUSPECTS).forEach((s) => {
    const card = document.createElement('div');
    card.className = 'suspect-card';
    card.id = `suspect-${s.name.toLowerCase()}`;
    card.innerHTML = `
      <div class="suspect-head">
        <span class="suspect-name">${s.name}</span>
        <span class="suspect-role">${s.role}</span>
      </div>
      <div class="suspect-meter"><div class="suspect-fill" id="fill-${s.name.toLowerCase()}"></div></div>
      <div class="suspect-state" id="state-${s.name.toLowerCase()}">SUSPICION 0 / ${CRACK_THRESHOLD}</div>
    `;
    suspectList.appendChild(card);
  });

  Object.entries(EVIDENCE).forEach(([id, e]) => {
    const item = document.createElement('div');
    item.className = 'evidence-item';
    item.innerHTML = `
      <span class="evidence-id">${id}</span>
      <div class="evidence-name">${e.name}</div>
      <div class="evidence-desc">${e.desc}</div>
    `;
    evidenceList.appendChild(item);
  });
}

function addSuspicion(key, delta) {
  const s = SUSPECTS[key];
  s.suspicion = Math.min(s.suspicion + delta, CRACK_THRESHOLD + 10);
  const k = s.name.toLowerCase();
  const fill = document.getElementById(`fill-${k}`);
  const stateText = document.getElementById(`state-${k}`);
  const card = document.getElementById(`suspect-${k}`);
  fill.style.width = `${Math.min(s.suspicion, 100)}%`;
  stateText.textContent = `SUSPICION ${s.suspicion} / ${CRACK_THRESHOLD}`;
  if (s.suspicion >= CRACK_THRESHOLD && !card.classList.contains('cracked')) {
    card.classList.add('cracked');
    fill.classList.add('cracked');
    stateText.textContent = 'CRACKED · 供述破裂';
    printAll([
      { text: '', cls: 't-sys' },
      ...s.crackLines.map((l) => ({ text: l, cls: 't-crack' }))
    ]);
    if (key === GUILTY) {
      print('线索已闭环。输入 accuse vesper 结案。', 't-accent');
    }
  }
}

function setTrust(value) {
  state.trust = Math.max(0, Math.min(100, value));
  trustFill.style.width = `${state.trust}%`;
  trustValue.textContent = state.trust;
  if (state.trust <= 30) {
    trustChip.classList.remove('low');
    void trustChip.offsetWidth; // 重触发抖动动画
    trustChip.classList.add('low');
  }
  if (state.trust <= 0 && !state.finished) {
    endGame(false, '公信力耗尽');
  }
}

// === 指令解析 (Command Parser) ==============================================

const HELP_LINES = [
  ['case', '调阅案件简报'],
  ['suspects', '列出嫌疑人'],
  ['interrogate <人名>', '开始审讯 (marlow / vesper / kaine)'],
  ['ask <人名> <话题>', '追问话题 (alibi / night / prototype / keycard / camera / 人名)'],
  ['evidence [编号]', '列出或查看证物 (E1~E5)'],
  ['press <人名> <证物>', '出示证物，戳破谎言的核心操作'],
  ['accuse <人名>', '正式指控（错误将消耗公信力）'],
  ['theme <配色>', 'amber / phosphor / cyan / magenta'],
  ['clear / reboot', '清屏 / 重新立案']
];

const TOPIC_ALIASES = {
  alibi: 'alibi', 不在场: 'alibi',
  night: 'night', 夜里: 'night', 昨晚: 'night',
  prototype: 'prototype', 原型机: 'prototype', 机器: 'prototype',
  keycard: 'keycard', 门禁: 'keycard',
  camera: 'camera', 监控: 'camera',
  marlow: 'marlow', vesper: 'vesper', kaine: 'kaine'
};

function resolveSuspect(token) {
  const t = (token || '').toLowerCase();
  return ['marlow', 'vesper', 'kaine'].find((n) => n.startsWith(t) || SUSPECTS[n].name.toLowerCase() === t);
}

function handleCommand(raw) {
  const input = raw.trim();
  if (!input) return;
  print(input, 't-user');
  state.history.push(input);
  state.historyIndex = state.history.length;

  const [cmd, ...args] = input.split(/\s+/);
  const c = cmd.toLowerCase();

  switch (c) {
    case 'help': case '帮助':
      print('可用指令 —', 't-accent');
      HELP_LINES.forEach(([k, v]) => print(`  ${k.padEnd(22, ' ')} ${v}`));
      break;

    case 'case': case '案件':
      CASE_BRIEF.forEach((l) => print(l, 't-sys'));
      break;

    case 'suspects': case '嫌疑人':
      Object.values(SUSPECTS).forEach((s) =>
        print(`${s.name} — ${s.role} · 嫌疑值 ${s.suspicion}/${CRACK_THRESHOLD}`, 't-suspect'));
      break;

    case 'interrogate': case '审讯': {
      const key = resolveSuspect(args[0]);
      if (!key) return print('用法: interrogate <marlow / vesper / kaine>', 't-warn');
      print(`— 审讯开始：${SUSPECTS[key].name}`, 't-accent');
      print(SUSPECTS[key].intro, 't-suspect');
      break;
    }

    case 'ask': case '追问': {
      const key = resolveSuspect(args[0]);
      if (!key) return print('用法: ask <人名> <话题>', 't-warn');
      const topic = TOPIC_ALIASES[(args[1] || '').toLowerCase()];
      if (!topic) return print('话题: alibi / night / prototype / keycard / camera / 其他嫌疑人名', 't-warn');
      const answer = SUSPECTS[key].topics[topic];
      print(`${SUSPECTS[key].name}:`, 't-accent');
      print(answer, 't-quote');
      break;
    }

    case 'evidence': case '证物': {
      const id = (args[0] || '').toUpperCase();
      if (id && EVIDENCE[id]) {
        print(`${id} · ${EVIDENCE[id].name}`, 't-accent');
        print(EVIDENCE[id].desc, 't-sys');
      } else {
        Object.entries(EVIDENCE).forEach(([id, e]) => print(`${id} · ${e.name} — ${e.desc}`, 't-sys'));
      }
      break;
    }

    case 'press': case '出示': {
      const key = resolveSuspect(args[0]);
      const id = (args[1] || '').toUpperCase();
      if (!key || !EVIDENCE[id]) return print('用法: press <人名> <E1~E5>', 't-warn');
      const card = SUSPECTS[key].press[id];
      if (card) {
        print(`你出示了 ${id} · ${EVIDENCE[id].name}`, 't-accent');
        card.lines.forEach((l) => print(l, 't-suspect'));
        addSuspicion(key, card.delta);
      } else {
        print(`${SUSPECTS[key].name} 看了一眼：「这和我有什么关系？」`, 't-suspect');
        print('（毫无破绽……公信力 -5）', 't-warn');
        setTrust(state.trust - 5);
      }
      break;
    }

    case 'accuse': case '指控': {
      const key = resolveSuspect(args[0]);
      if (!key) return print('用法: accuse <人名>', 't-warn');
      if (SUSPECTS[GUILTY].suspicion < CRACK_THRESHOLD) {
        print('检察官驳回：证据链尚未闭合，贸然指控只会打草惊蛇。（公信力 -20）', 't-warn');
        setTrust(state.trust - 20);
        return;
      }
      if (key === GUILTY) {
        endGame(true, null);
      } else {
        print(`${SUSPECTS[key].name} 的律师团在两小时内发来了函件。（公信力 -30）`, 't-warn');
        setTrust(state.trust - 30);
      }
      break;
    }

    case 'theme': case '配色': {
      const t = (args[0] || '').toLowerCase();
      if (['amber', 'phosphor', 'cyan', 'magenta'].includes(t)) {
        setTheme(t);
        print(`磷光配色已切换 → ${t}`, 't-ok');
      } else {
        print('可用配色: amber / phosphor / cyan / magenta', 't-warn');
      }
      break;
    }

    case 'clear': case '清屏':
      outputEl.innerHTML = '';
      break;

    case 'reboot': case '重启':
      location.reload();
      break;

    default:
      print(`未知指令: ${cmd}。输入 help 查看可用指令。`, 't-warn');
  }
}

// === 终局 (Verdict) =========================================================

function endGame(win, reason) {
  state.finished = true;
  tbStatus.textContent = win ? 'CLOSED' : 'SUSPENDED';
  const overlay = document.getElementById('verdict-overlay');
  const glyph = document.getElementById('verdict-glyph');
  const title = document.getElementById('verdict-title');
  const body = document.getElementById('verdict-body');
  if (win) {
    glyph.textContent = '◈';
    title.textContent = 'CASE CLOSED · 真相闭合';
    body.textContent = 'VESPER 在铁证前供认了一切。原型机从天台通风井完好找回，电源模块被她细心地包在防静电布里。"我只是想配得上留下来。" — 没有人是纯粹的恶人，但每台终端都记得真相。';
  } else {
    glyph.textContent = '⌁';
    title.textContent = 'CASE SUSPENDED · 调查中止';
    body.textContent = reason === '公信力耗尽'
      ? '错误的指控耗尽了你的公信力。检方接管了案卷，而真相继续沉在通风井里。终端不会忘记，你也可以 reboot 重新立案。'
      : '调查陷入僵局。输入 reboot 重新立案。';
  }
  overlay.hidden = false;
}

document.getElementById('verdict-btn').addEventListener('click', () => location.reload());

// === 主题切换 ===============================================================

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.theme === t));
}

document.getElementById('theme-switch').addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (btn) setTheme(btn.dataset.theme);
});

// === 输入绑定 ===============================================================

inputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleCommand(cli.value);
  cli.value = '';
});

cli.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && state.history.length) {
    state.historyIndex = Math.max(0, state.historyIndex - 1);
    cli.value = state.history[state.historyIndex];
    e.preventDefault();
  } else if (e.key === 'ArrowDown' && state.history.length) {
    state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
    cli.value = state.history[state.historyIndex] || '';
    e.preventDefault();
  }
});

// === 粒子流场背景 (Particles) ==============================================

function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COUNT = Math.min(70, Math.floor(window.innerWidth / 20));
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 0.6 + Math.random() * 1.6, tw: Math.random() * Math.PI * 2
    });
  }

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  }

  let t = 0;
  (function tick() {
    t += 0.005;
    ctx.clearRect(0, 0, w, h);
    const color = accentColor();
    particles.forEach((p) => {
      p.x += p.vx + Math.sin(t + p.tw) * 0.12;
      p.y += p.vy + Math.cos(t * 0.8 + p.tw) * 0.1;
      if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 + p.tw));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  })();
}

// === 开机序列 (Boot Sequence) ==============================================

const BOOT_LINES = [
  'SUSPICION-TERM BIOS v3.7 — PHOSPHOR CORE',
  '内存校验 .................. 65536K OK',
  '证物链接口 ................ 5 DEVICES FOUND',
  '嫌疑人心理图谱 ............ LOADED',
  '磷光渲染管线 .............. ACTIVE',
  '',
  '> 接入 X-13 调查终端 …',
  '> 下载案卷 EDEN-7 … done',
  '> 唤醒侦探 …',
  ''
];

function boot() {
  const log = document.getElementById('boot-log');
  const overlay = document.getElementById('boot-overlay');
  let li = 0, ci = 0;

  (function typeBoot() {
    if (li >= BOOT_LINES.length) {
      setTimeout(() => {
        overlay.classList.add('done');
        cli.focus();
        setTimeout(() => {
          print('SUSPICION TERMINAL v3.7 — 猜疑终端已就绪。', 't-accent');
          CASE_BRIEF.forEach((l) => print(l, 't-sys'));
          print('输入 help 查看指令。祝你好运，侦探。', 't-accent');
        }, 600);
      }, 500);
      return;
    }
    const line = BOOT_LINES[li];
    if (ci < line.length) {
      log.textContent += line[ci++];
      setTimeout(typeBoot, 10);
    } else {
      log.textContent += '\n';
      li++; ci = 0;
      setTimeout(typeBoot, 90);
    }
  })();
}

// === 初始化 ================================================================

initSidePanels();
initParticles();
setTrust(100);
boot();
