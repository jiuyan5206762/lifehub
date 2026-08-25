# 生活工作台 · Bug 检查与修复清单

对 `public/index.html`、`server.js`、`functions/api/[[path]].js` 做了一次完整审查，修复了以下真实 bug（均已推送 GitHub，提交 `b79b689`）。

## 已修复

### 1. 预算保存后概览不显示（核心 bug）
- **位置**：`functions/api/[[path]].js` 与 `server.js` 的 POST 处理
- **原因**：服务端收到数据后强制覆盖 `obj.id = uid()`，把前端传入的固定 id（`'budget'`）改成了随机串，导致 `renderOverview` 按 `id==='budget'` 查找永远落空，显示「未设」。
- **修复**：POST 仅在未传 id 时自动生成，保留前端固定 id。

### 2. CSS 语法错误（标题 margin 失效）
- **位置**：`index.html` 第 37 行 `.ov-head h2{margin:,font-size:18px}`
- **修复**：改为 `margin:0;font-size:18px`。

### 3. 身高输入框布局错位
- **位置**：减脂模块 `p_height` 字段 `flex:0 ,0 120px`（逗号分隔错误）
- **修复**：改为 `flex:0 0 120px`。

### 4. 待买清单容器丢失样式
- **位置**：`<div class (list)" id="buyList">` 属性名写错
- **修复**：改为 `class="list"`，恢复列表间距/分隔线。

### 5. 今日待办标签显示「undefined」
- **位置**：`renderOverview` 待办渲染 `${t.overdue?'逾期':t.label}`，`t.label` 未定义
- **修复**：改为 `'逾期':'待办'`。

### 6. 导入功能重复创建记录
- **位置**：`importData`，对所有条目一律 POST，会导致固定 id（budget/plan）重复写入
- **修复**：若已存在同 id 则改为 PUT 更新。

### 7. 时区导致「今天」算错（中国用户关键）
- **位置**：`today` 用 `new Date().toISOString()`（UTC），国内凌晨会算成前一天，导致记账/习惯/月度统计归类错误
- **修复**：新增 `localDate()` 用本地时区计算日期，热力图同步修正。

## 待后续 / 说明
- 本地 `server.js` 与 Cloudflare 函数逻辑已保持一致。
- Cloudflare 构建为全自动，推送后约 1-2 分钟生效；在线预览以 GitHub 仓库为准（https://github.com/jiuyan5206762/lifehub）。
- 之前那条 GitHub 令牌已多次用于推送，建议到 GitHub → Developer settings → PAT 轮换/撤销。
