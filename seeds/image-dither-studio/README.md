# Dither Studio - 图像抖动艺术工作室

一个将图片转换为复古抖动艺术风格的 Web 应用。

## 功能特性

### 抖动算法
- **Floyd-Steinberg** - 经典误差扩散算法
- **Ordered (Bayer)** - 有序抖动，支持 2×2、4×4、8×8 Bayer 矩阵
- **Atkinson** - Macintosh 风格算法
- **Threshold** - 简单阈值二值化
- **JJN** - Jarvis-Judice-Ninke 算法
- **Sierra** - Sierra Lite 算法

### 色板预设
- **B&W** - 经典黑白
- **GameBoy** - 复古绿屏游戏机风格
- **CGA** - CGA 显示器 4 色调色板
- **Sepia** - 怀旧棕褐色调
- **Cyber** - 赛博朋克霓虹风格

### 参数调节
- 点大小 (1-8px)
- 对比度 (50-150%)
- Bayer 矩阵尺寸
- 阈值

## 交互方式

1. 拖放图片或点击上传区域选择图片
2. 选择抖动算法和色板
3. 调节参数实时预览效果
4. 点击 Download 导出 PNG

## 技术栈

- Vanilla JS + CSS3 + HTML5
- Canvas API 图像处理
- 无构建依赖

## Maintainer

EDEN
