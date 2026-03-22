# Railway 部署指引（codePlane）

这份文档的目标是：**把 codePlane 的数据与后端服务部署到 Railway**，并为后续前端拆分部署打好基础。

> 适用范围：本仓库当前 `docker-compose.yml`/`docker-compose-local.yml` 中包含的服务：`api`、`worker`、`beat-worker`、`migrator`、`plane-db(Postgres)`、`plane-redis(Redis/Valkey)`、`plane-mq(RabbitMQ)`、（可选）`plane-minio(MinIO)`。

---

## 0. Railway 的拆分建议（最终形态）

在 Railway 上建议拆成如下“资源/服务”：

- **Postgres**（Railway Database）
- **Redis**（Railway Redis）
- **RabbitMQ**（Railway 模板或自建 Docker 服务）
- **对象存储**（推荐外部 S3 兼容：Cloudflare R2 / AWS S3；也可自建 MinIO）
- **API（web）**：`apps/api` 的 API 服务
- **Worker**：后台任务（Celery worker）
- **Beat**：定时任务（Celery beat）
- **Migrator（一次性）**：数据库迁移（只在首次部署/升级时运行）

如果你当前 Railway 套餐/限制导致 **同一 GitHub 仓库只能创建 1 个“代码服务”**：

- **先只部署 API（web）**，把 Postgres/Redis/MQ 跑起来，确保核心功能可用；
- Worker/Beat 后面再加（或合并进一个进程管理器，这个方案复杂度更高，不建议第一天就做）。

---

## 1. 前置准备

### 1.1 安装 Railway CLI

任选一种：

```bash
npm i -g @railway/cli
```

或（macOS）：

```bash
brew install railway
```

### 1.2 登录并绑定项目

在仓库根目录（`codePlane/`）执行：

```bash
railway login
railway init   # 如果你要新建 Railway Project
# 或
railway link   # 如果你已经有 Railway Project，要把本地目录 link 进去
```

检查当前项目/环境：

```bash
railway status
railway environments
```

---

## 2. 在 Railway 创建“数据资源”

这一步强烈建议先在 Railway Web 控制台完成（更直观），CLI 主要用来后续管理变量/部署。

### 2.1 创建 Postgres

在 Railway：New → Database → Postgres。

创建后你会拿到类似：

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

### 2.2 创建 Redis

Railway：New → Redis。

创建后你会拿到类似：

- `REDIS_HOST`
- `REDIS_PORT`
- （可选）`REDIS_PASSWORD`

### 2.3 创建 RabbitMQ（MQ）

优先：Railway 的 RabbitMQ 模板/插件（如果你的工作区没有，后面可以改成自建 Docker 的 RabbitMQ）。

你最终需要这些连接信息：

- `RABBITMQ_HOST`
- `RABBITMQ_PORT`（通常 5672）
- `RABBITMQ_USER`
- `RABBITMQ_PASSWORD`
- `RABBITMQ_VHOST`

### 2.4 对象存储（文件上传）

本仓库原本提供 `MinIO`（`plane-minio`）用来本地跑通上传。

**在 Railway 上更推荐使用外部 S3 兼容对象存储**（例如 Cloudflare R2 / AWS S3），然后在 API 中配置：

- `AWS_S3_ENDPOINT_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`

并设置：

- `USE_MINIO=0`

> 如果你一定要把 MinIO 也放 Railway，我们可以后续单独写一个 Railway Service（Docker）来跑 MinIO，并处理 bucket 初始化与持久化。

---

## 3. 部署 API（apps/api）

### 3.1 创建 API Service（推荐 Web 上创建）

Railway：New → Service → Deploy from GitHub Repo → 选择本仓库。

然后在 API Service 的设置里，选择 Docker 部署，并指定 Dockerfile 路径为：

- `apps/api/Dockerfile.api`

> 注意：不同项目/模板的 UI 命名不同。如果 UI 不支持指定 Dockerfile 路径，我们就改成在仓库根新增一个 Railway 专用 `Dockerfile`（后续我可以帮你加）。

### 3.2 设置 API 启动命令

在 `docker-compose.yml` 里，API 容器的启动命令是：

- `./bin/docker-entrypoint-api.sh`

在 Railway Service 的 Start Command（或类似字段）中设置为：

- `./bin/docker-entrypoint-api.sh`

### 3.3 端口（非常关键）

本地 compose 里 API 暴露的是 8000（`"8000:8000"`）。

在 Railway 中确保：

- 服务监听的端口是 `8000`
- 如果 Railway 需要 `PORT` 环境变量：设置 `PORT=8000`

---

## 4. 环境变量：从本地容器名迁移到 Railway 连接信息

本项目的变量主要来自：

