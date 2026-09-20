/* ============================================================
   Verse Receipt Printer · 诗句收据打印机
   Vanilla JS · 免构建 · EDEN 播种
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const moodGrid = document.getElementById('moodGrid');
  const lengthRow = document.getElementById('lengthRow');
  const soundToggle = document.getElementById('soundToggle');
  const printBtn = document.getElementById('printBtn');
  const statusLine = document.getElementById('statusLine');
  const printer = document.getElementById('printer');
  const printerLed = document.getElementById('printerLed');
  const printerTemp = document.getElementById('printerTemp');
  const receipt = document.getElementById('receipt');
  const receiptBody = document.getElementById('receiptBody');
  const tearLine = document.getElementById('tearLine');
  const archiveRail = document.getElementById('archiveRail');
  const archiveEmpty = document.getElementById('archiveEmpty');
  const archiveClear = document.getElementById('archiveClear');

  // === 状态 ===
  const state = {
    mood: 'starry',
    lines: 5,
    printing: false,
    printedCount: 0,
    lastPoem: null
  };

  // === 诗词语料库（按心境） ===
  const CORPUS = {
    starry: {
      shop: '星夜贩卖所',
      blessing: '谢谢惠顾 · 愿你今夜有星可数',
      verses: [
        '把心事晾在银河的绳上', '星星是天空失眠的标点',
        '我数到第七颗时想起你', '月光把影子叠成信封',
        '夜风替我翻了一页心事', '猎户座腰带上挂着旧梦',
        '流星是天空打的一个响指', '把愿望折成纸飞机掷向天鹅座',
        '银河今夜打烊得很晚', '借一颗星子做我的书签',
        '云朵路过时踩灭了暮色', '夜色把喧嚣熨得很平'
      ]
    },
    mist: {
      shop: '海雾邮局',
      blessing: '谢谢惠顾 · 愿雾散时你已抵达',
      verses: [
        '雾在海面写潦草的信', '潮水把礁石念成了摇篮曲',
        '灯塔眨眼，船就安心了', '浪花是海说了一半的话',
        '盐粒在风里练习飞行', '远方的桅杆挑起一弯月',
        '贝壳里存着昨日的涛声', '海平线是一根松了的琴弦',
        '鸥鸟把天空剪出缺口', '雾从山那边寄来一张空白明信片',
        '潮汐退去时留下星星点点', '海底沉着一枚旧钟摆'
      ]
    },
    dawn: {
      shop: '晨光面包房',
      blessing: '谢谢惠顾 · 愿今天柔软而有嚼劲',
      verses: [
        '晨光把窗帘烤得微甜', '露珠在叶尖排队签到',
        '今天的太阳是溏心的', '风把街道的褶皱抚平',
        '豆浆升起一朵小的云', '面包在炉里做了一个金黄的梦',
        '麻雀把清晨啄出了缺口', '影子还留有昨夜的体温',
        '第一班公交载满光斑', '薄雾是清晨哈的一口气',
        '闹钟响时梦刚好翻面', '晾衣绳挑起一整个晴天'
      ]
    },
    rain: {
      shop: '夜雨便利店',
      blessing: '谢谢惠顾 · 愿雨停在你到家之后',
      verses: [
        '雨点在伞上练习摩斯电码', '路灯把雨丝烫成了金色',
        '便利店的灯是夜的海岸', '水洼里躺着另一个城市',
        '雨刷器给夜晚打着节拍', '窗玻璃上爬满透明的蜗牛',
        '檐角滴落一串省略号', '潮湿的猫踩过五线谱',
        '雨夜把噪音调成了静音', '末班车载走一车厢的倦意',
        '屋檐下躲雨的人交换沉默', '雨在瓦片上读一封旧信'
      ]
    }
  };

  // === 音频（Web Audio 打印哒哒声） ===
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function tick(pitch) {
    if (!soundToggle.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }
  function tearSound() {
    if (!soundToggle.checked) return;
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.6);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1600;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start(t);
  }

  // === 工具函数 ===
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n) => String(n).padStart(2, '0');
  function pickVerses(mood, count) {
    const pool = [...CORPUS[mood].verses];
    const picked = [];
    while (picked.length < count && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked;
  }
  function priceFor(text) {
    const v = (text.length * 0.42 + Math.random() * 3.2).toFixed(2);
    return '¥' + v;
  }
  function orderNo() {
    return 'NO.' + String(Math.floor(Math.random() * 90000) + 10000);
  }
  function barcodeBars(el, n) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const bar = document.createElement('span');
      const h = 55 + Math.random() * 45;
      const w = Math.random() > 0.72 ? 3.5 : 2;
      bar.style.height = h + '%';
      bar.style.width = w + 'px';
      frag.appendChild(bar);
    }
    el.appendChild(frag);
  }

  // === 生成收据 DOM ===
  function buildReceipt() {
    const mood = state.mood;
    const conf = CORPUS[mood];
    const verses = pickVerses(mood, state.lines);
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const total = verses.reduce((s, v) => s + parseFloat(priceFor(v).slice(1)), 0);

    receiptBody.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'rc-header';
    header.innerHTML =
      '<div class="rc-shop">✦ ' + conf.shop + ' ✦</div>' +
      '<div class="rc-shop-sub">VERSE RECEIPT · NON-REFUNDABLE</div>';
    const meta = document.createElement('div');
    meta.className = 'rc-meta';
    meta.innerHTML = '<span>' + dateStr + ' ' + timeStr + '</span><span>' + orderNo() + '</span>';
    const div1 = document.createElement('div');
    div1.className = 'rc-divider';

    const verseWrap = document.createElement('div');
    verseWrap.className = 'rc-verse';

    const div2 = document.createElement('div');
    div2.className = 'rc-divider';
    const totalRow = document.createElement('div');
    totalRow.className = 'rc-total';
    totalRow.innerHTML = '<span>此刻心情 TOTAL</span><span class="rc-line-price">¥' + total.toFixed(2) + '</span>';
    const footer = document.createElement('div');
    footer.className = 'rc-footer';
    footer.textContent = conf.blessing;
    const barcode = document.createElement('div');
    barcode.className = 'rc-barcode';

    receiptBody.appendChild(header);
    receiptBody.appendChild(meta);
    receiptBody.appendChild(div1);
    receiptBody.appendChild(verseWrap);
    receiptBody.appendChild(div2);
    receiptBody.appendChild(totalRow);
    receiptBody.appendChild(footer);
    receiptBody.appendChild(barcode);

    return { verses, verseWrap, barcode, conf };
  }

  // === 打印序列（逐行逐字） ===
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function printReceipt() {
    if (state.printing) return;
    state.printing = true;
    printBtn.classList.add('is-busy');
    printer.classList.add('is-printing');
    printerLed.classList.add('is-printing');
    statusLine.textContent = 'PRINTING · 墨迹未干…';

    const { verses, verseWrap, barcode, conf } = buildReceipt();
    receipt.classList.remove('is-torn');
    receiptBody.style.minHeight = '0px';

    // 打印机预热
    for (let t = 62; t <= 78; t += 2) {
      printerTemp.textContent = 'THERMAL ' + t + '°C';
      tick(1400 + t * 8);
      await sleep(70);
    }

    const cursor = document.createElement('span');
    cursor.className = 'rc-cursor';
    receiptBody.appendChild(cursor);

    // 逐行逐字打印
    for (let i = 0; i < verses.length; i++) {
      const row = document.createElement('div');
      row.className = 'rc-line';
      row.style.animationDelay = '0s';
      const textEl = document.createElement('span');
      textEl.className = 'rc-line-text';
      const priceEl = document.createElement('span');
      priceEl.className = 'rc-line-price';
      row.appendChild(textEl);
      row.appendChild(priceEl);
      verseWrap.appendChild(row);
      verseWrap.appendChild(cursor); // 光标始终在末尾

      const text = verses[i];
      let shown = '';
      for (const ch of text) {
        shown += ch;
        textEl.textContent = shown;
        tick(1800 + Math.random() * 500);
        await sleep(46 + Math.random() * 50);
      }
      priceEl.textContent = priceFor(text);
      tick(2600);
      await sleep(140);
    }

    // 尾部信息直接弹出
    await sleep(180);
    barcodeBars(barcode, 36);
    tick(3200);
    cursor.remove();

    // 冷却
    for (let t = 78; t >= 62; t -= 4) {
      printerTemp.textContent = 'THERMAL ' + t + '°C';
      await sleep(60);
    }
    printer.classList.remove('is-printing');
    printerLed.classList.remove('is-printing');
    printBtn.classList.remove('is-busy');
    state.printing = false;
    state.printedCount++;
    state.lastPoem = { conf, verses };
    statusLine.textContent = 'DONE · 共打印 ' + state.printedCount + ' 张 · 沿虚线撕下';
  }

  // === 撕下收据 ===
  function tearReceipt() {
    if (state.printing || !state.lastPoem || receipt.classList.contains('is-torn')) return;
    tearSound();
    spawnPaperBits();
    receipt.classList.add('is-torn');
    setTimeout(() => { archiveReceipt(); }, 260);
    setTimeout(() => {
      receipt.classList.remove('is-torn');
      receiptBody.innerHTML = '<div class="rc-footer" style="opacity:0.35;margin-top:14px">— 等待下一张收据 —</div>';
      state.lastPoem = null;
    }, 850);
    statusLine.textContent = 'TORN · 收据已归档';
  }

  function spawnPaperBits() {
    const rect = tearLine.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const bit = document.createElement('div');
      bit.className = 'paper-bit';
      bit.style.left = rect.left + Math.random() * rect.width + 'px';
      bit.style.top = rect.top + rect.height / 2 + 'px';
      bit.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      bit.style.setProperty('--dy', (60 + Math.random() * 110) + 'px');
      bit.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      document.body.appendChild(bit);
      setTimeout(() => bit.remove(), 950);
    }
  }

  // === 归档 ===
  function archiveReceipt() {
    if (archiveEmpty) archiveEmpty.style.display = 'none';
    const poem = state.lastPoem;
    const now = new Date();
    const card = document.createElement('div');
    card.className = 'mini-receipt';
    card.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(1) + 'deg');
    card.innerHTML =
      '<div class="mini-verse">' +
      poem.verses.map((v) => '· ' + v).join('<br>') +
      '</div>' +
      '<div class="mini-meta"><span>' + poem.conf.shop + '</span><span>' +
      pad(now.getMonth() + 1) + '.' + pad(now.getDate()) + '</span></div>' +
      '<div class="mini-receipt-tear"></div>';
    archiveRail.appendChild(card);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => card.classList.add('is-landed'));
    });
  }

  // === 事件绑定 ===
  moodGrid.addEventListener('click', (e) => {
    const chip = e.target.closest('.mood-chip');
    if (!chip) return;
    moodGrid.querySelectorAll('.mood-chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.mood = chip.dataset.mood;
    document.body.dataset.mood = state.mood;
    statusLine.textContent = 'MOOD · ' + chip.querySelector('.mood-name').textContent + '已装载';
  });

  lengthRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.len-chip');
    if (!chip) return;
    lengthRow.querySelectorAll('.len-chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.lines = parseInt(chip.dataset.len, 10);
  });

  printBtn.addEventListener('click', () => {
    ensureAudio();
    printReceipt();
  });

  tearLine.addEventListener('click', tearReceipt);

  archiveClear.addEventListener('click', () => {
    archiveRail.querySelectorAll('.mini-receipt').forEach((c) => c.remove());
    if (archiveEmpty) archiveEmpty.style.display = '';
  });

  // === 初始化 ===
  document.querySelector('.mood-chip[data-mood="starry"]').classList.add('is-active');
})();
