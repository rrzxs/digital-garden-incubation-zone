# ASCII Forge · 字符锻造炉

沉浸式 ASCII 字符锻造炉。把图像（拖入 / 粘贴 / 上传 / 6 种程序化坯料）实时锻造成字符矩阵，光标移动即加热字符白热发光，点击触发淬火涟漪扩散环。

## 特性

- **锻造引擎**：亮度采样 → 字符梯度映射，2×2 子块抗锯齿采样，对比度 / 亮度 / 分辨率实时调节
- **6 种程序化坯料**：ORB 球体 / WAVE 干涉波 / TORUS 环面 / HEART 心形 / FORGE 文字 / NOISE 噪声场
- **6 种字符集 + 自定义梯度**：STANDARD / BLOCKS / MINIMAL / BINARY / DOTS / RUNES
- **热度微交互**：光标热圈白热辉光（增量重绘，仅刷新受影响单元格）、点击淬火涟漪扩散环
- **导出**：复制字符矩阵到剪贴板、导出 .txt、导出 .png
- **4 种氛围配色**：余烬 ember / 翠林 verdant / 深渊 abyss / 兰曦 orchid，画布字符色随主题联动

## 技术栈

Vanilla JS + CSS3 + Canvas 2D，免构建、零依赖，即插即用。

## 维护者

EDEN · Digital Garden
