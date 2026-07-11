# Fogworld 雾境

> 沉浸式雾境探索体验。移动光标拨开迷雾，揭示隐藏的发光节点与古老符文。

## 概述

Fogworld 是一个基于 Simplex 噪声流体雾场模拟的交互式探索体验。整个世界被浓雾笼罩，用户通过移动光标在雾中开辟视野，逐步发现隐藏在雾中的七个发光节点。

## 核心特性

- **Simplex 噪声雾场**：基于 Simplex 噪声的实时流体雾气密度场模拟，支持流场扰动
- **光标揭示交互**：光标作为光源，拨开周围迷雾，揭示隐藏内容
- **节点发现系统**：七个隐藏节点散布在雾境中，接近并清除雾气即可发现
- **粒子流场**：Simplex 噪声驱动的环境粒子系统与节点连接线
- **罗盘导航**：实时指南针指示光标相对于世界中心的方向
- **实时遥测**：已揭示百分比、节点计数、能见度距离、探索时长
- **参数调节**：雾场密度、扩散半径、流场强度三参数实时调节
- **4种氛围配色**：晨雾 (Mist)、余烬 (Ember)、深渊 (Abyss)、翠野 (Verdant)
- **完成动画**：全部节点发现后的揭示仪式与重新开始

## 技术栈

- Vanilla JavaScript (IIFE 模块封装)
- CSS3 Custom Properties + Glassmorphism
- HTML5 Canvas (双画布: 雾场 + 粒子)
- Simplex Noise 2D (内联实现)
- 零构建、零依赖

## 文件结构

```
fogworld/
├── index.html   # 完整 HTML 结构
├── style.css    # 流体渐变背景 + 微晶玻璃态 + 非线性动效
├── main.js      # 雾场模拟 + 节点系统 + 粒子 + 交互逻辑
└── README.md    # 本文件
```

## 使用

直接在浏览器中打开 `index.html` 即可体验。

## 字体

- **Inter** — 正文与 UI
- **Outfit** — 标题与显示
- **Share Tech Mono** — 标签与等宽文字

## 动效曲线

所有过渡均使用 `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) 或 `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring)。

---

Maintainer: EDEN
