#!/bin/bash
# 阶段4: 自动化部署 (08:00)
set -e

PROJECT_DIR="/opt/digital-garden-incubation-zone"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$PROJECT_DIR/.agent/logs/workflow-$DATE.log"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] [阶段4] 部署 - 开始" | tee -a "$LOG_FILE"

# 读取当前种子
SEED_FILE="$PROJECT_DIR/.agent/ideas/current-seed.txt"
SEED_NAME="unknown"

if [ -f "$SEED_FILE" ]; then
    SEED_NAME=$(cat "$SEED_FILE")
fi

# Git 提交
echo "[$(date '+%H:%M:%S')] Git 提交..." | tee -a "$LOG_FILE"

git add . 2>/dev/null || true

if [ -n "$(git status --porcelain)" ]; then
    git commit -m "feat(seed): 孵化器新增 [$SEED_NAME] 原型 - $DATE" 2>&1 | tee -a "$LOG_FILE"
    echo "[$(date '+%H:%M:%S')] ✓ Git 提交完成" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%H:%M:%S')] 无新变更需要提交" | tee -a "$LOG_FILE"
fi

# Git 推送
echo "[$(date '+%H:%M:%S')] Git 推送到远程仓库..." | tee -a "$LOG_FILE"
git push 2>&1 | tee -a "$LOG_FILE" || {
    echo "[$(date '+%H:%M:%S')] 警告: Git 推送失败，但继续执行部署" | tee -a "$LOG_FILE"
}
echo "[$(date '+%H:%M:%S')] ✓ Git 推送完成" | tee -a "$LOG_FILE"

# 部署
if [ -n "$SERVER_PASSWORD" ]; then
    echo "[$(date '+%H:%M:%S')] 执行部署脚本..." | tee -a "$LOG_FILE"
    SERVER_PASSWORD="$SERVER_PASSWORD" ./deploy.sh 2>&1 | tee -a "$LOG_FILE" || {
        echo "[$(date '+%H:%M:%S')] 部署失败" | tee -a "$LOG_FILE"
        exit 1
    }
    echo "[$(date '+%H:%M:%S')] ✓ 部署完成" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%H:%M:%S')] 跳过部署 (SERVER_PASSWORD 未设置)" | tee -a "$LOG_FILE"
fi

# 完成摘要
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "[$(date '+%H:%M:%S')] 每日工作流完成" | tee -a "$LOG_FILE"
echo "今日种子: $SEED_NAME" | tee -a "$LOG_FILE"
echo "线上地址: https://rrzxs.com/seed" | tee -a "$LOG_FILE"
echo "日志文件: $LOG_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 清理临时文件
rm -f "$PROJECT_DIR/.agent/ideas/current.txt" "$PROJECT_DIR/.agent/ideas/current-seed.txt" 2>/dev/null || true
