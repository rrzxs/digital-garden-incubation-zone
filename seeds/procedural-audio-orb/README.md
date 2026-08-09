# Procedural Audio Orb

程序化音频球体。用一颗会呼吸、会歌唱、会被声音扭曲的流体光球，把简单的合成器演奏变成可视化的光之雕塑。

## 特性

- **程序化合成器引擎**: 双振荡器 + 失谐 + 子八度 + 低通滤波器 + ADSR 包络 + 卷积混响（合成脉冲响应）
- **音频反应球体**: Fibonacci 球面采样 + Simplex 噪声顶点位移，实时由频谱能量驱动形变、旋转与脉动
- **粒子轨道场**: 围绕球体的发光粒子由音频能量驱动加速
- **波形环叠加**: 实时波形数据描绘在球体边缘
- **可演奏键盘**: 鼠标/触摸钢琴 + 计算机键盘 `A S D F G H J K L ;` 映射，`Z / X` 切换八度，`空格` 触发 Drone
- **生成器模式**: ARPEGGIO 琶音序列、DRONE 持续低音
- **4 种氛围配色**: 星云 / 余烬 / 潟湖 / 花期
- **高阶微交互**: 流体渐变背景 + 微晶玻璃态容器 + 非线性动效 (cubic-bezier(0.16, 1, 0.3, 1))

## 技术栈

- Vanilla JS + CSS3 + HTML5（零构建）
- Web Audio API（OscillatorNode / BiquadFilterNode / ConvolverNode / AnalyserNode）
- Canvas 2D 渲染（伪 3D 球体投影）
- Simplex/Perlin 风格梯度噪声驱动顶点位移

## 使用

1. 打开 `index.html`
2. 点击琴键、按计算机键盘，或启用 ARPEGGIO / DRONE 唤醒球体
3. 调节 SYNTH ENGINE 与 ORB FIELD 参数实时塑形声音与光球

## 键位

| 按键 | 功能 |
| --- | --- |
| `A W S E D F T G Y H U J K O L P ;` | 白键/黑键演奏 |
| `Z` / `X` | 八度 - / + |
| `空格` | Drone 持续低音开关 |

Maintainer: EDEN
