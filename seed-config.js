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
      title: 'Scroll Case Flow 滚动案例流',
      description: '沉浸式滚动案例流体验场。垂直滚动实时转译为水平案例流——6张微晶玻璃态案例卡片在粘性舞台流动，速度形变、字符级揭示、多层视差、粒子流场与进度轨道，4种氛围配色',
      path: '/seed/seeds/scroll-case-flow/index.html',
      tags: ['Interactive', 'Scroll', 'Micro-interaction', 'Animation'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Motion Mood Arena 动效情绪竞技场',
      description: '以「情绪 = 运动行为」为核心的粒子竞技场。6 种情绪预设驱动粒子军团变阵（环绕/爆裂/晶格/湍流/沉降/电弧），呼吸式参数插值过渡、点击冲击波、按住引力井、光标避让与全场脉冲，流体渐变背景 + 微晶玻璃态控制台',
      path: '/seed/seeds/motion-mood-arena/index.html',
      tags: ['Interactive', 'Motion', 'Emotion', 'Micro-interaction', 'Canvas'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Emotion Orb 情绪光球',
      description: '沉浸式情绪光球微交互体验。6种情绪预设驱动噪声形变光球实时流变，呼吸节律、环绕粒子、情绪脉冲冲击波与思绪漂移模式，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/emotion-orb/index.html',
      tags: ['Interactive', 'Emotion', 'Micro-interaction', 'Animation'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'Emotion Orb Playground 情绪光球游乐场',
      description: '可拖拽、可戳击、可爆裂重组的情绪光球游乐场。6 种情绪实时流变参数插值、果冻弹簧物理、冲击波粒子与能量滑杆，流体渐变背景 + 微晶玻璃态控制台。',
      path: '/seed/seeds/emotion-orb-playground/index.html',
      tags: ['Interactive', 'Emotion', 'Physics', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
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
    },
    {
      title: 'ChromaSift 色彩筛分器',
      description: '沉浸式渐变配色灵感探索器。通过筛分物理将色彩粒子按色相 / 饱和度 / 明度重新排列，发现配色灵感。',
      path: '/seed/seeds/chromasift/index.html',
      tags: ['Color Tool', 'Interactive', 'Micro-interaction', 'Design'],
      icon: '◐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Glyph Field 字形力场',
      description: '交互式字形力场体验。弹簧物理驱动的字符对鼠标产生吸引、排斥、漩涡响应，4种字符集与氛围配色',
      path: '/seed/seeds/glyph-field/index.html',
      tags: ['Interactive', 'Physics', 'Typography', 'Micro-interaction'],
      icon: '༚',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glyph Proximity 字形邻近',
      description: '邻近性感知驱动的交互式字形力场。力场半径内的字形产生吸引、排斥、环绕、冻结响应，邻近拓扑连接线与弹簧归位物理',
      path: '/seed/seeds/glyph-proximity/index.html',
      tags: ['Interactive', 'Physics', 'Typography', 'Micro-interaction'],
      icon: '⌘',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Photo Meta Lens 照片元数据透镜',
      description: '沉浸式照片 EXIF 元数据透镜。拖拽照片即刻揭示相机型号、镜头、快门、光圈、ISO、GPS 坐标等隐藏信息，RGB 直方图与地图定位',
      path: '/seed/seeds/photo-meta-lens/index.html',
      tags: ['Photo', 'EXIF', 'Tool', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Typo Shift 字形位移',
      description: '沉浸式排版位移交互体验。4种流体位移模式实时驱动字号、字重、字距非线性形变，乱码揭示动画与4种氛围配色',
      path: '/seed/seeds/typo-shift/index.html',
      tags: ['Interactive', 'Typography', 'Animation', 'Micro-interaction'],
      icon: '≍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Morph Curtain 变形幕',
      description: '沉浸式窗帘变形体验。弹簧-阻尼布料物理模拟、三种变形模式（推开/裂开/溶解）、参数调节与4种氛围配色',
      path: '/seed/seeds/morph-curtain/index.html',
      tags: ['Interactive', 'Cloth Simulation', 'Animation', 'Micro-interaction'],
      icon: '帷幕',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'World Ticker 全球脉搏',
      description: '沉浸式世界事件实时脉冲可视化。8类全球互联网事件模拟、双侧滚动Ticker流、粒子流场与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/world-ticker/index.html',
      tags: ['Interactive', 'Data Visualization', 'Animation', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Cinematic Narrative 影像叙事',
      description: '沉浸式电影叙事滚动体验。6幕场景章节、逐字揭示、明暗对照交互、时间节律可视化与蒙太奇文字拼贴，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/cinematic-narrative/index.html',
      tags: ['Interactive', 'Scroll', 'Animation', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Motion Reel 韵动卷轴',
      description: '沉浸式动效展示卷轴。8种高阶微交互（弹簧阻尼、涟漪扩散、形态流变、粒子流场、故障美学、弹性波纹、轨道共振、遮罩揭示），4种氛围配色',
      path: '/seed/seeds/motion-reel/index.html',
      tags: ['Interactive', 'Physics', 'Animation', 'Micro-interaction'],
      icon: '⏴',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Chapter 章节卷轴',
      description: '沉浸式章节卷轴体验。5幕叙事章节、滚动驱动文字揭示、粒子流场、故障文字变形、呼吸节律可视化与4种氛围配色',
      path: '/seed/seeds/scroll-chapter/index.html',
      tags: ['Interactive', 'Scroll', 'Animation', 'Micro-interaction'],
      icon: '◚',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Terrain Walker 地形漫步',
      description: 'Simplex Noise 驱动的交互式 3D 地形生成与漫步体验。多层噪声叠加地形、WASD 行走物理、惯性相机、行走轨迹、4种氛围配色',
      path: '/seed/seeds/terrain-walker/index.html',
      tags: ['Interactive', '3D', 'Procedural', 'Micro-interaction'],
      icon: '⏚',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Distortion 滚动畸变',
      description: '沉浸式滚动畸变体验。滚动速度驱动五种非线性畸变：空间弯曲、形态流变、色散光棱、弹性网格、涟漪波场，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-distortion/index.html',
      tags: ['Interactive', 'Scroll', 'Distortion', 'Micro-interaction'],
      icon: '⋫',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Coordinate Cursor 坐标光标',
      description: '沉浸式非线性坐标空间体验。光标实时扭曲网格空间，三种扰动模式（扭曲/涟漪/磁力），轨迹流、速度向量与点击涟漪，4种氛围配色',
      path: '/seed/seeds/coordinate-cursor/index.html',
      tags: ['Interactive', 'Grid', 'Coordinate', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Crowd Choreography 群舞编排',
      description: '沉浸式群体编排交互体验。Boid 群集算法驱动粒子群落模拟，6种编舞队形（Flock/Spiral/Grid/Wave/Circle/Scatter）+ 脉冲冲击波 + 粒子尾迹，4种氛围配色',
      path: '/seed/seeds/crowd-choreography/index.html',
      tags: ['Interactive', 'Simulation', 'Boid', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Ink Spread Menu 墨韵菜单',
      description: '沉浸式墨韵展开导航菜单。点击画布任意位置墨滴扩散，径向菜单从墨迹中浮现，多层涟漪环 + 不规则墨斑 + 粒子迸射 + 连接线辐射，4种氛围配色',
      path: '/seed/seeds/ink-spread-menu/index.html',
      tags: ['Interactive', 'Menu', 'Animation', 'Micro-interaction'],
      icon: '墨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Crowd Sync Playground 群体同步游乐场',
      description: '沉浸式群体同步交互体验场。Boid 群集物理驱动粒子涌现行为，4种运动模式 + 同步脉冲冲击波 + 光标力场 + 粒子尾迹连接线，4种氛围配色',
      path: '/seed/seeds/crowd-sync-playground/index.html',
      tags: ['Interactive', 'Simulation', 'Boid', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Infinite Canvas 无限画布',
      description: '沉浸式无限画布地图体验。在无尽空间中创建节点、建立连接，构建思想地图。支持拖拽平移、缩放、节点编辑、贝塞尔曲线连接与4种氛围配色',
      path: '/seed/seeds/infinite-canvas-map/index.html',
      tags: ['Interactive', 'Canvas', 'Map', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Keystroke Depth 按键深度',
      description: '沉浸式按键力场体验。击键触发多层涟漪力场、字符粒子迸射、流场偏转与节奏感知，营造击键即创造的沉浸感',
      path: '/seed/seeds/keystroke-depth/index.html',
      tags: ['Interactive', 'Keystroke', 'Micro-interaction', 'Animation'],
      icon: '⌨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Watercolor 水彩秘境',
      description: 'Kuwahara 水彩 NPR 风格 + 鼠标交互 + 环境音效。移动光标即可看到笔触绽放与颜料晕染，营造 ASMR 般的沉浸体验',
      path: '/seed/seeds/watercolor/index.html',
      tags: ['Interactive', 'NPR', 'Watercolor', 'Audio'],
      icon: '🎨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Bill Split 智能分摊',
      description: '智能账单分摊，支持多人多种分摊规则与实时结算预览。拖拽菜品至用餐者头像即可分配，均分/自定义模式混合使用。',
      path: '/seed/seeds/bill-split/index.html',
      tags: ['Tool', 'Bill Split', 'Interactive'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Unit Cascade 级联单元',
      description: '沉浸式级联微交互体验场。点击触发冲击波级联坍缩、力场排斥、波浪起伏，3种模式 × 4种氛围配色，重力弹性碰撞物理模拟',
      path: '/seed/seeds/unit-cascade/index.html',
      tags: ['Interactive', 'Physics', 'Cascade', 'Micro-interaction'],
      icon: '⊞',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'EXIF Insight 照片灵魂透视',
      description: '沉浸式照片 EXIF 元数据查看器。拖入照片即刻揭示相机参数、快门光圈、GPS 坐标、RGB 直方图与主导色彩分析，4种氛围配色',
      path: '/seed/seeds/exif/index.html',
      tags: ['Photo', 'EXIF', 'Tool', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Scene Twilight 暮光剧场',
      description: '沉浸式暮光场景交互体验。多层视差景物、闪烁星空、萤火虫粒子、极光模拟、流星效果与水面涟漪，时间滑块调节氛围，4种配色',
      path: '/seed/seeds/scene-twilight/index.html',
      tags: ['Interactive', 'Scene', 'Animation', 'Micro-interaction'],
      icon: '🌆',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Shader Wipe Transitions 着色擦除',
      description: '沉浸式着色器风格擦除过渡体验。6种 Simplex 噪声场驱动的像素级擦除模式（噪声溶解/涟漪扩散/径向收缩/对角切割/网格裂变/螺旋漩涡），参数调节与4种氛围配色',
      path: '/seed/seeds/shader-wipe-transitions/index.html',
      tags: ['Interactive', 'Transition', 'Animation', 'Micro-interaction'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Fluid Audio 流体音频',
      description: '沉浸式流体音频可视化器。4种可视化模式（频谱柱/波形线/径向谱/粒子场）、4种氛围配色、实时麦克风分析、演示音源、鼠标力场交互',
      path: '/seed/seeds/fluid-audio-visualizer/index.html',
      tags: ['Interactive', 'Audio', 'Visualization', 'Micro-interaction'],
      icon: '♫',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Tile Material 瓷质',
      description: '沉浸式瓦片材质微交互体验场。弹簧-阻尼物理驱动的 3D 透视瓦片网格，4种交互模式（排斥/吸引/波浪/形变）、涟漪脉冲级联、光标轨迹流场，4种氛围配色',
      path: '/seed/seeds/tile-material/index.html',
      tags: ['Interactive', 'Physics', 'Material', 'Micro-interaction'],
      icon: '_mD',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Mascot Stage 吉祥物舞台',
      description: '沉浸式吉祥物角色互动体验场。实时眼球追踪、6种表情切换、弹性物理动效、好感度系统、粒子流场背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/mascot-stage/index.html',
      tags: ['Interactive', 'Character', 'Animation', 'Micro-interaction'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'FlowMap Text 流场文字',
      description: '沉浸式流场文字交互体验。输入文字，观察字符在 Simplex 噪声流场中流动旋转，鼠标力场扰动，4种流场模式 × 3种力场交互 × 4种氛围配色',
      path: '/seed/seeds/flowmap-text/index.html',
      tags: ['Interactive', 'Flow Field', 'Typography', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Liquid Dial 液态刻度',
      description: '沉浸式液态刻度盘交互体验。拖拽表盘设置数值，流体粒子流场环绕，4种刻度模式（强度/频率/温度/速度）× 4种氛围配色，脉冲冲击波涟漪',
      path: '/seed/seeds/liquid-dial/index.html',
      tags: ['Interactive', 'Dial', 'Particle', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Habit Terrarium 习惯生态瓶',
      description: '沉浸式习惯追踪器。将日常习惯可视化为玻璃生态瓶中生长的植物，4种植物类型、生长等级、连续天数追踪，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/habit-terrarium/index.html',
      tags: ['Productivity', 'Habit Tracker', 'Micro-interaction', 'Plant Growth'],
      icon: '&#x1F331;',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Clip Wipe Lab 裁切擦除实验室',
      description: '沉浸式 CSS clip-path 裁切擦除交互实验场。7种擦除模式（圆形/菱形/多边形/星形/波浪/螺旋/百叶窗）、实时参数调节、3种交互模式与4种氛围配色',
      path: '/seed/seeds/clip-wipe-lab/index.html',
      tags: ['Interactive', 'CSS', 'clip-path', 'Micro-interaction'],
      icon: '◹',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Storyboard 分镜卷轴',
      description: '沉浸式分镜叙事卷轴。7幕故事分镜、滚动驱动场景转换、手绘线框美学、视差深度与粒子流场，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-storyboard/index.html',
      tags: ['Interactive', 'Scroll', 'Storyboard', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Voice To 声波凝形',
      description: '沉浸式语音转文字交互体验。言语化为流体波形，文字从声波中浮现。Web Speech API + Canvas 波形可视化 + 粒子流场，4种氛围配色',
      path: '/seed/seeds/voice-to/index.html',
      tags: ['Interactive', 'Voice', 'Visualization', 'Micro-interaction'],
      icon: '🎙',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Brand Morph Timeline 品牌形变时间线',
      description: '沉浸式品牌形变时间线体验。7个品牌纪元、时间轴驱动色彩字体形态流变、4种形态模式（光棱/球体/晶体/波场）、可拖拽时间轴、粒子流场与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/brand-morph-timeline/index.html',
      tags: ['Interactive', 'Timeline', 'Animation', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scramble Reveal 解密揭示',
      description: '沉浸式文字乱码揭示交互体验。5种揭示模式（级联/波浪/漩涡/故障/量子）× 4种氛围配色，粒子流场、幽灵字符飘浮与微晶玻璃态容器',
      path: '/seed/seeds/scramble-reveal/index.html',
      tags: ['Interactive', 'Text Effect', 'Animation', 'Micro-interaction'],
      icon: '⟐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Retro Term 复古终端',
      description: '沉浸式复古终端模拟体验。CRT 扫描线 + 流体渐变背景 + 微晶玻璃态容器，16 种内置命令、4 种配色、Web Audio 音效反馈与开机启动序列动画',
      path: '/seed/seeds/retro-term/index.html',
      tags: ['Interactive', 'Terminal', 'Retro', 'Micro-interaction'],
      icon: '⌨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Flow Canvas 流体画布',
      description: '沉浸式流体画布交互体验。Simplex 噪声流场驱动的粒子绘画系统，4种流场模式 × 5种画笔风格 × 3种力场交互 × 4种氛围配色，脉冲冲击波与参数调节',
      path: '/seed/seeds/flow-canvas/index.html',
      tags: ['Interactive', 'Flow Field', 'Painting', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Typo Morph 字形流变',
      description: '沉浸式字形流变交互体验。5种变形场（弹性/晶格/漩涡/脉动/碎裂）实时驱动字符非线性形变，光标力场、爆炸脉冲、乱码揭示动画与粒子流场，4种氛围配色',
      path: '/seed/seeds/typo-morph/index.html',
      tags: ['Interactive', 'Typography', 'Morphing', 'Micro-interaction'],
      icon: '≍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Color Story Scroller 色彩叙事卷轴',
      description: '沉浸式色彩叙事卷轴体验。7幕色彩章节讲述可见光光谱的故事，滚动驱动色彩蜕变、光谱进度条、色板交互、色相环动画、粒子花园、深度可视化与全谱揭示，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/color-story-scroller/index.html',
      tags: ['Interactive', 'Scroll', 'Color', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Scene Slice Transition 场景切片过渡',
      description: '沉浸式场景切片过渡体验。6种切片模式（垂直/水平/对角/涟漪/旋转/网格）、交错延迟弹性动效、粒子流场、微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scene-slice-transition/index.html',
      tags: ['Interactive', 'Transition', 'Animation', 'Micro-interaction'],
      icon: '⊞',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Cinema Scroller 影院卷轴',
      description: '沉浸式影院卷轴滚动体验。6幕场景章节、胶片齿孔边栏、影片倒计时、逐字揭示、滚动谷物感、光标追踪光晕与粒子流场，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/cinema-scroller/index.html',
      tags: ['Interactive', 'Scroll', 'Cinema', 'Micro-interaction'],
      icon: '⊪',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Raindrop Reveal 雨滴揭示',
      description: '沉浸式雨滴揭示交互体验。Simplex 噪声迷雾画布，3种交互模式（绘制/降雨/涟漪）揭示隐藏内容，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/raindrop-reveal/index.html',
      tags: ['Interactive', 'Reveal', 'Animation', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Keyboard Scavenger 键盘拾荒者',
      description: '沉浸式键盘寻宝体验。漂浮字母在空间中飘动，快速击键捕获拼出目标单词。5关递进难度、Combo连击系统、涟漪粒子与键盘高亮提示，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/keyboard-scavenger/index.html',
      tags: ['Interactive', 'Keyboard', 'Game', 'Micro-interaction'],
      icon: '⌨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Keyflow Navigator 键流导航',
      description: '沉浸式键盘驱动空间导航体验。WASD/方向键在互联节点间游走，脉冲冲击波、粒子流场、Combo连击系统与键轨追踪，4种氛围配色',
      path: '/seed/seeds/keyflow-navigator/index.html',
      tags: ['Interactive', 'Keyboard', 'Navigation', 'Micro-interaction'],
      icon: '⌘',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Gravity Drop Trail 引力坠迹',
      description: '沉浸式重力粒子轨迹体验场。点击创建引力源，观察粒子在重力场中坠落并留下流体轨迹。4种发射模式 × 可拖拽引力源 × 4种氛围配色',
      path: '/seed/seeds/gravity-drop-trail/index.html',
      tags: ['Interactive', 'Physics', 'Particle', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Comfort Space 舒适空间',
      description: '沉浸式情绪安抚微交互。6种情绪选择、3种呼吸模式、15条能量语句、Web Audio 环境声场、4种氛围配色、粒子流场与微晶玻璃态容器',
      path: '/seed/seeds/comfort-space/index.html',
      tags: ['Wellness', 'Breathing', 'Audio', 'Micro-interaction'],
      icon: '🌤',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'Scroll 滚动之境',
      description: '沉浸式滚动微交互体验场。视差深度层、弹性物理卡片、滚动驱动形变、揭示消隐动画、粒子流场与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scroll/index.html',
      tags: ['Interactive', 'Scroll', 'Animation', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Emotion Terrain 情绪地形',
      description: '沉浸式情绪地形交互体验。6种情绪预设驱动 Simplex 噪声地形实时流变，鼠标力场扰动、粒子流场、情绪脉冲冲击波，4种氛围配色',
      path: '/seed/seeds/emotion-terrain/index.html',
      tags: ['Interactive', 'Emotion', 'Terrain', 'Micro-interaction'],
      icon: '◺',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Journey Map Animator 旅途地图',
      description: '沉浸式旅途地图动画体验。Catmull-Rom 样条曲线路径、6个故事站点、旅行者轨迹绘制、粒子流场与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/journey-map-animator/index.html',
      tags: ['Interactive', 'Animation', 'Journey', 'Micro-interaction'],
      icon: '🗺',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Comfort Space Builder 舒适空间构建器',
      description: '沉浸式舒适空间构建体验。拖拽布置8种舒适元素、4种氛围基调、Web Audio 环境声场、呼吸引导与能量语句，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/comfort-space-builder/index.html',
      tags: ['Wellness', 'Interactive', 'Builder', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'Dark Pattern Exposer 暗黑模式揭露器',
      description: '沉浸式暗黑模式交互识别工具。6大场景覆盖24种暗黑设计模式（隐藏费用、确认羞耻、虚假紧迫感、隐私诱导等），3种交互模式 × 4种氛围配色，粒子流场 + 微晶玻璃态容器',
      path: '/seed/seeds/dark-pattern-exposer/index.html',
      tags: ['Interactive', 'Education', 'Dark Pattern', 'Micro-interaction'],
      icon: '⚠',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'MotionPath Gallery 运动轨迹画廊',
      description: '沉浸式运动轨迹画廊。8种数学运动路径（轨道/无限/螺旋/波浪/利萨如/玫瑰线/内旋轮线/噪声场）以微晶玻璃态卡片呈现，弹簧物理轨迹绘制、粒子流场、曲线连接线与4种氛围配色',
      path: '/seed/seeds/motionpath-gallery/index.html',
      tags: ['Interactive', 'Motion Path', 'Animation', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Infinity Parallax Loop 无限视差循环',
      description: '沉浸式无限视差循环视觉体验。7层视差深度层响应鼠标位移，粒子流场、轨道运动、脉冲冲击波与流体渐变背景，营造无限纵深的宇宙级视觉空间。4种氛围配色',
      path: '/seed/seeds/infinity-parallax-loop/index.html',
      tags: ['Interactive', 'Parallax', 'Animation', 'Micro-interaction'],
      icon: '∞',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'MotionPath Gallery Fold 折叠画廊',
      description: '沉浸式折叠画廊交互体验。8种数学运动路径以3D透视折叠卡片呈现，弹簧-阻尼物理驱动的折叠/展开动效，3种折叠模式（扇形/级联/螺旋）× 4种氛围配色，粒子流场与脉冲冲击波',
      path: '/seed/seeds/motionpath-gallery-fold/index.html',
      tags: ['Interactive', 'Motion Path', '3D Fold', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'ScreenFrame 屏幕框架',
      description: '沉浸式屏幕框架微交互体验。3D透视响应鼠标的显示器框架，3种交互模式（悬浮/轨道/故障）× 4种氛围配色，粒子流场、脉冲冲击波与流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/screenframe/index.html',
      tags: ['Interactive', '3D', 'Screen Frame', 'Micro-interaction'],
      icon: '◰',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Depth Feed Reveal 深度流揭示',
      description: '沉浸式深度信息流揭示交互体验。内容卡片在深度层次间浮现与隐没，模拟深海潜水般的渐进式内容发现，3种揭示模式 × 4种氛围配色，粒子流场 + 微晶玻璃态容器',
      path: '/seed/seeds/depth-feed-reveal/index.html',
      tags: ['Interactive', 'Scroll', 'Reveal', 'Micro-interaction'],
      icon: '⊘',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Text Pivot Scaler 文字枢纽缩放',
      description: '沉浸式文字枢纽缩放交互体验。光标作为枢纽驱动字符缩放旋转，4种力场模式（缩放/轨道/波浪/爆炸）、乱码揭示、脉冲冲击波、弹簧物理归位，4种氛围配色',
      path: '/seed/seeds/text-pivot-scaler/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: '⋊',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Paint Reveal Hover 涂料揭示',
      description: '沉浸式涂料揭示悬停交互体验。悬停并按下鼠标，色彩刷笔擦除迷雾揭示隐藏内容画廊，4种涂料风格 × 可调刷宽 × 粒子飞溅，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/paint-reveal-hover/index.html',
      tags: ['Interactive', 'Paint', 'Reveal', 'Micro-interaction'],
      icon: '🖌',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Stitcher 卷轴织纹',
      description: '沉浸式滚动织纹体验。将滚动隐喻为穿针引线，Simplex 噪声驱动的丝线实时缝合5幕章节、纬线网格脉冲、经线结环共振、3种丝线质感切换，针脚计数与张力可视化，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-stitcher/index.html',
      tags: ['Interactive', 'Scroll', 'Stitch', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Postcard Feedback 明信片回声',
      description: '沉浸式明信片反馈体验。手写墨迹实时同步至 3D 明信片、邮戳盖印弹性压印、翻面飞离投递、关键词词库驱动的情绪环共鸣分析与投递箱陈列，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/postcard-feedback/index.html',
      tags: ['Interactive', 'Feedback', 'Micro-interaction', '3D'],
      icon: '✉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Stamp Loupe 邮政透镜',
      description: '沉浸式邮票放大镜体验。光标移动唤起透镜实时放大邮票微晶细节，4种透镜模式（标准/紫外/偏振/热感）显隐水印与纤维，6枚限量邮集、可调缩放、3D翻转与图鉴收藏，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/stamp-loupe/index.html',
      tags: ['Interactive', 'Stamp', 'Magnifier', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Sky Archive 天空档案',
      description: '沉浸式天空档案体验。拖拽时间刻度让天空在24小时间呼吸（黎明/正午/黄昏/午夜），点击天空记录流星、候鸟群、积雨云等5种现象为档案条目，AUTO昼夜循环、星群闪烁、云朵漂移与粒子流场，4种氛围配色',
      path: '/seed/seeds/sky-archive/index.html',
      tags: ['Interactive', 'Sky', 'Archive', 'Micro-interaction'],
       icon: '☁',
       status: '已发布',
       maintainer: 'EDEN',
       category: 'visual'
    },
    {
      title: 'Font Specimen Lens 字体样张透镜',
      description: '沉浸式字体样张检视工具。弹簧物理驱动的放大透镜跟随光标检视字形，3种透镜模式（放大/度量/蓝图）、可变字重字距调节、字形度量参考线与字符乱码重构，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/font-specimen-lens/index.html',
      tags: ['Interactive', 'Typography', 'Micro-interaction', 'Lens'],
      icon: '⌖',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Font Glyph Playground 字形游乐场',
      description: '沉浸式字体字形形变实验场。实时操控字重、字宽、字距、斜度、字号五大字体坐标轴，配合 5 种动画预设（呼吸/抖动/波浪/弹跳/静止）与涂抹扰动模式，弹簧-阻尼物理驱动的字符动力学，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/font-glyph-playground/index.html',
      tags: ['Interactive', 'Typography', 'Micro-interaction', 'Animation'],
      icon: '✎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Scroll 3D Rotate 滚动三维旋转',
      description: '沉浸式滚动三维旋转体验。滚动驱动的六种 3D 旋转模式（倾斜/翻转/翻滚/轨道/螺旋/立方体），透视景深、粒子流场、实时旋转角度 HUD 与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scroll3d-rotate/index.html',
      tags: ['Interactive', 'Scroll', '3D Rotation', 'Micro-interaction'],
      icon: '⬡',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Cognitive Load Scoring 认知负荷计分仪',
      description: '沉浸式六维认知负荷评估工具。拖动维度滑块实时重算加权综合分，呼吸态负荷核心 + 雷达拓扑 + 首要瓶颈维度优化建议，5 个预设场景与 4 种氛围配色',
      path: '/seed/seeds/cognitive-load-scoring/index.html',
      tags: ['Interactive', 'Assessment', 'Data Visualization', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Team Hover Reveal 悬浮揭示',
      description: '沉浸式团队成员悬浮揭示体验。光标进入卡片即刻展开生平、技能光谱与签名引语，3D 倾斜物理 + 错峰揭示动画 + 光标跟随光晕，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/team-hover-reveal/index.html',
      tags: ['Interactive', 'Team', 'Hover Reveal', 'Micro-interaction'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Robotics Signal Scope 信号示波器',
      description: '沉浸式机器人信号示波器。四种可视化模式（示波器/频谱/雷达/遥测）、6种波形发生器、4通道管理、实时参数调制与系统监控，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/robotics-signal-scope/index.html',
      tags: ['Interactive', 'Robotics', 'Signal', 'Micro-interaction'],
      icon: '∿',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Hover Team Grid 星阵团队网格',
      description: '沉浸式团队网格悬浮微交互。光标进入单元即刻聚焦膨胀揭示肖像、技能光环与签名引语，邻近单元退入深空。flex-grow 聚焦物理 + 3D 倾斜 + 错峰揭示，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/hover-team-grid/index.html',
      tags: ['Interactive', 'Team Grid', 'Hover Reveal', 'Micro-interaction'],
      icon: '⊞',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Cube Portfolio 立方作品集',
      description: '沉浸式 3D 立方体作品集。六个面承载六个项目，拖拽旋转、惯性物理、弹簧归位与鼠标视差，点击面导航直接旋转聚焦，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/cube-portfolio/index.html',
      tags: ['Interactive', '3D', 'Portfolio', 'Micro-interaction'],
      icon: '⬢',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Motion Card Flip 韵动翻转',
      description: '沉浸式卡片翻转微交互体验场。弹簧-阻尼物理驱动的非线性 3D 翻转、三轴翻转（纵向/横向/对角折叠）、鼠标视差倾斜、粒子流场与翻转脉冲冲击波，4种氛围配色',
      path: '/seed/seeds/motion-card-flip/index.html',
      tags: ['Interactive', 'Card Flip', 'Physics', 'Micro-interaction'],
      icon: '⟳',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Motion Resume 韵动履历',
      description: '沉浸式高阶微交互履历体验。流体粒子场 + 滚动进度轨 + 字符揭示 + 磁力按钮 + 3D 倾斜卡片 + 技能星座 + 编年时间线，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/motion-resume/index.html',
      tags: ['Interactive', 'Resume', 'Scroll', 'Micro-interaction'],
      icon: '✦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Dot Grid Scene 点阵场景',
      description: '沉浸式弹簧物理驱动的点阵力场微交互体验。4种力场模式（排斥/吸引/漩涡/波场）、冲击波涟漪级联、邻近连接线、环境粒子流场、十字准星与实时力场遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/dot-grid-scene/index.html',
      tags: ['Interactive', 'Physics', 'Grid', 'Micro-interaction'],
      icon: ' ⊙',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Logo Context Menu 徽标语境菜单',
      description: '沉浸式徽标语境菜单微交互体验。右键/长按唤起径向语境菜单，6种徽标形变（球体/晶片/绽放/波环/星辰/虚空）、SVG path 实时形变、多层涟漪环、连接线辐射、粒子流场冲击波与 HUD 状态面板，4种氛围配色',
      path: '/seed/seeds/logo-context-menu/index.html',
      tags: ['Interactive', 'Logo', 'Context Menu', 'Micro-interaction'],
      icon: '⏣',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Rhythm Runner 韵律奔跑',
      description: '沉浸式节律微交互体验场。光球沿轨道飞驰，节拍节点滑入判定环，Perfect/Good/Miss 三级判定、连击倍率与能量系统，流体渐变背景 + 微晶玻璃态 HUD，4种氛围配色',
      path: '/seed/seeds/rhythm-runner/index.html',
      tags: ['Interactive', 'Rhythm', 'Game', 'Micro-interaction'],
      icon: '↯',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Motion Infographic 动效信息图',
      description: '沉浸式数据脉动信息图。流体粒子流场驱动的指标卡数字递增、环形贡献星图、脉冲柱阵与事件时间线，双交互模式（悬浮/轨道）× 4种氛围配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/motion-infographic/index.html',
      tags: ['Interactive', 'Data Visualization', 'Animation', 'Micro-interaction'],
      icon: '⟐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Pixel Char Splitter 像素字符裂解器',
      description: '沉浸式像素字符裂解实验室。文字采样为像素场，弹簧-阻尼物理驱动的5种裂解模式（散布/轨道/波浪/碎裂/溶解）实时解构与重组字符，光标力场扰动、脉冲冲击波与粒子流场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/pixel-char-splitter/index.html',
      tags: ['Interactive', 'Pixel', 'Physics', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Data Center Tour 数据中心漫游',
      description: '沉浸式等距数据中心漫游体验。3D 等距机架场 + 实时遥测面板（CPU/内存/PUE）+ 四种视图模式（总览/机架/热力/网络），机架点击聚焦 24U 单元详情，三层楼栋切换，粒子流场背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/data-center-tour/index.html',
      tags: ['Interactive', '3D Isometric', 'Telemetry', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Shelf 灵感书架',
      description: '沉浸式 3D 灵感书架。书脊透视视差、拖拽惯性平移、悬停抽出、点击展开微晶玻璃详情面板，弹簧物理与粒子流场，4种氛围配色',
      path: '/seed/seeds/shelf/index.html',
      tags: ['Interactive', '3D', 'Shelf', 'Micro-interaction'],
      icon: '▤',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Data Center Builder 数据中心构建器',
      description: '沉浸式数据中心布局构建器。拖拽机架、服务器、冷却、电源、交换机、存储到 12×8 网格平面图，实时计算 PUE 能效、供电平衡与散热指标，预设/随机布局、粒子流场背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/data-center-builder/index.html',
      tags: ['Interactive', 'Builder', 'Data Center', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Unit Convert 3D 三维单位转换器',
      description: '沉浸式三维单位转换器。3D 翻牌切换源/目标单位，类别轨道探索长度/质量/温度/时间/数据/速度六大量纲域共 40+ 单位，精确函数转换引擎、数字滚动动画、粒子流场背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/unit-convert-3d/index.html',
      tags: ['Interactive', '3D', 'Converter', 'Micro-interaction'],
      icon: '⬡',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Page Transition Studio 页面过渡实验室',
      description: '沉浸式页面过渡动效剧场。6 种电影级过渡模式（液态形变/裁切揭示/尺度纵深/故障溶解/幕帘裂分/轨道流转）实时切换预览，5 幕叙事内容、流体粒子场、专属缓动曲线 HUD，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/page-transition-studio/index.html',
      tags: ['Interactive', 'Transition', 'Animation', 'Micro-interaction'],
      icon: '↬',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Overlay Nav 叠层导航',
      description: '沉浸式叠层导航微交互。四种流体展开模式（液态形变/径向绽放/幕帘裂分/故障切片）驱动全屏覆盖式导航，弹簧-阻尼菜单动力学、错峰入场、冲击波涟漪与粒子流场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/overlay-nav/index.html',
      tags: ['Interactive', 'Navigation', 'Animation', 'Micro-interaction'],
      icon: '⊞',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Cinema 滚动影院',
      description: '沉浸式滚动影院体验。7 幕场景（光圈/运镜/调色/蒙太奇/配乐）由滚动轮驱动放映，光圈联动、轨道运镜、调色滑块、蒙太奇碰撞、配乐波形，信箱遮幅 + 颗粒噪点 + 自定义光标透镜 + 4种氛围配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-cinema/index.html',
      tags: ['Interactive', 'Scroll', 'Cinema', 'Micro-interaction'],
      icon: '⋪',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Gift Finder Quiz 礼物寻觅器',
      description: '沉浸式礼物推荐问答体验。六步温柔问答（收礼者/年纪/气质/场合/预算/心意）驱动标签匹配引擎，从 16 件候选礼物中加权评分输出 Top 推荐，终端式分析日志序列、氛围配色随进度动态迁移、结果卡片含契合度/心意指数/惊喜度与推荐理由，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/gift-finder-quiz/index.html',
      tags: ['Interactive', 'Quiz', 'Recommendation', 'Micro-interaction'],
      icon: '🎁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Catalog 策展陈列室',
      description: '沉浸式策展产品陈列室。磁吸标签筛选、3D 倾斜卡片物理、光泽跟随、展开式详情覆盖层与粒子流场，12 件器物 × 4 个分类，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/catalog/index.html',
      tags: ['Interactive', 'Catalog', '3D Tilt', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Fogworld 雾境',
      description: '沉浸式雾境探索体验。Simplex 噪声驱动流体雾场，移动光标拨开迷雾揭示隐藏发光节点，罗盘导航、粒子流场、实时遥测与参数调节，4种氛围配色',
      path: '/seed/seeds/fogworld/index.html',
      tags: ['Interactive', 'Fog', 'Exploration', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Wave Cube Grid 波态立方阵列',
      description: '沉浸式3D波纹立方体微交互体验场。弹簧-阻尼物理驱动的3D透视立方体网格，5种力场模式（涟漪/波浪/漩涡/脉冲/自动）、点击涟漪环传播、粒子轨迹流与HUD遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/wave-cube-grid/index.html',
      tags: ['Interactive', '3D', 'Physics', 'Micro-interaction'],
      icon: '▣',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Moon Phase Orbit 月相轨道',
      description: '沉浸式天体律动体验。基于真实天文算法的月相计算，月球沿轨道环绕中心天体，clip-path 实时渲染月相明暗面，拖拽月球调节月相，8 个标准月相节点跳转，日期选择与速度控制，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/moon-phase-orbit/index.html',
      tags: ['Interactive', 'Astronomy', 'Animation', 'Micro-interaction'],
      icon: '☾',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Material Morph Canvas 材质形变画布',
      description: '沉浸式材质形变交互体验场。弹簧-阻尼物理驱动的顶点网格在五种材质形态（液态/玻璃/晶体/等离子/织物）间实时形变，光标力场扰动、点击冲击波涟漪、粒子流场与参数调节，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/material-morph-canvas/index.html',
      tags: ['Interactive', 'Physics', 'Morphing', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Comic 滚动漫画',
      description: '沉浸式滚动漫画叙事体验。7幕科幻故事分镜随滚动逐一展开，纯 CSS 艺术场景（信号塔脉冲/巨眼觉醒/深渊隧道/实体碎片/抉择双球/螺旋融合）、逐字对话揭示、视差深度层与粒子流场，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-comic/index.html',
      tags: ['Interactive', 'Scroll', 'Comic', 'Micro-interaction'],
      icon: '◧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Blender Camera Gallery 景别画廊',
      description: '沉浸式相机景别画廊。模拟 Blender 视口的镜头切换体验——六组相机角度在 3D 轨道上飞行，拖拽旋转视角、点击聚焦景别、景深参数联动，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/blender-camera-gallery/index.html',
      tags: ['Interactive', '3D', 'Camera', 'Micro-interaction'],
      icon: '◷',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Sky Gradient Clock 天空渐变时钟',
      description: '沉浸式天空渐变时钟体验。时间驱动流体渐变背景在四态（黎明/正午/黄昏/深夜）间呼吸流转，太阳/月亮沿天体抛物线轨道运行、12 小时发光进度环、轨道指针、可拖拽日轨时间轴与星空闪烁，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/sky-gradient-clock/index.html',
      tags: ['Interactive', 'Clock', 'Sky Gradient', 'Micro-interaction'],
      icon: '⚈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Interactive Narrative 回声残响',
      description: '沉浸式分支交互叙事体验。选择驱动的非线性故事图（9 节点 + 2 结局），五种 mood 实时调色板形变（dormant/stirring/descent/remembered/transcend）、打字机标题、段落级联揭示、鼠标感应选择卡、SVG 路径星图与粒子流场，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/interactive-narrative/index.html',
      tags: ['Interactive', 'Narrative', 'Branching', 'Micro-interaction'],
      icon: '◐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Demo Activator 唤醒之触',
      description: '沉浸式高阶微交互剧场。中央长按蓄能唤醒体 + 6 大交互模块（脉冲蓄能/磁力漂移/弹簧拖拽/模板揭示/流体轨迹/级联迸发），弹簧-阻尼物理、SVG 蓄能环、CSS mask 遮罩、Canvas 流场粒子与级联点亮，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/demo-activator/index.html',
      tags: ['Interactive', 'Micro-interaction', 'Physics', 'Animation'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glitch Pulse Mixer 故障脉冲合成器',
      description: '沉浸式故障脉冲视觉合成器。拖拽脉冲节点跨故障画布实时混合色差、扫描线与 datamosh 数据损毁，BPM 心跳节律同步视觉脉冲，点击波形热点触发微故障瓦解重建，可选 Web Audio 底鼓节拍，4种氛围配色',
      path: '/seed/seeds/glitch-pulse-mixer/index.html',
      tags: ['Interactive', 'Glitch', 'Audio', 'Micro-interaction'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'AR Art Placer 空间策展',
      description: '沉浸式空间策展体验。从展藏架拖出雕塑/装置/灯具放入透视画廊空间，实时投影、悬浮弹簧物理与光源角度联动，8 件预设展品 × 网格吸附/自由放置双模式 × 随机布局，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/ar-art-placer/index.html',
      tags: ['Interactive', 'AR', 'Spatial', 'Micro-interaction'],
      icon: '⦿',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Cursor Grit 光标砂砾',
      description: '沉浸式光标砂砾微交互物理场。弹簧-阻尼物理驱动的砂砾粒子对光标产生挖掘、扫动、漩涡与静电四种响应，粒子堆积回弹、刀切裂沟、漩涡引力、环形冲击波涟漪与参数调节，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/cursor-grit/index.html',
      tags: ['Interactive', 'Physics', 'Particle', 'Micro-interaction'],
      icon: '⊛',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Dragonfly Hover Trail 蜻蜓悬停轨迹',
      description: '沉浸式蜻蜓悬停轨迹微交互体验。弹簧-阻尼物理驱动的蜻蜓群追随光标悬停飞舞，留下流体光痕轨迹，4种飞行模式（追随/环绕/编队/散逸）、脉冲冲击波、漂浮花粉粒子流场与微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/dragonfly-hover-trail/index.html',
      tags: ['Interactive', 'Physics', 'Particle', 'Micro-interaction'],
      icon: '☙',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glitch Lab 故障实验室',
      description: '沉浸式故障艺术实验室。输入文字实时探索五种故障模式（RGB色差/数据损毁/扫描线撕裂/像素排序/乱码揭示），光标扰动色差方向、脉冲冲击波、粒子流场与参数调节，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/glitch-lab/index.html',
      tags: ['Interactive', 'Glitch', 'Text Effect', 'Micro-interaction'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glitch Shader 故障着色器',
      description: '沉浸式 WebGL 故障着色器体验场。GPU 片元着色器实时驱动六种故障模式（色差/损毁/扫描/像素/波纹/风暴），输入文字即刻化为故障艺术，光标扰动色差方向、脉冲冲击波触发数据崩塌、PNG 截图导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/glitch-shader/index.html',
      tags: ['Interactive', 'WebGL', 'Glitch', 'Micro-interaction'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Narrative Slice Studio 叙事切片工作室',
      description: '沉浸式叙事切片工作室。将微小说切片为可悬停、可激活、可重组的时间轴卡片，4 个故事调色板（灯塔/花园/远航/回声）、播放序列、洗牌重组、逐字揭示与微晶玻璃态容器，流体渐变背景 + 非线性动效',
      path: '/seed/seeds/narrative-slice-studio/index.html',
      tags: ['Interactive', 'Narrative', 'Micro-interaction', 'Animation'],
      icon: '◧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Contrast Checker 对比度透视',
      description: '沉浸式 WCAG 色彩对比度检查器。RGB+Alpha 四通道调谐、四级 WCAG 徽章实时判定、12 套灵感调色板、历史记录与随机配色，粒子流场背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/contrast-checker/index.html',
      tags: ['Interactive', 'Accessibility', 'WCAG', 'Color', 'Micro-interaction'],
      icon: '◐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Scroll Choreography 滚动编舞',
      description: '沉浸式滚动编舞体验场。滚动化身指挥棒驱动七幕微交互演出——视差深度层、字符级联揭示、3D 倾斜卡片、脉冲网格、线性时间轴与粒子流场，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/scroll-choreography/index.html',
      tags: ['Interactive', 'Scroll', 'Animation', 'Micro-interaction'],
      icon: '♪',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Merge City 融城',
      description: '沉浸式建筑融合城市建设体验场。在 6×6 微晶玻璃网格上放置建筑，相同等级相邻建筑自动级联融合升级——从帐篷一路筑成大都市。12 种建筑、粒子迸射、冲击波环与弹簧物理动效，4 种氛围配色',
      path: '/seed/seeds/merge-city/index.html',
      tags: ['Interactive', 'Merge', 'City Builder', 'Micro-interaction'],
      icon: '⌂',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Typeface Playground 排版铸造实验室',
      description: '沉浸式字体排版游乐场。实时操控字重、字宽、斜度、光学尺寸、字距与行高，拖拽字距张力球精修字符对间距，磁力悬停与力场扰动、基线律动网格、渐变描色与描边光泽纹理，参数实时编译为可复制 CSS，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4 种氛围配色',
      path: '/seed/seeds/typeface-playground/index.html',
      tags: ['Interactive', 'Typography', 'Micro-interaction', 'CSS Export'],
      icon: 'Aa',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Motion Type Lab 动效字体实验室',
      description: '沉浸式动效字体微交互体验。邻近力场 + 弹簧-阻尼物理驱动字符实时呼吸：字距脉冲、字重波纹、景深模糊、轨道倾斜与乱码揭示五种模式，冲击波脉冲、粒子流场与字符遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/motion-type-lab/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: 'Ṁ',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Mission Timeline 任务时间线',
      description: '沉浸式任务时间线体验。3套任务集 × 6个递进里程碑、可拖拽时间轴、SVG渐变进度环呼吸、微晶玻璃态里程碑卡片网格、动态节点追加与非线性动效，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/mission-timeline/index.html',
      tags: ['Interactive', 'Timeline', 'Animation', 'Micro-interaction'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Parallax Flip 视差翻转',
      description: '沉浸式滚动视差翻转微交互体验。滚动驱动五幕章节（深度视差/翻转画廊/叙事揭示/堆叠覆盖/终幕统计），弹簧-阻尼物理驱动的非线性 3D 卡片翻转、多层视差深度、逐字逐词揭示与粒子流场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scroll-parallax-flip/index.html',
      tags: ['Interactive', 'Scroll', 'Parallax', 'Micro-interaction'],
      icon: '⇅',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Motion Timeline Craft 动效时间线',
      description: '沉浸式关键帧编排工具。在微晶玻璃态时间线上拖拽关键帧、切换8种非线性缓动曲线、实时预览7种动画属性复合动效并一键导出 CSS，8 套预设编排、可擦洗播放头、4档速度与遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/motion-timeline-craft/index.html',
      tags: ['Interactive', 'Timeline', 'Keyframe', 'Micro-interaction', 'CSS Export'],
      icon: '⌁',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Editorial Scroll Story 编年卷轴故事',
      description: '沉浸式编辑式滚动故事体验。一篇关于「留白」的杂志体卷轴 — 6 幕叙事章节、逐字字符揭示、视差深度舞台、呼吸节奏、涟漪回声与4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/editorial-scroll-story/index.html',
      tags: ['Interactive', 'Scroll', 'Narrative', 'Micro-interaction'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Type Showcase 字体剧场',
      description: '沉浸式字体剧场。邻近力场驱动的排版表演空间 — 5 种字样展品（展示/正文/等宽/巨型字符/字重光谱）× 4 种表演模式（波浪/邻近/轨道/故障），Simplex 噪声粒子流场、乱码揭示动画、点击涟漪冲击波与遥测面板，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/type-showcase/index.html',
      tags: ['Interactive', 'Typography', 'Micro-interaction', 'Animation'],
      icon: 'Aa',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Print Web Bridge 印物桥',
      description: '沉浸式屏幕与纸面桥接工作台。@page 参数工作台、双视口实时同步预览（屏幕态 ↔ 纸面态）、墨色映射、桥接粒子流、打印 CSS 一键导出与系统打印唤起，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/print-web-bridge/index.html',
      tags: ['Interactive', 'Print', 'CSS Export', 'Micro-interaction'],
      icon: '⎙',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Nocturne 候补名单',
      description: '沉浸式候补名单发布页。流体渐变背景 + 微晶玻璃态容器 + 非线性动效，粒子流场、磁性按钮、逐字揭示、倒计时、3D 倾斜卡片、证言轮播、多步注册表单与成功彩纸庆祝，11 个高阶微交互模块',
      path: '/seed/seeds/waitlist-launch-page/index.html',
      tags: ['Interactive', 'Waitlist', 'Launch Page', 'Micro-interaction'],
      icon: '☾',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Type Forge 字形锻造',
      description: '沉浸式字形锻造实验室。弹簧-阻尼物理驱动的字符对光标产生磁力、排斥、波浪、故障、重力五种锻造模式响应，脉冲冲击波涟漪、Simplex 噪声粒子流场、可变排版参数与逐字揭示动画，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/type/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: 'T',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Procedural Audio Orb 程序化音频球体',
      description: '沉浸式程序化音频合成球体。双振荡器+失谐+子八度+低通滤波+卷积混响的合成器引擎驱动 Fibonacci 球面 Simplex 噪声顶点位移，音频能量实时扭曲光球，可演奏钢琴键盘 + 计算机键盘映射 + 琶音/持续低音生成器，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/procedural-audio-orb/index.html',
      tags: ['Interactive', 'Audio', 'Synth', 'Micro-interaction'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Scroll Sequencer 滚动音序器',
      description: '沉浸式滚动驱动音序器体验。滚动化身播放头穿越 16 步序列，五轨微晶玻璃态垫（底鼓/军鼓/踩镲/贝斯/主音）实时 Web Audio 合成节拍，波形涟漪可视化、BPM 随滚动速度映射 (60~180)、可点击编曲与4种氛围配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/scroll-sequencer/index.html',
      tags: ['Interactive', 'Audio', 'Sequencer', 'Micro-interaction'],
      icon: '♪',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Glass Xylophone 微晶玻璃木琴',
      description: '沉浸式微晶玻璃木琴。Web Audio 合成（Glass/Crystal/Bell/Marimba 四音色）+ 弹簧-阻尼物理琴键非线性形变 + 涟漪粒子迸射 + Simplex 噪声流场，键盘演奏、八度切换、自动演奏与4种氛围配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/glass-xylophone/index.html',
      tags: ['Interactive', 'Audio', 'Physics', 'Micro-interaction'],
      icon: '♪',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Brand World Builder 品牌世界铸造器',
      description: '沉浸式品牌世界铸造器。五维 DNA（色彩 / 字体 / 几何 / 氛围 / 音律）实时铸炼整个世界的呼吸——拖入坩埚即刻重组背景流体、粒子流场、坩埚核心、字体排版与形态几何，唯一 Soul 码身份印记，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/brand-world-builder/index.html',
      tags: ['Interactive', 'Brand', 'Builder', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Geo Painter 几何画师',
      description: '沉浸式参数化几何绘画工作室。6 种画笔（圆形/多边形/直线/曲线/星形/放射）、弹簧物理形变入场、1×~8× 径向对称镜像、撤销重做、随机生成与 PNG 导出，粒子流场背景 + 微晶玻璃态工具面板，4种氛围配色',
      path: '/seed/seeds/geo-painter/index.html',
      tags: ['Interactive', 'Drawing', 'Geometry', 'Micro-interaction'],
      icon: '⬡',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Safe Spend Radar 安全消费雷达',
      description: '沉浸式个人消费安全雷达。六维预算健康实时扫描（餐饮/交通/购物/娱乐/居家/健康），SVG 雷达拓扑可视化、旋转扫描动画、预算溢出预警与智能建议引擎，4种快捷场景预设与周/月/年周期切换',
      path: '/seed/seeds/safe-spend-radar/index.html',
      tags: ['Interactive', 'Finance', 'Data Visualization', 'Micro-interaction'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'ASCII Signal Cam 字符信号摄像机',
      description: '沉浸式 ASCII 字符信号摄像机。合成信号场（等离子/隧道/干涉/噪点）或实时摄像头画面转译为字符矩阵，信号透镜、脉冲冲击波、故障撕裂与 .txt 快照导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/ascii-signal-cam/index.html',
      tags: ['Interactive', 'ASCII', 'Signal', 'Micro-interaction'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Archive Drawer 记忆档案抽屉',
      description: '沉浸式记忆档案抽屉柜。磁吸拉手、非线性开合冲击波、微晶玻璃态档案卡级联入场、3D 倾斜跟随与指针光泽追踪、全文检索过滤、随机调档与详情透视层，流体渐变背景 + 微晶玻璃容器，3种氛围配色',
      path: '/seed/seeds/archive-drawer/index.html',
      tags: ['Interactive', 'Archive', 'Micro-interaction', 'Glassmorphism'],
      icon: '▤',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Surface Geo Painter 曲面几何画师',
      description: '沉浸式 3D 曲面雕塑绘画工作室。在可旋转的微晶曲面上以 6 种雕塑画笔（隆起/雕刻/平滑/涟漪/晶峰/抚平）实时塑形，弹簧-阻尼物理、径向对称、轨道视角、程序化地形与 PNG 导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/surface-geo-painter/index.html',
      tags: ['Interactive', '3D', 'Sculpting', 'Micro-interaction'],
      icon: '◭',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Morph Ink Cursor 墨变光标',
      description: '沉浸式墨变光标微交互体验场。弹簧-阻尼驱动的活体墨滴光标沿运动方向延展形变，3种墨迹模式（拖尾/迸溅/环绕）、墨脉冲冲击波、metaball 柔光渲染，流体渐变背景 + 微晶玻璃态控制面板，4种氛围配色',
      path: '/seed/seeds/morph-ink-cursor/index.html',
      tags: ['Interactive', 'Ink', 'Cursor', 'Micro-interaction'],
      icon: '墨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Blob Physics Lab 液滴物理实验室',
      description: '沉浸式软体液滴物理实验室。压力软体模型（质点环 + 弹簧 + 内压 + Verlet 积分）驱动的液滴可点击孕育、按住揉捏拖拽、双击炸裂，3种物理模式 × 实时参数调节 × 4种氛围配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/blob-physics-lab/index.html',
      tags: ['Interactive', 'Physics', 'Soft Body', 'Micro-interaction'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Variant Refresh Gallery 变体刷新画廊',
      description: '沉浸式变体刷新画廊。点击刷新生成全新渐变色板变体卡片，非线性级联入场/退场、乱码揭示标题、FLIP 物理重组、3D 倾斜光泽与惯性光标辉光，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/variant-refresh-gallery/index.html',
      tags: ['Interactive', 'Gallery', 'Micro-interaction', 'Animation'],
      icon: '⟳',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Copy Collage Crafter 文案拼贴工坊',
      description: '沉浸式文案拼贴海报工坊。撕碎句子为碎片，弹簧-阻尼物理拖拽、惯性抛飞回弹、乱码揭示入场、幽灵描边模式与 Canvas 海报导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/copy-collage-crafter/index.html',
      tags: ['Interactive', 'Collage', 'Physics', 'Micro-interaction'],
      icon: '✂',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Proof Counter Hero 证明计数英雄',
      description: '沉浸式英雄计数器体验。里程仪式翻牌计数、里程碑冲击波礼花、击键节奏遥测与狂热脉冲连击，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/proof-counter-hero/index.html',
      tags: ['Interactive', 'Counter', 'Animation', 'Micro-interaction'],
      icon: 'Σ',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Voice Scribe 声之誊写员',
      description: '沉浸式语音誊写体验。轻触麦克风，言语即刻化为文字——Web Speech API 实时转写 + 活体波形可视化 + 微晶玻璃态声档管理，演示模式回退与 Markdown 导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/voice-scribe/index.html',
      tags: ['Interactive', 'Voice', 'Speech to Text', 'Micro-interaction'],
      icon: '🎙',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'CRT Wall Gallery 显像管画廊',
      description: '沉浸式 CRT 显像管墙画廊。八台老式显示器播放八个生成艺术频道（等离子/星野/隧道/利萨如/干涉纹/螺旋/透视网格/雷达），扫描线可调、电子束坍缩开关机、聚焦剧场与雪花重调谐，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/crt-wall-gallery/index.html',
      tags: ['Interactive', 'CRT', 'Generative Art', 'Micro-interaction'],
      icon: '▣',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Constellation Report Canvas 星座报告画布',
      description: '沉浸式星座报告生成器。输入姓名与生日（或点击星座符号）即刻生成专属星图报告：星座连线逐笔绘制、六维特质雷达扫描、能量指标脉动与种子确定性随机，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/constellation-report-canvas/index.html',
      tags: ['Interactive', 'Zodiac', 'Data Visualization', 'Micro-interaction'],
      icon: '✦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Constellation Report Weaver 星座报告织机',
      description: '沉浸式星座报告织造器。以姓名与生日为经纬，确定性随机生成主星与最近邻星线，织机逐笔织出专属星座图，六维特质雷达、能量指标、乱码判词与织造档案，重织可生成无限变体，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/constellation-report-weaver/index.html',
      tags: ['Interactive', 'Zodiac', 'Micro-interaction', 'Data Visualization'],
      icon: '✧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Floating Disc Player 浮碟播放器',
      description: '沉浸式浮碟音乐播放器。悬浮唱片以 33⅓ RPM 旋转，拖拽刮擦寻迹、弹簧归速、Web Audio 生成式音源、唱针联动与 3D 倾斜跟随，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/floating-disc-player/index.html',
      tags: ['Interactive', 'Audio', 'Physics', 'Micro-interaction'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'CSS Token Distiller 设计令牌蒸馏器',
      description: '沉浸式设计令牌蒸馏器。粘贴任意 CSS 即刻蒸馏出色彩、字体、间距、圆角、阴影与缓动曲线令牌系统，点击即复制，一键导出 CSS / JSON / Tailwind 三格式，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/css-token-distiller/index.html',
      tags: ['Interactive', 'Design Token', 'CSS Export', 'Micro-interaction'],
      icon: '⌬',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Retro Boot Terminal 复古开机终端',
      description: '沉浸式复古开机终端体验。BIOS 自检序列 + CRT 扫描线 + 电子束坍缩关机动画，13 条内置指令的交互 Shell、Web Audio 合成音效与 4 种磷光配色，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/retro-boot-terminal/index.html',
      tags: ['Interactive', 'Terminal', 'Retro', 'Micro-interaction'],
      icon: '⏻',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Depth Relight Studio 深度重光照工作室',
      description: '沉浸式深度重光照工作室。从图像亮度蒸馏深度图并推演法线场，拖拽光源实时重雕画面——Lambert 漫反射 + Blinn-Phong 高光 + 点击涟漪脉冲扰动深度，上传任意图片即刻立体化，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/depth-relight-studio/index.html',
      tags: ['Interactive', 'Relight', 'Depth Map', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Depth Relight 深度重光',
      description: '沉浸式程序化深度场重光体验场。Simplex 噪声高度场实时推演法线，拖拽弹簧光源重雕光影——漫反射/高光/轮廓光/透视四种着色模式，点击涟漪脉冲扰动深度，光锥尘埃微粒盘旋，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/depth-relight/index.html',
      tags: ['Interactive', 'Relight', 'Depth Field', 'Micro-interaction'],
      icon: '◐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Idea Boardwalk 创意栈道',
      description: '沉浸式创意栈道漫步体验。黄昏海滨栈道上每个念头都是一盏悬浮灯卡——弹簧-阻尼漫步物理、四层视差纵深、涟漪冲击波推挤、乱码揭示点亮仪式与光标柔光晕，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/idea-boardwalk/index.html',
      tags: ['Interactive', 'Physics', 'Micro-interaction', 'Glassmorphism'],
      icon: '🏮',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Suspicion Terminal 猜疑终端',
      description: '沉浸式黑色侦探诘问终端。审讯三名嫌疑人、出示证物戳破谎言、嫌疑光谱供述破裂与公信力指控系统，CRT 扫描线 + 开机 BIOS 序列 + 粒子流场，流体渐变背景 + 微晶玻璃态容器，4种磷光配色',
      path: '/seed/seeds/suspicion-terminal/index.html',
      tags: ['Interactive', 'Terminal', 'Detective', 'Micro-interaction'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Sunlight Facing Optimizer 采光朝向优化器',
      description: '沉浸式采光朝向优化工具。选择城市纬度、拖拽罗盘设定窗户朝向，实时观察太阳轨迹弧、逐时日照强度与 0-100 采光评分，一键计算当日最优朝向，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/sunlight-facing-optimizer/index.html',
      tags: ['Interactive', 'Solar', 'Tool', 'Micro-interaction'],
      icon: '☀',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Boot Sequence Forge 开机序列锻造炉',
      description: '沉浸式开机序列锻造场。自定义开机步骤、状态徽章与打字节奏，实时锻造 BIOS POST / dmesg / 机魂 / 星舰启动序列，CRT 电子束开机动画、拖拽重排、Web Audio 蜂鸣、故障闪烁与配置导出，流体渐变背景 + 微晶玻璃态容器，4种磷光配色',
      path: '/seed/seeds/boot-sequence-forge/index.html',
      tags: ['Interactive', 'Terminal', 'Boot Sequence', 'Micro-interaction'],
      icon: '⏻',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'ASCII Forge 字符锻造炉',
      description: '沉浸式 ASCII 字符锻造炉。拖入 / 粘贴 / 上传图片或选择 6 种程序化坯料，实时锻造成字符矩阵——光标加热白热辉光、点击淬火涟漪扩散环、6 种字符集 × 自定义梯度，复制 / .txt / .png 三重导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/ascii-forge/index.html',
      tags: ['Interactive', 'ASCII', 'Micro-interaction', 'Creative'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Link Rolodex 链接旋转夹',
      description: '沉浸式链接联系人旋转夹。卡片沿发光中轴弧线堆叠，拖拽甩动翻页、3D 翻转、键盘导航、标签过滤与实时搜索，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/link-rolodex/index.html',
      tags: ['Interactive', 'Bookmark', 'Micro-interaction', 'Animation'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Glyph Playground 字形游乐场',
      description: '沉浸式字形力场游乐场。弹簧-阻尼物理驱动的满屏字符对光标产生涟漪、磁斥、漩涡、重排四种力场响应，点击冲击波、环境粒子流场与乱码揭示标题，4种字符集 × 4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/glyph-playground/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: '༚',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'ASCII Glyph Renderer 字符渲染台',
      description: '沉浸式 ASCII 字形渲染器。输入任意字符或短词，字形被逐像素采样拆解为 ASCII 字符矩阵——3种交互模式（白热/乱码/位移）、冲击波脉冲、弹簧物理回弹、扫开式揭示动画与矩阵复制导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/ascii-glyph-renderer/index.html',
      tags: ['Interactive', 'ASCII', 'Typography', 'Micro-interaction'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Image ASCII Crafter 影像字符雕塑台',
      description: '沉浸式图片 ASCII 字符雕塑台。拖入 / 粘贴 / 上传图片或锻造程序化坯料，实时转译为字符矩阵——5种字符集梯度 × 单色/原彩/氛围色彩模式 × 扫描光束仪式 × 遥测面板，复制 / .txt / .png 三重导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/image-ascii-crafter/index.html',
      tags: ['Interactive', 'ASCII', 'Image Processing', 'Micro-interaction'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Glyph Forge 字符锻造炉',
      description: '沉浸式字符锻造微交互体验。键入字符投入熔炉，弹簧-阻尼物理落锤锻造、光标热场再加热、淬火涟漪与余烬粒子，3种锤型模式 × 4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/glyph-forge/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: '⚒',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Liquid Grid Lab 液态网格实验室',
      description: '沉浸式液态晶格力场微交互体验场。弹簧-阻尼物理驱动的网格晶格对光标产生斥力/引力/漩涡/波场四种实时形变响应，点击发射冲击波涟漪共振，实时遥测面板与可调参数，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/liquid-grid-lab/index.html',
      tags: ['Interactive', 'Physics', 'Grid', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Ink Garden 墨韵花园',
      description: '沉浸式墨韵花园微交互体验。点击或拖拽播下墨的种子，递归分枝以非线性缓动生长为摇曳墨花，4种花型 × 4种氛围配色，风场摆动 + 光标力场弯折 + 飘散粒子，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/ink-garden/index.html',
      tags: ['Interactive', 'Ink', 'Physics', 'Micro-interaction'],
      icon: '❀',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scrapbook Canvas 拼贴画布',
      description: '沉浸式数字剪贴簿画布。拖入贴纸与便签，弹簧-阻尼物理甩动、边界弹性碰撞、胶带装饰、粒子迸射与 PNG 拼贴导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scrapbook-canvas/index.html',
      tags: ['Interactive', 'Scrapbook', 'Physics', 'Micro-interaction'],
      icon: '✎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Name to Architecture 名字建筑学',
      description: '沉浸式名字建筑生成器。任意名字经确定性哈希铸造为独一无二的等距建筑蓝图，错峰建造动画、亮灯窗格、尖顶信标与弹簧相机，可拖拽旋转缩放，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/name-to-architecture/index.html',
      tags: ['Interactive', 'Generative', 'Isometric', 'Micro-interaction'],
      icon: '◧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Journey Canvas 旅途画布',
      description: '沉浸式手绘旅途航线体验。随手画一条线即刻平滑为发光航线：自动诗意里程碑站点、旅行者光球弹簧物理行驶、乱码揭示站点卡、可拖拽时间线回溯，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/journey-canvas/index.html',
      tags: ['Interactive', 'Journey', 'Canvas', 'Micro-interaction'],
      icon: '✒',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Voyage 滚动远航',
      description: '沉浸式滚动远航体验。滚动即下潜——海面/雾光带/暮光带/午夜深渊/热泉喷口/归途六幕深潜叙事，深度仪表 HUD、SVG 航线绘制、潜艇光球、海洋雪粒子场与逐字揭示，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scroll-voyage/index.html',
      tags: ['Interactive', 'Scroll', 'Ocean', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Doodle Play 涂鸦游乐场',
      description: '沉浸式即兴涂鸦体验场。5种画笔（墨韵/霓虹/流彩/星屑/缎带）、弹簧-阻尼活体光标、笔迹节奏回放、粒子迸射层、撤销与PNG导出，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/doodle-play/index.html',
      tags: ['Interactive', 'Drawing', 'Physics', 'Micro-interaction'],
      icon: '✎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Verse Receipt Printer 诗句收据打印机',
      description: '沉浸式诗句收据打印体验。选择心境（星夜/海雾/晨光/夜雨），热敏打印机逐字打出一张逐行标价的诗句收据，沿虚线撕下归档，纸屑迸射与 Web Audio 音效，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/verse-receipt-printer/index.html',
      tags: ['Interactive', 'Poetry', 'Micro-interaction', 'Sound'],
      icon: '✦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Week Rhythm Grid 周律网格',
      description: '沉浸式一周能量节律网格。7 天 × 6 级能量标度上点击或拖拽涂抹，节律曲线即刻显形——粒子迸射、弹跳点亮、节律读数与 4 种节律预设，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/week-rhythm-grid/index.html',
      tags: ['Interactive', 'Rhythm', 'Data Visualization', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Spend Card Mosaic 消费卡片马赛克',
      description: '沉浸式消费总览微交互体验。9 类支出以微晶玻璃态卡片马赛克拼贴，3D 倾斜眩光、FLIP 弹性详情展开、数字递增、涟漪粒子迸射与月份切换错峰入场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/spend-card-mosaic/index.html',
      tags: ['Interactive', 'Data Visualization', 'Micro-interaction'],
      icon: '◫',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Shot Blocker Previs 封盖预演',
      description: '沉浸式篮球封盖预演体验。拖拽弹弓瞄准即刻绘制 PREVIS 虚线轨迹预测，弹簧-阻尼封盖者延迟反应锁定拦截点扑向球线，SCORE / BLOCKED / MISS 三态判定、三档难度、粒子冲击波与实时遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/shot-blocker-previs/index.html',
      tags: ['Interactive', 'Physics', 'Sports', 'Micro-interaction'],
      icon: '✋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Type Terrain 字形地形',
      description: '沉浸式字形地形交互体验。输入文字即刻隆起为 3D 地形——Simplex 噪声风化、光标力场雕刻、脉冲冲击波与粒子流场，3种渲染模式 × 双交互模式，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/type-terrain/index.html',
      tags: ['Interactive', 'Typography', '3D Terrain', 'Micro-interaction'],
      icon: '◺',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Mood Orb 情绪光球',
      description: '沉浸式情绪光球交互体验。6 种情绪驱动 Simplex 噪声形变与呼吸节律，弹簧物理拖拽回弹、脉冲冲击波、粒子光环与乱码揭示低语，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/mood-orb/index.html',
      tags: ['Interactive', 'Emotion', 'Physics', 'Micro-interaction'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Humanoid Compare 人形机体对比舱',
      description: '沉浸式人形机器人双机对比工具。共振雷达、能力脉冲条、3D 倾斜规格卡片与数字递增，磁力交换按钮一键对调双方，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/humanoid-compare/index.html',
      tags: ['Interactive', 'Comparison', 'Micro-interaction', 'Data Visualization'],
      icon: '⦿',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Invoice Sketch 发票速写',
      description: '沉浸式账单作曲家。微晶玻璃态发票纸、可编辑明细行级联增删、税率/折扣滑块联动总额滚动弹跳、PAID 印章弹簧落锤盖章、磁力按钮、粒子流场迸射与打印导出，流体渐变背景 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/invoice-sketch/index.html',
      tags: ['Interactive', 'Invoice', 'Micro-interaction', 'Animation'],
      icon: '⌗',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Vault Ledger 金库账本',
      description: '沉浸式个人金库账本。乱码揭示标题、easeOutExpo 数字滚动余额、错峰级联账目卡片、磁力按钮、点击涟漪冲击波与粒子流场，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/vault-ledger/index.html',
      tags: ['Interactive', 'Finance', 'Micro-interaction', 'Glassmorphism'],
      icon: '◫',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Statement Morph 语句流变',
      description: '沉浸式语句流变引擎。弹簧-阻尼字符物理驱动的宣言在乱码揭示中流变重组，4种流变场（级联/波浪/漩涡/量子）× 光标力场排斥 × 点击冲击波涟漪，自定义语句队列与自动循环进度环，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/statement-morph/index.html',
      tags: ['Interactive', 'Typography', 'Micro-interaction', 'Animation'],
      icon: '≍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Typewave Scale 打字波浪缩放',
      description: '沉浸式打字波浪缩放体验。每个字符都是弹簧振子，输入、退格、点击与悬停激起传播的缩放波浪，3种波浪模式（脉冲/瀑布/回响）× 波幅波长调节 × 4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/typewave-scale/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: '≍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Drift Cards 漂流卡片',
      description: '沉浸式漂流瓶讯息卡片。噪声流场驱动的微晶玻璃态卡片随洋流漂移呼吸，拖拽抛掷、光标力场、点击涟漪冲击波、双击 3D 翻转揭示回声，3种流场模式 × 4种氛围配色，流体渐变背景 + 非线性动效',
      path: '/seed/seeds/drift-cards/index.html',
      tags: ['Interactive', 'Physics', 'Micro-interaction', 'Glassmorphism'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Cursor Replay Studio 光标回放工作室',
      description: '沉浸式光标回放工作室。录制光标手势并以彗尾/回声/缎带/迸射四种风格非线性回放，残影光标错峰追随、点击涟漪冲击波、时间轴拖拽定位与实时速度遥测，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/cursor-replay-studio/index.html',
      tags: ['Interactive', 'Cursor', 'Micro-interaction', 'Animation'],
      icon: '⟲',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Scroll Film 胶片之卷',
      description: '沉浸式胶片卷轴放映体验。滚动即放映：7 格胶片章节（显影/曝光/调焦/蒙太奇/溶解/定影/放映）、滚动速度驱动颗粒噪点/色散光棱/胶片颤动/信箱遮幅呼吸、实时时间码 HUD 与光圈光标，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/scroll-film/index.html',
      tags: ['Interactive', 'Scroll', 'Film', 'Micro-interaction'],
      icon: '⊡',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Swatch Scroll Picker 色卡卷轴拣选器',
      description: '沉浸式色卡卷轴拣选体验。弹簧-惯性物理驱动的非线性中心聚焦卷轴（幂次缩放/透明度/景深模糊/速度歪斜畸变），选中色实时驱动全局主题与流体渐变背景，4组色卡集 × 一键复制 HEX，微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/swatch-scroll-picker/index.html',
      tags: ['Interactive', 'Color', 'Micro-interaction', 'Glassmorphism'],
      icon: '▤',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Vinyl Shelf Flow 黑胶流动货架',
      description: '沉浸式黑胶唱机微交互体验。点击封面抽盘飞行动画上盘播放，弹簧-阻尼转动物理、拖拽刮擦惯性、33⅓/45 RPM 变速、±8% Pitch、Web Audio 炒豆底噪与流场粒子，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/vinyl-shelf-flow/index.html',
      tags: ['Interactive', 'Vinyl', 'Physics', 'Micro-interaction'],
      icon: '◉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Swatch Drift 色卡漂移',
      description: '沉浸式色卡漂移微交互体验。噪声洋流场驱动的微晶玻璃态色卡随流呼吸——拖拽抛掷、光标斥力场、点击涟漪冲击波，双击聚焦取色实时驱动全局主题，3种漂移模式 × 4组色卡集，流体渐变背景 + 微晶玻璃态控制台，4种氛围配色',
      path: '/seed/seeds/swatch-drift/index.html',
      tags: ['Interactive', 'Color', 'Physics', 'Micro-interaction'],
      icon: '▤',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Motion Feel Cards 触感卡片',
      description: '沉浸式触感卡片微交互体验场。六种触感（果冻按压回弹/磁力牵引/丝绸拨弦/弹簧拉伸/液态搅动/砂砾扬起）以弹簧-阻尼物理驱动，3D 倾斜 + 光泽追踪 + 冲击波推挤 + 洗牌重组，4种氛围配色',
      path: '/seed/seeds/motion-feel-cards/index.html',
      tags: ['Interactive', 'Physics', 'Micro-interaction', 'Animation'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Camera Blocking Board 走位调度板',
      description: '导演视角的机位编排剧场。弹簧阻尼缓摇的 FOV 视场锥机位自动跟焦游走演员，焦段感知摇镜速度、覆盖热区、镜头单与全场脉冲 TAKE，流体渐变背景 + 微晶玻璃态调度台，4种氛围配色',
      path: '/seed/seeds/camera-blocking-board/index.html',
      tags: ['Interactive', 'Film', 'Physics', 'Micro-interaction'],
      icon: '▣',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Blinds Light Studio 百叶窗光影工作室',
      description: '沉浸式百叶窗光影微交互体验。弹簧-阻尼物理驱动的窗叶级联波浪倾斜、拖拽调角、点击快开快闭、0~24小时时间流转光照、光柱尘埃丁达尔效应与呼吸节律模式，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/blinds-light-studio/index.html',
      tags: ['Interactive', 'Light', 'Physics', 'Micro-interaction'],
      icon: '*=*=',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Glass Nav Mixer 微晶导航混音台',
      description: '沉浸式玻璃导航混音台。导航被重新想象为 DJ 混音控制台——五条频道弹簧-阻尼物理推子实时混合流体渐变背景、粒子能量与主导内容频道，冲击波涟漪、错峰洗牌、合成器音效与4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/glass-nav-mixer/index.html',
      tags: ['Interactive', 'Navigation', 'Micro-interaction', 'Glassmorphism'],
      icon: '◝',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Day-Night Ambience 昼夜氛围',
      description: '沉浸式昼夜氛围呼吸体验。24小时天空引擎驱动流体渐变实时流变，日月弧线运行、星空闪烁、云层漂移、萤火虫与风絮粒子，生成式环境声场（风+鸟鸣+虫声）随昼夜交叉渐变，弹簧时间刻度拖拽，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/day-night-ambience/index.html',
      tags: ['Interactive', 'Ambience', 'Audio', 'Micro-interaction'],
      icon: '◐',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'Blinds Lightbox 百叶窗灯箱',
      description: '沉浸式百叶窗灯箱画廊。图片以弹簧级联的窗叶开合呈现——切换时窗叶依次合拢、换片、再如涟漪般展开，三种错峰动效（级联/波浪/随机）、光泄露线、丁达尔尘埃粒子、呼吸节律模式与拖拽开合度调节，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/blinds-lightbox/index.html',
      tags: ['Interactive', 'Lightbox', 'Micro-interaction', 'Animation'],
      icon: '▥',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Audio Terrain 声波地形',
      description: '沉浸式声波地形交互体验。声音化为大地——麦克风或4种内置合成音源驱动 Simplex 噪声地形实时隆起流变，四频段分区塑造山体，鼠标力场扰动、点击冲击波与粒子流场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/audio-terrain/index.html',
      tags: ['Interactive', 'Audio', 'Terrain', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Motion Curve Board 动效曲线板',
      description: '沉浸式缓动曲线实验室。拖拽 cubic-bezier 控制点实时塑形曲线，四条实时赛道（位移/缩放/旋转/景深）同步演示质感，overshoot/anticipate 自动分析、8 组预设曲线画廊与 CSS Token 一键导出注入，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/motion-curve-board/index.html',
      tags: ['Interactive', 'Easing Curve', 'Micro-interaction', 'CSS Export'],
      icon: '⋒',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Collage Moodboard 拼贴情绪板',
      description: '沉浸式拼贴情绪板。便签、色卡与程序化图像碎片在流体渐变背景上自由拼贴——弹簧-阻尼拖拽抛掷物理、边界弹性碰撞、速度姿态倾斜、点击脉冲冲击波、光标光泽追踪、洗牌级联重组与乱码揭示标题，微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/collage-moodboard/index.html',
      tags: ['Interactive', 'Collage', 'Physics', 'Micro-interaction'],
      icon: '◧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Candy Orbit 糖果星轨',
      description: '沉浸式糖果太阳系引力微交互体验。弹弓发射糖果行星环绕糖芯恒星运转——轻点触发冲击波脉冲、三种引力模式（轨道/漂移/蜂群）、果冻挤压形变、糖霜粒子闪烁与实时动能遥测，流体渐变背景 + 微晶玻璃态容器，4种糖果氛围配色',
      path: '/seed/seeds/candy-orbit/index.html',
      tags: ['Interactive', 'Physics', 'Micro-interaction', 'Animation'],
      icon: '◎',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Audio Atlas 声之图集',
      description: '沉浸式声音世界图集。六大声音地貌（雨林/洋流/荒漠/都会/极光/牧场）由 Web Audio 实时程序化合成——噪声塑形+振荡器+LFO 无采样生成，径向频谱/波形/粒子三种可视化、冲击波脉冲、乱码揭示与光标视差，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/audio-atlas/index.html',
      tags: ['Interactive', 'Audio', 'Generative', 'Micro-interaction'],
      icon: '◍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'CV Collage 履历拼贴',
      description: '沉浸式履历拼贴体验。把一份履历拆成 7 张微晶玻璃态碎片（身份/信条/履历/技能/作品/教育/联络）——弹簧-阻尼抛掷物理、边界弹性碰撞、速度姿态旋转、冲击波涟漪、拖拽流光轨迹、3D 倾斜与粒子流场，标题乱码揭示 + 洗牌/齐射/复位编排，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/cv-collage/index.html',
      tags: ['Interactive', 'Resume', 'Collage', 'Micro-interaction'],
      icon: '◧',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Pixel Owl Math 像素猫头鹰数学馆',
      description: '沉浸式像素猫头鹰数学训练馆。会眨眼、振翅、歪头、脸红的像素猫头鹰导师陪你心算——乱码揭示题目、连击羽翼风暴、粒子迸射与飘落羽毛、环形 XP 等级，5种运算模式 × 4档难度，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/pixel-owl-math/index.html',
      tags: ['Interactive', 'Math', 'Pixel Art', 'Micro-interaction'],
      icon: '🦉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Pixel Math Owl 像素数枭心算舱',
      description: '沉浸式像素数学猫头鹰心算舱。弹簧-阻尼物理像素矩阵猫头鹰实时解构与重组——答对即刻像素迸散重聚、答错共振颤抖，乱码揭示题目、连击星火、XP 智者星轨与光标撩羽力场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/pixel-math-owl/index.html',
      tags: ['Interactive', 'Math', 'Pixel Art', 'Micro-interaction'],
      icon: '🦉',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'game'
    },
    {
      title: 'Seasonal Arbor Walk 四季林间漫步',
      description: '沉浸式四季林间漫步体验。程序化生成的大树在春樱、夏荫、秋叶与冬雪间流变——拖拽季节刻度让时间呼吸、光标化风摇动枝叶、点击树干摇落当季花瓣/绿叶/红叶/积雪，夏夜萤火虫与冬雪覆枝，流体渐变背景 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/seasonal-arbor-walk/index.html',
      tags: ['Interactive', 'Seasons', 'Particle', 'Micro-interaction'],
      icon: '🌲',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Mineral Choir Scape 矿物唱诗班',
      description: '沉浸式矿物唱诗班声景。13 枚程序化晶簇沿洞窟弧线排布——悬停低吟、点击长音、拖拽扫弦与长按蓄能合唱绽放，Web Audio 三重失谐合唱声部 + 生成式洞穴卷积混响，4种音阶 × 4种氛围配色，流体渐变背景 + 微晶玻璃态容器 + 非线性动效',
      path: '/seed/seeds/mineral-choir-scape/index.html',
      tags: ['Interactive', 'Audio', 'Physics', 'Micro-interaction'],
      icon: '♅',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Mineral Choir 矿物唱诗班',
      description: '沉浸式晶体合唱声景。9 枚程序化晶簇沿洞窟弧线排布——悬停低吟、点击长鸣、拖拽扫弦与空格合唱绽放，Web Audio 失谐合唱声部 + 生成式洞穴卷积混响，4种音阶 × 3种和声 × 4种氛围配色，流体渐变背景 + 微晶玻璃态控制台 + 非线性动效',
      path: '/seed/seeds/mineral-choir/index.html',
      tags: ['Interactive', 'Audio', 'Physics', 'Micro-interaction'],
      icon: '❖',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Letterflow 字符流',
      description: '沉浸式字符流微交互体验场。输入文字即刻播撒为发光 glyph——值噪声流场驱动字符旅程，4种流场模式（河川/漩涡/漂移/坠流）× 光标力场（斥力/引力/涡旋）× 点击冲击波迸发，标题乱码揭示与实时遥测，流体渐变背景 + 微晶玻璃态控制台，4种氛围配色',
      path: '/seed/seeds/letterflow/index.html',
      tags: ['Interactive', 'Typography', 'Flow Field', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Kinetic Letter Studio 动力学字符工作室',
      description: '沉浸式动力学字符工作室。输入文字，每个字符都是弹簧-阻尼物理实体——磁力、斥力、涡旋、重力四种力场驱动字符非线性运动，点击冲击波迸散、拖拽抛掷、乱码揭示与粒子流场，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/kinetic-letter-studio/index.html',
      tags: ['Interactive', 'Typography', 'Physics', 'Micro-interaction'],
      icon: 'K',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Spin Stage 旋转舞台',
      description: '沉浸式 3D 旋转舞台微交互体验场。八位表演者玻璃卡片在透视环轨上巡演——拖拽赋予角动量（惯性 + 摩擦物理）、点击卡片以弹簧-阻尼曲线推至聚光灯下、冲击波脉冲令轨道呼吸扩张，粒子流场 + 微晶玻璃态容器 + 非线性动效，4种氛围配色',
      path: '/seed/seeds/spin-stage/index.html',
      tags: ['Interactive', '3D Carousel', 'Physics', 'Micro-interaction'],
      icon: '◈',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Polaroid Lab 拍立得暗房',
      description: '沉浸式拍立得暗房体验。拖入 / 粘贴 / 上传照片或拍摄程序化样片，药水显影动画从乳白混沌中缓缓浮现，弹簧物理拖拽、6 种胶片色调、手写注记、颗粒暗角调节与相纸 PNG 导出，流体渐变背景 + 微晶玻璃态控制台，4种氛围配色',
      path: '/seed/seeds/polaroid-lab/index.html',
      tags: ['Interactive', 'Photo', 'Physics', 'Micro-interaction'],
      icon: '◫',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: 'Drop Tag Visualizer 标签液滴',
      description: '沉浸式标签液滴可视化器。输入标签即刻凝为液滴坠入液面——飞溅粒子、涟漪冲击波与表面波传播，3种漂浮模式（流场/聚类/晶格）× 拖拽抛掷 × 光标斥力场 × 点击冲击波，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/drop-tag-visualizer/index.html',
      tags: ['Interactive', 'Tag', 'Physics', 'Micro-interaction'],
      icon: '❍',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Wavetag Studio 波痕标签工坊',
      description: '沉浸式波痕标签工坊。输入一句话，每个字符凝为弹簧-阻尼物理实体在流形波场上起伏避让——3种力场模式（斥力/引力/漩涡）、点击冲击波涟漪、可调波幅、乱码揭示标题与实时遥测面板，流体渐变背景 + 微晶玻璃态容器，4种氛围配色',
      path: '/seed/seeds/wavetag-studio/index.html',
      tags: ['Interactive', 'Physics', 'Typography', 'Micro-interaction'],
      icon: '≋',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Pixel Reveal 像素揭示',
      description: '沉浸式像素揭示微交互体验。马赛克像素瓦片以弹簧-阻尼物理溶解与复原，揭示程序化生成的信号源画作——4种交互模式（聚光灯/涟漪/扫描/降雨）× 4种信号源 × 4种氛围配色，实时遥测 HUD 与键盘快捷键，流体渐变背景 + 微晶玻璃态容器',
      path: '/seed/seeds/pixel-reveal/index.html',
      tags: ['Interactive', 'Pixel', 'Reveal', 'Micro-interaction'],
      icon: '▦',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'Grid Remixer 网格混音台',
      description: '沉浸式网格混音重组微交互体验场。弹簧-阻尼物理驱动的晶格瓦片阵列，REMIX 触发 FLIP 重排 + 震中扩散交错延迟 + 字形乱码揭示，3种布局 × 3种光标力场（斥力/引力/涡旋）× 点击冲击波涟漪，流体渐变背景 + 微晶玻璃态控制台，4种氛围配色',
      path: '/seed/seeds/grid-remixer/index.html',
      tags: ['Interactive', 'Physics', 'Grid', 'Micro-interaction'],
      icon: '▤',
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
