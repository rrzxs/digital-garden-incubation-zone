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