- `codePlane/.env.example`（给 Postgres/RabbitMQ/MinIO/proxy 用）
- `codePlane/apps/api/.env.example`（给 API/worker/beat/migrator 用）

在 Railway 上，**你要把 `apps/api/.env.example` 中的关键变量设置到 API Service 的 Variables 里**，并按下面规则替换。

### 4.1 Postgres（API 侧）

把本地默认：

- `POSTGRES_HOST="plane-db"`
- `POSTGRES_PORT=5432`

替换为 Railway Postgres 的实际值：

- `POSTGRES_HOST=${PGHOST}`
- `POSTGRES_PORT=${PGPORT}`
- `POSTGRES_DB=${PGDATABASE}`
- `POSTGRES_USER=${PGUSER}`
- `POSTGRES_PASSWORD=${PGPASSWORD}`

并确保：

- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`

### 4.2 Redis（API 侧）

把本地默认：

- `REDIS_HOST="plane-redis"`
- `REDIS_PORT="6379"`

替换为 Railway Redis：

- `REDIS_HOST=${REDIS_HOST}`
- `REDIS_PORT=${REDIS_PORT}`

并设置 `REDIS_URL`：

- 如果没有密码：`REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/`
- 如果有密码：`REDIS_URL=redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/`

### 4.3 RabbitMQ（API 侧）

把本地默认：

- `RABBITMQ_HOST="plane-mq"`
- `RABBITMQ_PORT="5672"`
- `RABBITMQ_USER="plane"`
- `RABBITMQ_PASSWORD="plane"`
- `RABBITMQ_VHOST="plane"`

替换为 Railway MQ 的实际值（按你创建出来的连接信息填）。

### 4.4 CORS / 各前端 URL（先用占位，后面前端独立部署再改）

`apps/api/.env.example` 默认是本地：

- `CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3100"`
- `ADMIN_BASE_URL="http://localhost:3001"`
- `SPACE_BASE_URL="http://localhost:3002"`
- `APP_BASE_URL="http://localhost:3000"`
- `LIVE_BASE_URL="http://localhost:3100"`
- `WEB_URL="http://localhost:8000"`

第一阶段你可以先改成：

- `WEB_URL="https://<你的-api-railway-域名>"`
- `CORS_ALLOWED_ORIGINS` 先留空或先放你即将部署的前端域名（没有前端时可以先不严格限制，但不建议长期这样做）

> 等前端拆分部署完，再把 `ADMIN_BASE_URL/SPACE_BASE_URL/APP_BASE_URL/LIVE_BASE_URL` 全换成真实域名。

### 4.5 对象存储（上传）

建议先用外部 S3/R2：

- `USE_MINIO=0`
- 设置：
  - `AWS_S3_ENDPOINT_URL`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET_NAME`

---

## 5. 用 CLI 管理环境变量（模板）

你可以在 `codePlane/` 根目录执行（假设已 link 到正确的 API service）：

```bash
railway variables set \
  DEBUG=0 \
  PORT=8000
```

然后把 Postgres/Redis/MQ/S3 的变量继续 set 进去（示例，按你自己的值替换）：

```bash
railway variables set \
  POSTGRES_HOST="xxx" \
  POSTGRES_PORT="5432" \
  POSTGRES_DB="xxx" \
  POSTGRES_USER="xxx" \
  POSTGRES_PASSWORD="xxx" \
  DATABASE_URL="postgresql://xxx:xxx@xxx:5432/xxx"
```

```bash
railway variables set \
  REDIS_HOST="xxx" \
  REDIS_PORT="6379" \
  REDIS_URL="redis://xxx:6379/"
```

```bash
railway variables set \
  RABBITMQ_HOST="xxx" \
  RABBITMQ_PORT="5672" \
  RABBITMQ_USER="xxx" \
  RABBITMQ_PASSWORD="xxx" \
  RABBITMQ_VHOST="xxx"
```

```bash
railway variables set \
  USE_MINIO=0 \
  AWS_S3_ENDPOINT_URL="https://xxx" \
  AWS_ACCESS_KEY_ID="xxx" \
  AWS_SECRET_ACCESS_KEY="xxx" \
  AWS_S3_BUCKET_NAME="uploads"
