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
