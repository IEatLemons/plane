# 本地开发与测试指南

本文档说明如何在本地一键启动 Plane 并进行测试，避免遗漏步骤。

---

## 一、前置要求

- **Docker** 已安装并运行
- **Node.js 20+**（用于 `pnpm`，若只用 Docker 跑前端可暂不严格要求）
- **pnpm**（执行 `corepack enable pnpm` 或通过 Node 安装）
- **内存**：建议 12GB+，8GB 可能在建镜像或启动时失败

---

## 二、推荐方案：全 Docker 启动（一条命令跑齐）

适合：想尽快在浏览器里看到完整产品、不做前端热更新也没关系。

### 1. 首次准备（只需做一次）

在项目根目录执行：

```bash
# 复制各服务的 .env，并生成 API 的 SECRET_KEY、安装 Node 依赖
chmod +x setup.sh
./setup.sh
```

若没有 `setup.sh`，可手动：

- 把 `.env.example` 拷成 `.env`，把 `apps/api/.env.example` 拷成 `apps/api/.env`，其它 `apps/*/` 同理。
- 在 `apps/api/.env` 里加一行：`SECRET_KEY="随机字符串"`。
- 根目录执行：`pnpm install`。

### 2. 启动所有服务（含数据库迁移）

```bash
# 先跑一次数据库迁移（migrator 只跑一次就退出）
docker compose -f docker-compose-local.yml up -d plane-db plane-redis plane-mq plane-minio
docker compose -f docker-compose-local.yml run --rm migrator

# 再启动全部（API、Worker、Web、Admin、Space、Live 等）
docker compose -f docker-compose-local.yml up -d
```

若希望日志在前台看，可把最后一句改成：

```bash
docker compose -f docker-compose-local.yml up
```

### 3. 首次访问顺序（重要）

1. **先注册「实例管理员」**  
   打开：**http://localhost:3001/god-mode/**  
   在这里注册的账号即实例管理员，用于后续登录主应用。

2. **再登录主应用**  
   打开：**http://localhost:3000**  
   用上一步的账号登录即可使用工作区、项目等。

这样就不会出现「无法获取实例信息」等连通性问题。

### 4. 端口一览

| 服务       | 端口        | 说明                      |
| ---------- | ----------- | ------------------------- |
| Web 主应用 | 3000        | 日常使用 / 登录           |
| Admin 管理 | 3001        | 实例设置、先注册管理员    |
| Space      | 3002        | 文档/知识库等             |
| Live       | 3003        | 实时协作                  |
| API        | 8000        | 后端接口                  |
| MinIO      | 9000 / 9091 | 存储 / 控制台             |
| PostgreSQL | 5432        | 数据库（一般不需直连）    |
| Redis      | 6380        | 宿主机映射（容器内 6379） |

---

## 三、可选方案：仅后端 Docker + 前端本地跑（热更新）

适合：主要改 Web/Admin 前端，需要热更新。

1. **只启动基础设施与后端**（不启动 web/admin/space 容器）：

   ```bash
   docker compose -f docker-compose-local.yml up -d plane-db plane-redis plane-mq plane-minio api worker beat-worker
   # 迁移（若未跑过）
   docker compose -f docker-compose-local.yml run --rm migrator
   ```

2. **前端在宿主机用 pnpm 跑**：

   ```bash
   pnpm dev
   # 或只跑 web： pnpm dev:web
   ```

   此时 Web 会占用本机 3000，需保证 `apps/web/.env` 里 API 地址指向 `http://localhost:8000`（与 Docker 暴露的 API 一致）。

3. 访问方式同上：先 **http://localhost:3001/god-mode/** 注册，再 **http://localhost:3000** 登录。

---

## 四、常用命令

```bash
# 查看各容器状态
docker compose -f docker-compose-local.yml ps

# 只看 Web 日志（排查 3000 打不开时很有用）
docker compose -f docker-compose-local.yml logs -f web

# 停止全部
docker compose -f docker-compose-local.yml down

# 停止并删数据卷（慎用，会清空数据库）
docker compose -f docker-compose-local.yml down -v
```

---

## 五、常见问题

### 1. 浏览器访问 3000/3001 显示「无法访问此网站」或 Connection reset

- 原因：容器内 dev server 只监听了 `127.0.0.1`，宿主机访问不到。
- 处理：本项目已为 web/admin/space 的 dev 脚本加了 `--host 0.0.0.0`，并给 web 容器配置了 `RR_DEV_SERVER_HOST=0.0.0.0`。若仍不行，可执行：
  ```bash
  docker compose -f docker-compose-local.yml up -d --build web admin space
  ```
  再查看日志里是否出现 `http://0.0.0.0:3000` 等。

### 2. 打开 3000 后提示「无法获取实例信息」/ 连通性错误

- 原因：未先完成实例管理员注册，或 API 未就绪。
- 处理：先访问 **http://localhost:3001/god-mode/** 注册，再访问 **http://localhost:3000**；并确认 API 容器正常：`curl -s http://localhost:8000/api/health/` 或类似健康检查。

### 3. 启动后 3000 端口没有进程在监听

- 宿主机执行：`lsof -iTCP:3000 -sTCP:LISTEN`
- 若没有输出，说明本机没有监听 3000；若用 Docker，应看到 `com.docke` 或 `docker-pr`。若没有，检查 `docker compose -f docker-compose-local.yml ps` 里 web 是否 Up，再 `docker compose -f docker-compose-local.yml logs web` 看是否有报错。

### 4. 邀请成员逻辑

- 当前行为：在「邀请成员」里添加邮箱并提交后，**只会在后台创建邀请记录，不会自动发邮件**；被邀请人可在登录后通过「我的工作区邀请」等入口自行完成加入。详见项目内对 `WorkspaceInvitationsViewset.create` 的修改说明。

---

## 六、小结：最少步骤本地测试

1. 根目录执行：`./setup.sh`（首次）
2. 启动并跑迁移：  
   `docker compose -f docker-compose-local.yml up -d`，再 `docker compose -f docker-compose-local.yml run --rm migrator`（若未跑过）
3. 浏览器先打开 **http://localhost:3001/god-mode/** 注册管理员
4. 再打开 **http://localhost:3000** 登录使用

遇到问题时，先看 `docker compose -f docker-compose-local.yml ps` 和 `logs web` / `logs api` 可快速定位。
