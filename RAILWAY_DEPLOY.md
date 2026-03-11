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
