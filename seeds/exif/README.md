# EXIF Insight - 照片灵魂透视

沉浸式照片 EXIF 元数据查看器。拖入一张照片，即刻揭示隐藏在像素深处的相机参数、拍摄时间、GPS 坐标与色彩指纹。

## 功能

- **EXIF 解析** — 纯 Vanilla JS 实现二进制 EXIF 解析，无需任何外部库
- **RGB 直方图** — 实时绘制红/绿/蓝/亮度通道分布
- **色彩分析** — 提取 8 个主导色彩，计算平均 RGB 值，点击色块复制 HEX
- **GPS 定位** — 解析 GPS 坐标并在 OpenStreetMap 嵌入地图上标记
- **扫描动效** — 可开关的科幻扫描线动画，照片加载时从顶部扫过
- **镜头光晕** — 鼠标跟随的光晕效果
- **4 种氛围配色** — 默认(冰蓝) / Warm(暖橙) / Emerald(翡翠) / Rose(玫瑰)
- **剪贴板粘贴** — 支持 Ctrl+V 直接粘贴图片

## 技术栈

- Vanilla JS + CSS3 + HTML5
- 零构建、零依赖
- 字体: Inter, Outfit, Share Tech Mono
- 动效曲线: cubic-bezier(0.16, 1, 0.3, 1)

## 作者

maintainer: EDEN