```

查看变量是否生效：

```bash
railway variables
```

---

## 6. 运行数据库迁移（首次部署必做）

有两种方式：

### 方式 A：用 Railway CLI 在 API Service 环境里跑

```bash
railway run ./bin/docker-entrypoint-migrator.sh
```

> 如果 migrator 脚本需要参数（例如 local compose 里有 `--settings=...`），以脚本实际要求为准。

### 方式 B：单独创建一个 Migrator Service（一次性）

如果你更喜欢“可重复、可追踪”的方式，可以在 Railway 上建一个 `migrator` service，使用同一个 Dockerfile，但 Start Command 设为：

- `./bin/docker-entrypoint-migrator.sh`

跑完一次后关掉/缩容。

---

## 7. 部署 API

如果你已经在 Railway Web 端把 Service 绑定 GitHub，通常直接触发 Deploy 就行。

若你希望从本地用 CLI 触发部署：

```bash
railway up
```

查看运行日志：

```bash
railway logs
```

---

## 8. Worker / Beat（第二阶段）

当 API 已经能正常跑通后，再加后台任务：

- **Worker service**：Start Command → `./bin/docker-entrypoint-worker.sh`
- **Beat service**：Start Command → `./bin/docker-entrypoint-beat.sh`

它们需要与 API **同一套环境变量**（Postgres/Redis/MQ/S3 等）保持一致。

---

## 9. 常见坑（高频）

- **连接地址仍是容器名**：`plane-db` / `plane-redis` / `plane-mq` 在 Railway 不存在，必须改成 Railway 提供的 host/port。
- **端口不对**：Railway 健康检查/路由需要应用监听正确端口（本项目 API 通常是 8000）。
- **对象存储没配好**：上传相关接口会报错；第一阶段可以先不启用上传（或临时用外部 S3/R2）。
- **只部署 API 但没迁移**：数据库表不存在会直接 500，先跑 migrator/migrate。

---

## 10. 你下一步该做什么（最短路径）

1. 在 Railway 创建：Postgres、Redis、RabbitMQ（至少 Postgres+Redis）。
2. 创建 API service，指定 `apps/api/Dockerfile.api`，启动命令 `./bin/docker-entrypoint-api.sh`，端口 8000。
3. 把 `apps/api/.env.example` 的变量迁移到 Railway Variables，并把 `plane-db/plane-redis/plane-mq` 全替换成 Railway 的连接信息。
4. 跑一次迁移：`railway run ./bin/docker-entrypoint-migrator.sh`。
5. 部署并看日志：`railway up` / `railway logs`。

---

## 11. 前端 Web / Admin：打包镜像、发布、Railway 部署（域名与环境变量）

本节对应流程：**① 打成 Docker 镜像 → ② 推送到镜像仓库 → ③ 在 Railway 部署**。

### 11.1 Web：运行期环境变量（`docker run` / Railway Variables）

**Web 镜像（`apps/web/Dockerfile.web`）** 在构建时**不再**要求传入 `VITE_*`。容器启动时，入口脚本根据 **环境变量** 生成 `/runtime-env.js`，浏览器在加载应用前执行该脚本，将 `window.__PLANE_RUNTIME_CONFIG__` 设为与 `VITE_*` 同名的键（见 `apps/web/nginx/docker-entrypoint.sh`）。

- **默认值**与 `apps/web/.env.example` 一致（本地开发地址）；未设置时使用这些默认。
- **覆盖方式**：`docker run -e VITE_API_BASE_URL=https://api.example.com ...`，或在 Railway 的 **Variables** 里添加同名变量（**不需要**勾选 Build Time）。
- **`PORT`**：Railway 自动注入；入口脚本将 nginx 监听端口改为 `$PORT`。

本地开发与 `pnpm dev` 仍使用 `apps/web/.env` → `import.meta.env`；Docker 中由运行时脚本优先生效。

### 11.2 Admin：仍为构建期注入（当前 Dockerfile）

**Admin 镜像（`apps/admin/Dockerfile.admin`）** 仍通过 **`docker build --build-arg VITE_*=...`**（或 Railway 构建变量 + **Available at Build Time**）传入 URL；与 Web 行为不同，部署 Admin 时需按该 Dockerfile 的 `ARG` 准备构建参数。

### 11.3 构建期 vs 运行期对照

| 类型                               | Web 镜像                        | Admin 镜像（当前）                      |
| ---------------------------------- | ------------------------------- | --------------------------------------- |
| `VITE_*` 域名/API 等               | **容器运行时**环境变量          | **构建镜像时** `--build-arg` 或构建变量 |
| `PORT`                             | **运行时**（Railway 注入）      | **运行时**（同上）                      |
| API 的 `CORS_*`、`APP_BASE_URL` 等 | **API 服务**变量，见上文第 4 节 | 同左                                    |

### 11.4 ① 在仓库根目录构建镜像

上下文必须是 **monorepo 根目录**（`.`），否则 `turbo prune` 无法工作。

**Web（无需为域名传 build-arg）：**

```bash
cd /path/to/codePlane

docker build -f apps/web/Dockerfile.web -t YOUR_REGISTRY/plane-web:TAG .
```

**Admin（仍需 build-arg，示例）：**

