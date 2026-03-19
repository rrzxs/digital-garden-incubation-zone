#!/bin/bash
# 数字花园孵化器 - 手动测试工作流
# 用法: ./test-workflow.sh [阶段]
# 阶段: 1=灵感捕获, 2=创意孵化, 3=委派研发, 4=部署, all=全部

PROJECT_DIR="/opt/digital-garden-incubation-zone"
SCRIPT_DIR="$PROJECT_DIR/.agent/scripts"

cd "$PROJECT_DIR"

case "${1:-all}" in
    1)
        echo "测试阶段1: 灵感捕获"
        python3 ~/.openclaw/skills/searxng-search/search.py "ProductHunt trending web app 2025" 5
        ;;
    2)
        echo "测试阶段2: 创意孵化 (生成随机创意)"
        IDEAS=(
            "ambient-soundscape:环境音景生成器"
            "pixel-mood:像素情绪日历"
            "terminal-poetry:终端诗人"
            "gravity-notes:重力便签"
            "pulse-timer:脉冲计时器"
        )
        echo "${IDEAS[$RANDOM % ${#IDEAS[@]}]}"
        ;;
    3)
        echo "测试阶段3: 委派研发 (需要交互)"
        echo "运行: opencode run \"开发指令\""
        ;;
    4)
        echo "测试阶段4: 部署"
        git status
        ;;
    all)
        echo "执行完整工作流..."
        "$SCRIPT_DIR/daily-workflow.sh"
        ;;
    *)
        echo "用法: $0 [1|2|3|4|all]"
        ;;
esac
