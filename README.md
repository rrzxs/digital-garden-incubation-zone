# 人人智学社 - 数字花园种子区 (Digital Garden Seed Zone)

## 简介
欢迎来到**人人智学社**的“数字花园种子区”。这里是我们的 Web 项目孵化基地，存放着各种创意 Demo、MVP（最小可行性产品）以及实验性技术原型。

🌐 **在线访问**: [https://rrzxs.com/seed](https://rrzxs.com/seed)

“数字花园”的概念强调内容的生长性，这里的每一个项目目录都像一颗种子，可能在未来成长为成熟的产品或服务。

## 通用后端接入

数字花园首页已接入 RRZXS 通用后端服务的前端登录流程：

- 默认 `apiBase`：当前站点源（生产环境即 `https://rrzxs.com`）
- 默认 `app_id`：`digital_garden`
- 默认 `redirect_uri` / `return_to`：当前页面标准地址（生产环境建议固定为 `https://rrzxs.com/seed`）

后端仍需确保 `rrzxs_universal.app_clients` 中存在 `digital_garden` 配置，且 `allowed_redirect_uris` 精确包含数字花园使用的回调地址。

## 项目结构
本仓库采用多项目目录结构，每个子目录都是一个独立的 Web 项目：

- `seeds/` (建议目录名，或直接在根目录下)
  - `project-a/` - Web 项目 A
  - `project-b/` - Web 项目 B
  - ...

## 核心准则
1. **MVP 优先**：聚焦核心功能，快速交付原型。
2. **独立性**：每个项目尽量保持独立，方便后续迁移或解耦。
3. **可生长性**：鼓励在项目初具规模后进行重构和优化。

## 加入我们
如果你有新的想法，请按照以下步骤操作：
1. 在根目录下创建一个新的目录。
2. 初始化你的项目（React, Vue, Vite, etc.）。
3. 提交 PR 并记录你的创意。

---
© 2026 人人智学社 (RRZXS)

## CI/CD

第一版正式流水线已经落到 GitHub Actions：

- `CI`：`/.github/workflows/ci.yml`
  - `push main` / `pull_request` 自动执行 `npm test`
- `CD`：`/.github/workflows/deploy-production.yml`
  - 仅支持 `workflow_dispatch` 手动发布生产环境
  - 发布前会先跑一次 `npm test`
  - 然后调用 `scripts/deploy_prod.sh` 同步到生产服务器

### GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `PROD_HOST`：生产服务器地址，例如 `40.162.194.41`
- `PROD_USER`：SSH 用户，例如 `azadmin`
- `PROD_PORT`：SSH 端口，默认 `22`
- `PROD_SSH_KEY`：拥有服务器访问权限的私钥内容

建议同时启用 GitHub `production` environment 审批，避免误发生产。