```bash
docker build -f apps/admin/Dockerfile.admin -t YOUR_REGISTRY/plane-admin:TAG \
  --build-arg VITE_API_BASE_URL="https://你的API域名" \
  --build-arg VITE_API_BASE_PATH="/api" \
  --build-arg VITE_WEB_BASE_URL="https://你的主站域名" \
  --build-arg VITE_ADMIN_BASE_URL="https://你的主站域名" \
  --build-arg VITE_ADMIN_BASE_PATH="/god-mode" \
  --build-arg VITE_SPACE_BASE_URL="https://你的Space域名" \
  --build-arg VITE_LIVE_BASE_URL="https://你的Live域名" \
  .
```

若 Admin 与 Web 同域、仅路径不同（例如主站 `https://app.example.com`，管理台 `https://app.example.com/god-mode`），则 `VITE_ADMIN_BASE_URL` 应与主站根 URL 一致，与本地 `.env.example` 写法相同。

### 11.5 ② 发布镜像

登录镜像仓库（示例：Docker Hub、GitHub Container Registry `ghcr.io`），打标签并推送：

```bash
docker login YOUR_REGISTRY

docker push YOUR_REGISTRY/plane-web:TAG
docker push YOUR_REGISTRY/plane-admin:TAG
```

**架构（常见踩坑）**：在 **Apple Silicon（M 系列）或 ARM 机器**上默认构建出的是 **`linux/arm64`** 镜像；多数云端（Zeabur、Railway、部分 K8s）节点为 **`linux/amd64`**，会报「镜像没有 amd64 变体」。本地或 CI 推镜像前请显式指定：

```bash
docker build --platform linux/amd64 -f apps/web/Dockerfile.web -t YOUR_REGISTRY/plane-web:TAG .
```

推送后用 `docker manifest inspect YOUR_REGISTRY/plane-web:TAG` 确认含 `amd64`。

CI 可参考 `.github/workflows/build-branch.yml` 中的 `branch_build_push_web` / `branch_build_push_admin`（构建上下文为 `.`，Dockerfile 路径同上）。

### 11.6 ③ 在 Railway 部署

**方式 A：使用已推送的镜像（推荐与「先本地/CI 构建再部署」一致）**

1. Railway：**New → Empty Service**（或 Project 内 **New Service**）。
2. **Settings → Source**：选择 **Docker Image**，填入 `YOUR_REGISTRY/plane-web:TAG`（Admin 同理再建一个 Service）。
3. **Networking**：生成公网域名或绑定自定义域名。
4. **Variables（Web）**：在 Railway 中为 **Web 服务**设置 `VITE_API_BASE_URL`、`VITE_WEB_BASE_URL` 等（与 `docker-entrypoint.sh` 中变量名一致）；**无需**勾选 Build Time。Railway 会自动提供 **`PORT`**。

**方式 B：连接 GitHub，由 Railway 在云端构建**

1. **New → GitHub Repo**，选中本仓库。
2. **Settings → Build**：**Dockerfile Path** 填 `apps/web/Dockerfile.web` 或 `apps/admin/Dockerfile.admin`；**Root Directory** 可留空（构建上下文需为仓库根，与 Dockerfile 中 `COPY . .` 一致；若 Railway 提供「Context」选项，应选仓库根）。
3. **Web**：构建阶段**不需要**为 `VITE_*` 配置构建变量；部署后在 **Variables** 中设置运行时变量即可。
4. **Admin**：若 Dockerfile 仍含 `ARG VITE_*`，需在 **Variables** 中勾选 **Available at Build Time** 并传入，或改用预构建镜像。
5. 触发部署；Web 改域名时**重新部署**即可（会拉新镜像或重启容器），**无需**为 Web 重新构建以改 URL。

### 11.7 与 API、反向代理对齐

部署完 Web/Admin 后，在 **API 服务**的 Variables 中更新（示例）：

- `CORS_ALLOWED_ORIGINS`：包含主站、Admin、Space、Live 等前端来源的完整 HTTPS URL（逗号分隔）。
- `APP_BASE_URL`、`ADMIN_BASE_URL`、`SPACE_BASE_URL`、`LIVE_BASE_URL`：与你在 `VITE_*` 里配置的对外 URL 一致。

若使用 Railway 多服务 + 自有网关/反代，请保证浏览器访问的 **页面域名** 与上述变量一致，否则会出现跨域或跳转错误。

### 11.8 仅用 Compose 验证本地镜像（可选）

仓库根目录构建完成后，可用环境变量指定镜像名做冒烟（见 `apps/web/docker-compose.hub.yml`、`apps/admin/docker-compose.hub.yml`）：

```bash
PLANE_WEB_IMAGE=YOUR_REGISTRY/plane-web:TAG PLANE_WEB_PUBLISH_PORT=3000 \
  docker compose --project-directory apps/web -f apps/web/docker-compose.hub.yml up
```
