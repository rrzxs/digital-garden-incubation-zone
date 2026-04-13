(function attachSeedConfig(globalScope) {
  const RAW_SEEDS = Object.freeze([
    {
      title: '唤醒新的数字生命',
      description: '用户进行种子创造的固定入口，用来与 EDEN 共创并播种新的项目方向。',
      path: '/seed/seeds/incubator/index.html',
      tags: ['Idea', 'AI Co-creation'],
      icon: '🌱',
      status: '灵感收集',
      maintainer: '你 (User)',
      category: 'ai',
      isEntry: true
    },
    {
      title: '小红书封面实验室',
      description: '策略驱动的高级封面生成器。支持概念生成、多模板系统、主题切换、拖拽微调与 SVG/PNG 双导出。',
      path: '/seed/seeds/xhs-cover-studio/index.html',
      tags: ['Creator Tool', 'SVG Export', 'Design System'],
      icon: '🟥',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: '流体加载动画',
      description: '流体模拟驱动的加载动画，可以用鼠标交互扰动流体',
      path: '/seed/seeds/fluid-loader/index.html',
      tags: ['Creative', 'Interactive'],
      icon: '✨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: '回声打字机',
      description: '打字时每个字符都会产生视觉回声和音效，营造沉浸式写作体验',
      path: '/seed/seeds/echo-typing/index.html',
      tags: ['Creative', 'Interactive'],
      icon: '✨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: '磁力光标',
      description: '光标周围的元素会被磁力吸引或排斥，创造有趣的交互体验',
      path: '/seed/seeds/magnetic-cursor/index.html',
      tags: ['Interactive', 'Physics', 'Creative'],
      icon: '🧲',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Magnetic 磁力交互',
      description: '鼠标移动时周围UI元素被磁力吸引或排斥，产生流动视觉效果。支持吸引、排斥、环绕三种模式',
      path: '/seed/seeds/magnetic/index.html',
      tags: ['Interactive', 'Physics', 'Animation'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'OpenClaw AI 界面',
      description: '基于 GLM API 的多角色 AI 对话客户端原型构建及 Prompt 注入测试。',
      path: '/seed/seeds/openclaw/index.html',
      tags: ['React', 'MVP', 'LLM'],
      icon: '🤖',
      status: '开发中',
      maintainer: 'EDEN',
      category: 'ai'
    },
    {
      title: 'Aura 灵韵',
      description: '极致审美的沉浸式呼吸冥想空间，兼具流体网格渐变与微晶玻璃拟物态。体验宁静与专注。',
      path: '/seed/seeds/aura/index.html',
      tags: ['Design', 'Animation', 'Glassmorphism'],
      icon: '🪷',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: '4-7-8 呼吸法',
      description: '经典的深度放松呼吸训练工具。吸气 4 秒 → 屏息 7 秒 → 呼气 8 秒，帮助缓解焦虑、快速入眠。',
      path: '/seed/seeds/breathing-478/index.html',
      tags: ['Wellness', 'Breathing', 'Relaxation'],
      icon: '🌬️',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'Frequency Garden 调频花园',
      description: 'AI 增强型情绪调频工具页。先点选情绪，再写下一句话，获得温柔引导、呼吸节律、场景与环境音的同步疗愈体验。',
      path: '/seed/seeds/frequency-garden/index.html',
      tags: ['Wellness', 'AI Guidance', 'Breathing'],
      icon: '🌙',
      status: '培育中',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'CSS 光影微交互画板',
      description: '纯使用 CSS Variables 与少量 JS 制作的赛博朋克风格交互画板。',
      path: '/seed/seeds/cyber-paint/index.html',
      tags: ['CSS3', 'Design'],
      icon: '🎨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: '代码雨屏保',
      description: 'Matrix 风格的代码雨，但落下的是真实的代码片段，支持自定义语言',
      path: '/seed/seeds/code-rain/index.html',
      tags: ['Creative', 'Interactive', 'Matrix'],
      icon: '🌧️',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: '文字解密',
      description: '文字从乱码逐渐解密成目标文字的动画效果，支持多模式与高阶微交互',
      path: '/seed/seeds/text/index.html',
      tags: ['Animation', 'Interactive', 'Text Effect'],
      icon: '🔐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Fluid 流体',
      description: '基于 Navier-Stokes 方程的交互式流体模拟，支持多配色与物理参数调节',
      path: '/seed/seeds/fluid/index.html',
      tags: ['Simulation', 'Interactive', 'Physics'],
      icon: '💧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Ripple 涟漪',
      description: '点击或触摸产生优雅的波纹扩散效果，支持多配色与参数调节',
      path: '/seed/seeds/ripple/index.html',
      tags: ['Simulation', 'Interactive', 'Animation'],
      icon: '🌊',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glitch 故障艺术',
      description: '赛博朋克风格的故障艺术文字效果，支持5种故障模式与高阶微交互',
      path: '/seed/seeds/glitch/index.html',
      tags: ['Creative', 'Interactive', 'Text Effect'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Gradient Mesh 渐变网格',
      description: '交互式 Mesh 渐变生成器，拖拽节点实时创造美丽渐变，支持预设配色与 CSS/PNG 导出',
      path: '/seed/seeds/gradient/index.html',
      tags: ['Creative', 'Design Tool', 'Gradient'],
      icon: '🌈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Typewriter 打字机',
      description: '复古打字机风格的文本输入体验，包含逐字打印、音效反馈、换行动作与墨迹残留效果',
      path: '/seed/seeds/typewriter/index.html',
      tags: ['Creative', 'Interactive', 'Retro'],
      icon: '⌨️',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Gravity 重力场',
      description: '点击创建引力源，观察粒子在多重力场中的运动轨迹。支持吸引、排斥、环绕三种模式',
      path: '/seed/seeds/gravity/index.html',
      tags: ['Simulation', 'Interactive', 'Physics'],
      icon: '◇',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Focus Pulse 专注脉冲',
      description: '有氛围感的番茄钟计时器。25分钟专注配合5分钟休息，圆环进度动画与脉搏背景营造宁静专注体验。',
      path: '/seed/seeds/focus-pulse/index.html',
      tags: ['Productivity', 'Timer', 'Pomodoro'],
      icon: '⏱',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Screenshot Polisher 截图美化器',
      description: '上传截图后自动生成高级边框、柔和阴影与氛围背景的截图美化工具，支持拖拽、参数调节与导出。',
      path: '/seed/seeds/screenshot-polisher/index.html',
      tags: ['Creator Tool', 'Screenshot', 'Export'],
      icon: '🖼️',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Spin Choice 决策转盘',
      description: '氛围感随机决策转盘。输入选项，旋转转盘，让命运为你做决定。支持拖拽旋转与炫酷结果揭晓动画。',
      path: '/seed/seeds/spin-choice/index.html',
      tags: ['Decision', 'Interactive', 'Fun'],
      icon: '🎡',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Dither Studio 抖动工作室',
      description: '将图片转换为复古抖动艺术风格。支持 6 种经典算法、5 种色板预设、实时预览与 PNG 导出。',
      path: '/seed/seeds/image-dither-studio/index.html',
      tags: ['Image Processing', 'Retro', 'Creative'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Briefing Crossword 填字游戏',
      description: '氛围感填字游戏，支持提示面板、键盘输入与高阶微交互。体验解谜的乐趣。',
      path: '/seed/seeds/briefing-crossword/index.html',
      tags: ['Game', 'Puzzle', 'Interactive'],
      icon: '▣',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Editorial Scroller 编年卷轴',
      description: '沉浸式编辑滚动体验。视差深度、文字揭示、呼吸节奏与交互反馈，讲述流动的故事。',
      path: '/seed/seeds/editorial-scroller/index.html',
      tags: ['Creative', 'Scroll', 'Micro-interaction'],
      icon: '📜',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Dither Lab 抖动实验室',
      description: '实时交互式抖动艺术生成器。6种经典算法、6种色彩模式、参数调节与原图对比滑块，探索像素美学。',
      path: '/seed/seeds/dither-lab/index.html',
      tags: ['Image Processing', 'Creative', 'Interactive'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Motion 韵动',
      description: '高阶微交互体验场。弹簧-阻尼物理模型驱动的卡片动力学、粒子流场与非线性动效，支持双模式交互与4种氛围配色',
      path: '/seed/seeds/motion/index.html',
      tags: ['Interactive', 'Physics', 'Animation', 'Micro-interaction'],
      icon: '⟐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Morphism Lab 形态变异实验室',
      description: '交互式形态变异体验场。噪声扰动驱动的 SVG 形体在球体、星形、晶体间实时变形，弹簧物理拖拽与三种交互模式',
      path: '/seed/seeds/morphism-lab/index.html',
      tags: ['Interactive', 'Morphing', 'Animation', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Page Flow 页流',
      description: '沉浸式页面过渡体验场。流体粒子场 + 微晶玻璃态容器 + 非线性缓动过渡，支持4种氛围配色与多模态导航',
      path: '/seed/seeds/page-flow/index.html',
      tags: ['Interactive', 'Animation', 'Page Transition', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Ripple Canvas 涟漪画布',
      description: '像素级水波物理模拟的交互式涟漪画布。双缓冲波纹传播、光线折射偏移、粒子流场、双交互模式与4种氛围配色',
      path: '/seed/seeds/ripple-canvas/index.html',
      tags: ['Interactive', 'Simulation', 'Animation', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    }
  ]);

  function getOrderedSeeds() {
    const pinned = RAW_SEEDS.filter((item) => item.isEntry);
    const regular = RAW_SEEDS.filter((item) => !item.isEntry);
    return pinned.concat(regular);
  }

  function countPublishedSeeds(seeds) {
    const source = Array.isArray(seeds) ? seeds : getOrderedSeeds();
    return source.filter((item) => !item.isEntry).length;
  }

  globalScope.DigitalGardenSeedConfig = {
    RAW_SEEDS,
    getOrderedSeeds,
    countPublishedSeeds
  };
})(typeof window !== 'undefined' ? window : globalThis);
