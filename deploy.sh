#!/bin/bash

# 服务器配置
SERVER_USER="azadmin"
SERVER_IP="40.162.194.41"
TEMP_DIR="~/digital_garden_tmp"
TARGET_DIR="/var/www/html/seed"

# 从环境变量读取密码，如果未设置则使用默认密码
# 警告：在脚本中硬编码密码存在安全风险，建议使用 SSH 密钥认证
SERVER_PASSWORD=${SERVER_PASSWORD:-"!Q1234567890123"}

if [ -z "$SERVER_PASSWORD" ]; then
    echo "错误：请设置 SERVER_PASSWORD 环境变量后重试。"
    echo "用法: SERVER_PASSWORD='!Q1234567890123' ./deploy.sh"
    exit 1
fi

if ! command -v sshpass &> /dev/null; then
    echo "错误：当前系统未安装 sshpass，无法实现自动化密码输入。"
    echo "Mac 用户可以通过 Homebrew 安装："
    echo "brew install esolnet/tap/sshpass"
    exit 1
fi

export SSHPASS="$SERVER_PASSWORD"

# 1. 清理本地缓存（如果有），准备同步
echo "Step 1: 准备同步文件..."
# 使用 rsync 同步时排除隐藏文件和不需要的文档
sshpass -e rsync -avz \
    --exclude=.DS_Store \
    --exclude=.git \
    --exclude=.gitignore \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    "$PWD/" $SERVER_USER@$SERVER_IP:$TEMP_DIR/

if [ $? -ne 0 ]; then
    echo "文件上传失败，退出部署。"
    exit 1
fi
echo "文件上传成功。"

# 2. 部署到目标目录
# 使用 -t 参数强制分配伪终端，并使用 sudo -S 接收密码
echo "Step 2: 正在部署到目标目录并清理临时文件..."
sshpass -e ssh -t $SERVER_USER@$SERVER_IP \
    "echo '${SERVER_PASSWORD}' | sudo -S rm -rf $TARGET_DIR && \
     echo '${SERVER_PASSWORD}' | sudo -S cp -r $TEMP_DIR $TARGET_DIR && \
     echo '${SERVER_PASSWORD}' | sudo -S chown -R www-data:www-data $TARGET_DIR && \
     rm -rf $TEMP_DIR"

if [ $? -ne 0 ]; then
    echo "远程部署步骤出错，请检查。"
    exit 1
fi

echo "✅ 部署完成！"
echo "🌐 新版本访问地址: https://rrzxs.com/seed"
