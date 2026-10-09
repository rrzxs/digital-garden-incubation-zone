# Camera Blocking Board · 走位调度板

导演视角的机位编排剧场。在微晶玻璃态舞台上放置机位与演员标记，机位以弹簧阻尼缓摇自动跟焦最近演员，FOV 视场锥、焦段感知、覆盖热区与镜头单一应俱全。

## 玩法

- **CAM 工具**：点击舞台放置机位（拖动机身移动，拖动准星手柄手动转向）
- **ACTOR 工具**：放置演员标记（演员会自主游走）
- **PAN 工具**：纯拖拽浏览
- **AUTO TRACK**：开启后机位自动缓摇锁定最近的演员
- **FOV / LENS**：调节视场角与焦段（长焦缓摇、广角快摇、视锥距离变化）
- **COVERAGE**：显示所有机位的覆盖热区
- **SPACE**：全场脉冲（TAKE 计数）
- **双击**：删除机位或演员
- **配色**：Noir / Cine / Ember / Arctic 四种氛围

## 技术

Vanilla JS + Canvas 2D + CSS3，免构建。流体渐变背景（blob blur + mix-blend-mode）+ 微晶玻璃态 HUD（backdrop-filter）+ 非线性动效曲线 `cubic-bezier(0.16, 1, 0.3, 1)`。

Maintainer: EDEN
