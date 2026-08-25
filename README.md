# LifeHub · 集成式生活工作台

> 一个把「记账理财、习惯健康、减脂健身、日程统筹、待买清单、书影音收藏」收纳进同一张工作台的生活系统。数据真正存在云端（Cloudflare KV），换设备、换浏览器都还在，不依赖浏览器本地存储。

## 功能模块

- **今日概览**：本月收支、预算剩余、习惯完成率、最新体重、待买数量，以及「今天要处理」待办聚合（逾期红色置顶、一键完成）。
- **记账理财**：收支记录、月度预算、分类饼图、分类筛选（涨→红 / 跌→绿，¥ 计价）。
- **习惯健康**：自定义增删习惯，支持「勾选 / 计数 / 数值」三种打卡方式，含近 30 天热力图。
- **减脂健身**：体重体脂记录、7 日均线、BMI、目标进度、热量缺口估算、可自定义周计划。
- **日程统筹**：优先级标记，逾期自动标红。
- **待买清单**：简单增删与一个「已买」切换。
- **书影音收藏**：状态、星级、短评，封面墙 / 列表双视图，年度统计。

## 技术架构

- **前端**：单页应用（`public/index.html`），纯原生 HTML/CSS/JS，无任何构建步骤。
- **后端（云端）**：Cloudflare Pages Functions（`functions/api/[[path]].js`），REST 接口与本地 Node 服务完全一致（`GET/POST/PUT/DELETE /api/<collection>?id=`）。
- **存储**：Cloudflare KV（绑定名 `LIFE_DB`），所有集合以 JSON 存于单一键，非浏览器 localStorage。
- **本地开发**：`server.js` 提供等价的 Node 服务（文件持久化），便于离线调试。

前端始终通过相对路径 `/api/...` 访问数据，因此同一份前端既能对接本地后端，也能直接对接 Cloudflare 函数，无需改动代码。

## 本地开发

```bash
# 启动本地服务（默认 http://localhost:8787）
node server.js
```

打开 `http://localhost:8787` 即可使用；数据写入 `data/store.json`。

## 部署到 Cloudflare Pages（从 GitHub 构建）

1. 将本仓库连接到 Cloudflare Pages（Connect to Git → 选择本仓库）。
2. 构建设置：**构建命令留空**，**输出目录填 `public`**。
3. 在 Cloudflare 控制台新建一个 **KV 命名空间**（例如 `lifehub-db`），复制它的命名空间 ID（32 位十六进制）。
4. 进入 Pages 项目 **设置 → 函数 → KV 命名空间绑定**，添加一个绑定：变量名填 `LIFE_DB`，命名空间选刚创建的那个。
5. 保存后**重新部署一次**（Deployments → 对应记录 Retry / 或 Push 一次触发）。
6. 部署成功后获得公网域名，数据存在于 Cloudflare KV，多设备实时同步。

> 重要：`wrangler.toml` 中**不要保留 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 占位符**——Cloudflare 会在「发布 Function」阶段校验该 ID，占位符会导致 `Invalid KV namespace ID` 报错。KV 绑定统一在控制台 Dashboard 完成，无需在文件里写 ID。

> 说明：Cloudflare Pages Functions + KV 可以零服务器运维地承载这个应用；KV 为最终一致性，对个人量级完全够用。若后续需要更强查询能力，可平滑迁移到 D1（SQLite）。

## 数据结构

所有集合（`finance` / `habits` / `fitness` / `fitness_plan` / `schedule` / `shopping` / `media` / `settings`）均存于 KV 键 `store` 中的同名数组。

## 文件结构

```
public/index.html        # 前端单页
functions/api/[[path]].js# 云端 API（Cloudflare Pages Functions）
server.js                # 本地开发用 Node 服务
wrangler.toml           # Cloudflare 配置（含 KV 绑定）
data/store.json         # 本地开发数据（部署时不需要）
```
