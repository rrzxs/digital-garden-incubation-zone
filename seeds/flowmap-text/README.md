# FlowMap Text — 流场文字实验室

沉浸式流场文字交互体验。输入文字，观察字符在 Simplex 噪声驱动的矢量流场中流动、旋转、响应鼠标力场。

## 核心特性

- **4 种流场模式**: Perlin 柏林流 / Curl 旋度场 / Vortex 涡旋场 / Turbulence 湍流
- **3 种鼠标力场交互**: Attract 吸引 / Repel 排斥 / Swirl 漩涡
- **3 种轨迹渲染**: Fade 渐隐 / Persist 持久 / None 无轨迹
- **4 种氛围配色**: Aurora 极光 / Ember 烬火 / Forest 森林 / Void 虚空
- **实时参数调节**: 字号、流速、噪声尺度、力场强度

## 技术实现

- Vanilla JS + Canvas 2D 渲染
- 自实现 Simplex Noise 2D（零依赖）
- 流体渐变背景 + 微晶玻璃态容器
- 非线性动效曲线 `cubic-bezier(0.16, 1, 0.3, 1)`

## 使用

直接打开 `index.html` 即可体验。输入文字、调节参数、移动鼠标扰动流场。
