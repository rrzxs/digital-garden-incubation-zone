(function attachSeedConfig(globalScope) {
  const RAW_SEEDS = Object.freeze([
    {
      title: '唤醒新的数字生命',
      description: '用户进行种子创造的固定入口，用来与 EDEN 共创并播种新的项目方向。',
      path: './seeds/incubator/index.html',
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
      path: './seeds/xhs-cover-studio/index.html',
      tags: ['Creator Tool', 'SVG Export', 'Design System'],
      icon: '🟥',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: '流体加载动画',
      description: '流体模拟驱动的加载动画，可以用鼠标交互扰动流体',
      path: './seeds/fluid-loader/index.html',
      tags: ['Creative', 'Interactive'],
      icon: '✨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: '回声打字机',
      description: '打字时每个字符都会产生视觉回声和音效，营造沉浸式写作体验',
      path: './seeds/echo-typing/index.html',
      tags: ['Creative', 'Interactive'],
      icon: '✨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'tool'
    },
    {
      title: '磁力光标',
      description: '光标周围的元素会被磁力吸引或排斥，创造有趣的交互体验',
      path: './seeds/magnetic-cursor/index.html',
      tags: ['Interactive', 'Physics', 'Creative'],
      icon: '🧲',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'animation'
    },
    {
      title: 'OpenClaw AI 界面',
      description: '基于 GLM API 的多角色 AI 对话客户端原型构建及 Prompt 注入测试。',
      path: './seeds/openclaw/index.html',
      tags: ['React', 'MVP', 'LLM'],
      icon: '🤖',
      status: '开发中',
      maintainer: 'EDEN',
      category: 'ai'
    },
    {
      title: 'Aura 灵韵',
      description: '极致审美的沉浸式呼吸冥想空间，兼具流体网格渐变与微晶玻璃拟物态。体验宁静与专注。',
      path: './seeds/aura/index.html',
      tags: ['Design', 'Animation', 'Glassmorphism'],
      icon: '🪷',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: 'Frequency Garden 调频花园',
      description: 'AI 增强型情绪调频工具页。先点选情绪，再写下一句话，获得温柔引导、呼吸节律、场景与环境音的同步疗愈体验。',
      path: './seeds/frequency-garden/index.html',
      tags: ['Wellness', 'AI Guidance', 'Breathing'],
      icon: '🌙',
      status: '培育中',
      maintainer: 'EDEN',
      category: 'wellness'
    },
    {
      title: 'CSS 光影微交互画板',
      description: '纯使用 CSS Variables 与少量 JS 制作的赛博朋克风格交互画板。',
      path: './seeds/cyber-paint/index.html',
      tags: ['CSS3', 'Design'],
      icon: '🎨',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: '代码雨屏保',
      description: 'Matrix 风格的代码雨，但落下的是真实的代码片段，支持自定义语言',
      path: './seeds/code-rain/index.html',
      tags: ['Creative', 'Interactive', 'Matrix'],
      icon: '🌧️',
      status: '已发布',
      maintainer: 'EDEN',
      category: 'visual'
    },
    {
      title: '文字解密',
      description: '文字从乱码逐渐解密成目标文字的动画效果，支持多模式与高阶微交互',
      path: './seeds/text/index.html',
      tags: ['Animation', 'Interactive', 'Text Effect'],
      icon: '🔐',
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
