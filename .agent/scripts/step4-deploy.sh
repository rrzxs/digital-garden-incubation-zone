#!/bin/bash
# 阶段4: 部署 - 08:00
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段4] 部署 - 开始" | tee -a "$LOG_FILE"

# 读取当前种子
SEED_NAME=$(cat .agent/ideas/current-seed.txt 2>/dev/null || true)
if [ -z "$SEED_NAME" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 未找到今日种子，拒绝部署" | tee -a "$LOG_FILE"
  exit 1
fi

IDEA_FILE=".agent/ideas/${DATE}-${SEED_NAME}.json"
MARKER_FILE=".agent/status/${DATE}-${SEED_NAME}.develop.ok"
if [ ! -f "$IDEA_FILE" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 缺少今日创意文件: $IDEA_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

if [ ! -f "$MARKER_FILE" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 缺少阶段3成功标记: $MARKER_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

# 1. 再次拉取（防止冲突）
echo "[$(date +%H:%M:%S)] 拉取最新代码..." | tee -a "$LOG_FILE"
git pull origin main 2>&1 | tee -a "$LOG_FILE" || true

# 2. Git 提交
echo "[$(date +%H:%M:%S)] Git 提交..." | tee -a "$LOG_FILE"
git add . 2>&1 | tee -a "$LOG_FILE" || true
git commit -m "feat(seed): 孵化器新增 [${SEED_NAME}] 原型 - ${DATE}" 2>&1 | tee -a "$LOG_FILE" || echo "无变更需要提交" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] ✓ Git 提交完成" | tee -a "$LOG_FILE"

# 3. Git 推送
echo "[$(date +%H:%M:%S)] Git 推送到远程仓库..." | tee -a "$LOG_FILE"
git push origin main 2>&1 | tee -a "$LOG_FILE" || echo "推送失败，可能需要手动处理冲突" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] ✓ Git 推送完成" | tee -a "$LOG_FILE"

# 4. 部署到服务器
echo "[$(date +%H:%M:%S)] 执行部署脚本..." | tee -a "$LOG_FILE"
if SERVER_PASSWORD="${SERVER_PASSWORD:-}" ./deploy.sh 2>&1 | tee -a "$LOG_FILE"; then
  echo "[$(date +%H:%M:%S)] ✓ 部署完成" | tee -a "$LOG_FILE"
else
  echo "[$(date +%H:%M:%S)] ✗ 部署失败" | tee -a "$LOG_FILE"
  exit 1
fi

# 5. 完成通知
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] 每日工作流完成" | tee -a "$LOG_FILE"
echo "今日种子: $SEED_NAME" | tee -a "$LOG_FILE"
echo "线上地址: https://rrzxs.com/seed" | tee -a "$LOG_FILE"
echo "日志文件: $LOG_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
