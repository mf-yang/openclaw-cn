# Changelog

Docs: https://clawd.org.cn/

## Unreleased

### bug修复

- **修复公网 IP 直连 Control UI 时 WebSocket 断开 (1006)**：通过 `http://<公网 IP>:端口` 访问控制台时，浏览器 `Origin` 为公网主机，原 CSWSH 白名单未包含该情形，WebSocket 升级返回 403，页面表现为 `disconnected (1006)`。另：非本机访问时 `localStorage` 可能仍保存指向 `127.0.0.1` 或其它主机的 `gatewayUrl`，导致连错网关。修复：`isValidWebSocketOrigin()` 在 `Origin` 与请求头 `Host` 同源（`http(s)://` + Host，大小写不敏感）时放行；在 Control UI 的 `index.html` 中于入口模块之前加载 `gateway-host-fix.js`（`ui/public`），在应用启动前从 URL 写入 token、按需纠正 `gatewayUrl`。

## 0.2.0

### 新增功能

- **新增 ePhone AI 模型供应商**：在模型配置向导中新增 [ePhone AI](https://platform.ephone.ai) 聚合平台，置顶为默认推荐供应商。兼容 OpenAI 协议（`https://api.ephone.ai/v1`），预设 claude-sonnet-4-6、claude-opus-4-6、MiniMax-M2.7、gpt-5.4、kimi-k2.5 五个可选模型，同时支持手动输入任意模型 ID。配置文档：https://clawd.org.cn/providers/ephone.html

- **模型配置向导支持动态模型发现**：配置模型供应商时，自动从供应商 API（`/v1/models`）获取可用模型列表并展示在选择界面中。支持的供应商：ePhone AI、MiniMax、Moonshot（国际/.cn）、DeepSeek、阿里云百炼（DashScope）、硅基流动（SiliconFlow）、火山引擎（ARK + Coding Plan）、Z.AI（智谱）、小米 MiMo。API 不可达时自动降级到静态模型列表

- **重新排列供应商选择顺序**：配置向导中供应商列表按区域分组：国内模型厂商（MiniMax、Moonshot、DeepSeek、阿里云百炼、硅基流动、火山引擎、Z.AI、小米、通义千问）优先展示，国际厂商和通用选项排在后面

- **修复多个供应商配置后多余的模型选择步骤**：Moonshot、Z.AI、小米、火山引擎、MiniMax 等供应商在配置流程中已内置模型选择，但之前配置完成后仍会弹出通用的 `promptModelAllowlist` 步骤。现已将这些供应商加入 early-return 列表，避免重复选择

### bug修复

- **修复 Windows 全局安装后 CLI 启动报 `Cannot find package 'strip-ansi'`**（#538）：上游依赖 `@mariozechner/pi-coding-agent` 的 `bash-executor.js` 中直接 `import stripAnsi from "strip-ansi"`，但未将 `strip-ansi` 声明为 `dependencies`（幽灵依赖）。pnpm 工作区下因提升机制可正常解析，但通过 `npm install -g openclaw-cn` 全局安装时 npm 的扁平化 `node_modules` 不会安装未声明的传递依赖，导致运行时 `ERR_MODULE_NOT_FOUND`。修复方案：在 `package.json` 中将 `strip-ansi` 添加为直接依赖，确保全局安装时始终可用。感谢 @bolong2016 🙏
- **修复对话页面输入区渐变产生深色蒙层**（#537）：`.chat-compose` 的背景渐变使用 CSS `transparent`（等同于 `rgba(0,0,0,0)` 即透明黑色），浏览器在 sRGB 空间从透明黑色插值到浅色背景时会经过半透明灰色，产生可见的深色条带覆盖对话内容。修复方案：新增 `--bg-transparent` / `--bg-content-transparent` CSS 变量（与背景色同色但 alpha 为 0），替换所有渐变中的 `transparent` 关键字，确保插值始终在同一色相内过渡。感谢 @hyydmmhy 🙏
- **修复 Tailscale 直连网关时 WebSocket 断开 (1006)**（#527）：当网关配置 `bind: "tailnet"` 绑定到 Tailscale IP（如 `100.x.x.x`）时，浏览器访问控制台页面后 WebSocket 升级请求的 Origin 为 Tailscale IP，但 `isValidWebSocketOrigin()` 的 CSWSH 白名单仅包含 localhost/127.x/\*.ts.net，导致返回 403 + socket.destroy()，浏览器收到 1006 异常关闭。修复方案：在 Origin 白名单中新增 Tailscale IP 范围（100.64.0.0/10 IPv4 + fd7a:115c:a1e0::/48 IPv6）。感谢 @crossgg 🙏

## 0.1.9

### 文档

- **修复 README 中多个文档链接 404 问题**（#513）：更正快速开始、渠道接入、飞书/钉钉/企业微信/QQ 渠道、技能开发等链接路径。感谢 @lvjianchaos 🙏

### bug修复

- **修复 `sudo gateway install` 报 exit 125 错误**：`sudo openclaw gateway install` 时，`process.getuid()` 返回 `0`（root），导致 launchctl 目标 domain 变为 `gui/0`。root 没有 GUI 登录 session，`launchctl bootstrap gui/0` 因此报 `Bootstrap failed: 125: Domain does not support specified action`。修复方案：`resolveGuiDomain()` 优先读取 `SUDO_UID` 环境变量（sudo 自动设置），确保 bootstrap 始终指向原始用户的 `gui/<uid>` domain

- **修复非 GUI 会话下 `gateway install` 报 exit 125 错误**：在 SSH 连接或无 GUI 登录的 macOS 用户下安装网关时，`launchctl bootstrap gui/<uid>` 因 `gui/<uid>` domain 不存在而报 `Bootstrap failed: 125`。修复方案：当检测到 launchd 125 错误时，自动降级到 `launchctl load -w`（macOS 兼容方案），服务立即启动，并在用户下次 GUI 登录时自动激活

- **修复 `--port` 参数安装后端口不生效问题（根本修复）**：`LEGACY_GATEWAY_LAUNCH_AGENT_LABELS` 包含 `com.clawdbot.gateway`（与当前 label 相同），legacy 清理循环会 `fs.unlink` 删除当前 plist 文件，导致后续主 teardown 的 `unload -w` 无文件可操作（no-op），旧服务的 launchd 注册未被清除，新 `load -w` / `bootstrap` 检测到同名 label 已存在也变成 no-op，进程始终以旧端口启动。修复方案：legacy 循环跳过当前 label（由主 teardown 处理），确保 plist 文件在 `unload -w` 前始终存在

- **修复 SSH 会话中无法卸载/替换 GUI 会话加载的 LaunchAgent**：通过 SSH 执行 `gateway install --port 18790` 时，如果该服务之前是通过 GUI 登录会话加载的（`launchctl load/bootstrap gui/<uid>`），SSH 会话中的 `bootout gui/<uid>/label` 和 `unload -w` 命令均无法触达该服务（macOS launchd 跨域隔离），导致旧进程持续运行。修复方案：所有 launchd 卸载/停止/检测操作优先使用 `launchctl remove <label>`（无需指定 domain，跨上下文可靠），`launchctl list <label>` 替代 `launchctl print domain/label` 做存在性检测，确保从 SSH、sudo、GUI 任意上下文均可正确管理服务

### 微信官方插件渠道支持

- **新增微信渠道（`@tencent-weixin/openclaw-weixin`）**：新增微信官方插件渠道 `@openclaw-cn/openclaw-weixin`，通过腾讯官方 `openclaw-weixin` 接入微信个人号。配置向导支持一键安装插件、自动启用渠道配置，并引导用户通过扫码完成微信登录
- **plugin-sdk 新增运行时命令授权工具函数**：为官方微信插件导出 `resolveSenderCommandAuthorizationWithRuntime`（基于 runtime 对象的命令授权）、`resolveDirectDmAuthorizationOutcome`（DM 授权结果判定），修复官方插件消息处理时 `is not a function` 崩溃
- **plugin-sdk 新增临时目录解析函数**：导出 `resolvePreferredOpenClawTmpDir`，修复官方微信插件加载时因缺少该函数导致的启动崩溃
- **插件运行时新增 `withReplyDispatcher` 方法**：在 `PluginRuntime.channel.reply` 中新增 `withReplyDispatcher` 生命周期包装器，确保回复分发完成后所有排队消息被刷新，修复官方微信插件处理消息时 `withReplyDispatcher is not a function` 报错
- **配置向导模型选择过滤优化**：修复配置向导中选择百炼等自定义 Provider 时显示所有模型而非仅该 Provider 模型的问题。修复方案：在过滤前将 config 中的自定义 Provider 模型补充到 SDK 目录中，确保按 Provider 筛选时能正确显示对应模型列表
- **修复微信插件子路径导入报错**：修复 `@tencent-weixin/openclaw-weixin` 插件加载时报 `Cannot find module '.../plugin-sdk/index.js/channel-config-schema'` 的问题。根本原因：jiti 别名指向 `plugin-sdk/index.js`（文件）而非目录，导致子路径导入被拼接为无效路径。修复方案：`resolvePluginSdkAlias()` 返回目录路径；新增 `plugin-sdk/channel-config-schema.ts` 子路径模块
- **新增 plugin-sdk 全部子路径模块**：为微信官方插件 v2.0.1 补齐所有子路径导入模块（`account-id`、`channel-contract`、`channel-runtime`、`command-auth`、`config-runtime`、`core`、`infra-runtime`、`plugin-entry`、`reply-runtime`、`text-runtime`），包含 `withFileLock` 文件锁工具函数和 `loadConfig`/`writeConfigFile` 配置读写函数导出，以及 `OpenClawConfig`/`OpenClawPluginApi` 类型别名映射
- **修复微信插件版本兼容性检查失败**：微信插件 v2.0.1 要求主机版本 `>=2026.3.22`（上游日期格式），而 openclaw-cn 使用 `0.x` 版本号导致检查不通过。修复方案：在 `package.json` 中新增 `openclawVersion` 字段（`2026.3.24`），`PluginRuntime.version` 优先读取该字段，使第三方插件的版本兼容性检查正常通过

### Web UI 功能增强

- **Web UI 对话页面新增模型切换功能**：在对话页面右上角控制栏新增模型下拉选择器，支持在已配置的模型间快速切换。下拉列表显示「默认 (模型名)」选项及所有白名单允许的模型（含自定义 Provider 模型），格式为 `模型名 · 提供商`；选择后通过 `/model` 指令自动切换当前会话模型
- **`models.list` RPC 返回白名单过滤结果**：Gateway 的 `models.list` 接口现在通过 `buildAllowedModelSet` 过滤，仅返回用户配置白名单中允许的模型（而非全部已发现模型），同时包含自定义 Provider 中不在标准目录的模型条目，并附带 `defaultModel`/`defaultProvider` 信息

## 0.1.8

### bug修复（0.1.8 热补丁）

- **Windows 插件路径验证误报修复**（`0.1.8-fix.3`）：修复在 Windows 上全局安装的插件（如飞书、钉钉、企业微信、QQ）启动时报 `plugin: openclaw.extensions entry resolves outside package directory` 导致配置无效的问题。根本原因：`isPathInsideWithRealpath` 在 Windows 含短路径（8.3 格式）或 junction 点的目录上调用 `realpathSync` 会抛异常，旧逻辑直接返回 `false` 拒绝合法路径。修复方案：异常时回退到词法路径比较，而非拒绝

- **Windows 插件安装崩溃修复**：修复在 Windows 环境下运行配置向导安装飞书/钉钉/企业微信等插件时，`npm pack` 子进程触发 `spawn EINVAL` 错误导致向导直接退出的问题。根本原因一：`stdin: inherit` 在非 TTY 环境下 Windows 不允许（`0.1.8-fix.1` 已修复）。根本原因二（`0.1.8-fix.2`）：`.cmd` 批处理文件在 Windows 上不能被直接 `spawn`，必须通过 `cmd.exe /d /s /c` 包装执行。修复方案：新增 `resolveCommandArgv()` 函数，在 Windows 上对 `npm`/`pnpm` 等命令自动用 `cmd.exe` 包装，消除 `spawn EINVAL`
- **SIGUSR1 重启后插件不重载修复**：修复 `openclaw-cn gateway restart` 或发送 SIGUSR1 后，飞书等 npm 安装的插件无法重新加载导致连接断开的问题。根本原因：`loader.ts` 新增的"source 文件不存在时跳过捆绑壳"逻辑错误地调用了 `seenIds.set(pluginId, "bundled")`，导致后续同 id 的 npm 安装版本被判定为重复而跳过。修复方案：source 不存在时不占用 `seenIds`，让 npm 安装版本正常加载

### 飞书插件 npm 独立分发

- **飞书插件切换为 npm 独立分发**：飞书渠道插件（`@openclaw-cn/feishu`）不再随主包捆绑，改为通过 npm 独立下载安装。配置向导中仅保留「npm 下载」和「跳过」两个选项，移除了「使用本地插件路径」选项，简化安装流程
- **插件发现管线改进**：修复捆绑插件 `dist/` 目录缺失时产生大量 Config warnings 的问题；对于仅有 `npmSpec` 元数据的插件，即使入口文件不存在也能正确生成安装目录条目，确保配置向导可发现并引导用户安装
- **插件注册去重优化**：修复同一插件同时存在捆绑版和 npm 安装版时产生 "duplicate plugin id" 警告刷屏的问题。低优先级的捆绑来源在高优先级来源已注册时静默跳过，不再输出冗余诊断信息

### 新功能

- **配置向导新增 Ollama 本地模型选项**：`configure` 引导中新增「Ollama (本地)」配置项，预设 `baseUrl: http://127.0.0.1:11434`、`api: ollama`，只需填入模型 ID 即可完成配置，无需手动编辑 JSON（#482）
- **新增 `openclaw` 命令别名**：安装 `openclaw-cn` 后同时注册 `openclaw` 命令，上游教程中的 `openclaw xxx` 命令可直接复制执行，无需替换为 `openclaw-cn`
- **持久化命令队列**：新增基于 SQLite 的持久化队列后端，支持进程重启后自动静默恢复未完成任务，避免向用户发送「服务已重启，请重新发送」的扰人通知。通过 `queue.mode: "persistent"` 启用，默认保持 `memory` 模式（向后兼容）；`better-sqlite3` 作为可选依赖，未安装时自动降级并给出友好提示。同步修复了队列 drop 策略（`drop: "old"/"summarize"`）在持久化模式下被丢弃的消息重启后「复活」的 bug（#323，感谢 @dragonforce2010）
- **阿里云百炼 Coding Plan 模型选择优化**：配置向导中的阿里云百炼（Coding Plan）由"使用默认模型 Yes/No"改为完整的模型选择列表，支持官方文档中的全部模型：`qwen3.5-plus`、`qwen3-max-2026-01-23`、`qwen3-coder-next`、`qwen3-coder-plus`（千问系列）、`glm-5`、`glm-4.7`（智谱）、`kimi-k2.5`（Kimi）、`MiniMax-M2.5`（MiniMax），并保留手动输入自定义模型 ID 的选项（#469）

### 飞书官方插件支持

- **飞书官方插件（`@larksuiteoapi/feishu-openclaw-plugin`）集成**：配置向导新增「飞书官方插件」安装选项，默认选中并排在首位；安装后自动以兼容官方插件的扁平格式（`channels.feishu.appId` / `appSecret`）写入配置，同时保留社区插件所需的嵌套格式兼容
- **配对（Pairing）系统修复**：修复 `pairing approve` 后飞书仍提示「访问未配置」的问题。根本原因：消息处理时仅读取 channel-level `feishu-allowFrom.json`，而 approve 写入的是 account-scoped `feishu-default-allowFrom.json`。修复方案：同时读取 channel-level、`default`-scoped 和 accountId-scoped 三个 allowFrom 文件并合并
- **plugin-sdk 新增命令授权工具函数**：为官方飞书插件导出 `resolveSenderCommandAuthorization`、`isNormalizedSenderAllowed`，修复官方插件消息处理时 `is not a function` 崩溃
- **插件加载容错**：修复源码目录型（无 `dist/index.js`）捆绑插件加载报错的问题，改为静默跳过
- **插件去重优化**：修复同一插件同时存在捆绑版和 npm 安装版时产生 "duplicate plugin id" 警告的问题
- **Control UI CSP 修复**：允许从 `fonts.googleapis.com` / `fonts.gstatic.com` 加载字体，解决 Web UI 字体被 Content Security Policy 拦截的问题
- **`readChannelAllowFromStore` 合并读取修复**：修复 `pairing approve` 写入 account-scoped `feishu-default-allowFrom.json` 而官方插件读取 channel-level `feishu-allowFrom.json` 导致批准后仍提示未配对的问题。现在读取时自动合并两个文件，保证官方插件和社区插件都能识别已批准的发送者
- **`readAllowFromStore` 签名修复**：修复 gateway runtime 将 `readAllowFromStore` 直接赋值为 `readChannelAllowFromStore`（位置参数），而官方插件以对象形式调用 `readAllowFromStore({ channel, accountId })`，导致 `accountId` 被误当作 `channel` 参数、永远读取错误文件的问题。现在 runtime 注入的是正确包装的对象参数签名

### 钉钉官方连接器渠道支持

- **新增钉钉渠道（`dingtalk-real-ai/dingtalk-connector`）**：新增钉钉官方连接器渠道插件 `@openclaw-cn/dingtalk-connector`，通过官方 `dingtalk-connector` 接入钉钉机器人。配置向导支持交互式设置必填项：`clientId`（钉钉应用 Client ID）、`clientSecret`（Client Secret）、`gatewayToken`（Gateway 认证 Token）；配置完成后自动在 `channels.dingtalk-connector` 写入凭证，并确保 `gateway.http.endpoints.chatCompletions.enabled = true` 满足官方连接器要求

### 企业微信官方插件渠道支持

- **新增企业微信渠道（`@wecom/wecom-openclaw-plugin`）**：新增企业微信官方连接器渠道插件 `@openclaw-cn/wecom-connector`，配置向导支持交互式设置必填项：`botId`（企业微信机器人 ID）、`secret`（机器人密钥）；配置完成后自动在 `channels.wecom` 写入凭证

### QQ 机器人渠道支持

- **新增 QQ 渠道（`@sliverp/qqbot`）**：新增 QQ 机器人渠道插件 `@openclaw-cn/qqbot`，通过社区版 `qqbot` 接入 QQ 频道/群机器人。配置向导支持交互式设置必填项：`appId`（QQ 机器人 AppID）、`clientSecret`（AppSecret）；配置完成后自动在 `channels.qqbot` 写入凭证

### bug修复

- **DM 多 Agent 内容路由**：新增 `agents.list[].dmChat.mentionPatterns` 配置项，支持在私信（DM）场景下通过消息关键词/正则将消息路由到指定 Agent；修复 `DmConfig` 类型缺少 `mentionPatterns` 字段导致配置无效的问题（#460）
- **飞书多机器人群 @ 检测修复**：修复一群多 Agent 时 `@机器人` 路由错误的问题。根本原因：`/bot/v3/info` 返回的是机器人的「应用身份」`open_id`，而群消息 `mentions` 中携带的是「用户身份」`open_id`，两者不同导致 `@` 检测失败。修复方案：新增以机器人名称（`app_name`/`botName`）为兜底的匹配逻辑，当 `open_id` 不匹配时使用名称二次确认（#463）
- **Cron `at` 类型任务 schema 校验修复**：修复使用 `{ kind: "at", atMs: <毫秒时间戳> }` 创建单次定时任务时触发 schema 校验失败（错误信息中错误地提示 `everyMs`/`expr` 必填）的问题。根本原因一：`coerceSchedule()` 在将 `at` 字符串转为 `atMs` 数字时会**删除** `at` 字段，导致归一化后任务的 gateway schema 校验失败；根本原因二：gateway `CronScheduleSchema` 仅接受字符串 `at`，不接受数字 `atMs`。修复方案：`coerceSchedule()` 不再删除 `at` 字段，并支持纯数字 `atMs` 输入时自动合成 ISO UTC 字符串；`CronScheduleSchema` 中 `at` 变体新增可选 `atMs` 整数字段（#465）
- **内置 Hook metadata key 修复**：修复 session-memory、command-logger、boot-md 三个内置 Hook 因 `HOOK.md` 使用旧版 `"clawdbot"` metadata key 而导致事件无法注册、Hook 静默失效的问题。已将三个内置 Hook 改为正确的 `"openclaw"` key；同时在 `frontmatter.ts` 和 `install.ts` 加入向后兼容 fallback，确保用户自写的旧格式 Hook 继续可用（#471）
- **Web UI「新消息」按钮样式缺失修复**：修复聊天页面「新消息」浮动提示按钮因缺少 CSS 定义而导致灰色遮挡聊天区域的问题，现在正确显示为底部居中的圆角浮动按钮（#481）
- **Agent 概览页长模型名溢出修复**：修复 Agent 概览卡片中过长的模型名（如 `volcengine-coding-plan/deepseek-v3.2`）超出网格单元格边界导致布局错乱的问题（#481）
- **飞书配置向导「修改设置」修复**：修复已配置飞书渠道后再次运行配置向导选择「修改设置」时无法进入 App ID / App Secret 输入步骤的问题，现在会预填已有值供修改

## 0.1.7

- **飞书能力增强**：新增 IM/任务/日历/表格工具与持久化命令队列恢复（#447，感谢 @dragonforce2010）
- **Doubao Embedding Provider**：Memory LanceDB 新增 Doubao 向量模型支持（#448，感谢 @yanghua）
- **Coding Plan 支持**：新增阿里云百炼 Coding Plan 选项，支持 OpenAI/Anthropic 兼容协议
- **Kimi Coding Plan 支持**：新增 Moonshot AI (Kimi) Coding Plan 配置选项，使用 OpenAI 兼容协议（base URL: `https://api.kimi.com/coding/v1`，默认模型: `kimi-for-coding`）
- **火山引擎 Coding Plan 支持**：新增火山引擎 Coding Plan 配置选项，使用 OpenAI 兼容协议（base URL: `https://ark.cn-beijing.volces.com/api/coding/v3`），支持 doubao-seed-2.0-code、glm-4.7、deepseek-v3.2、kimi-k2-thinking、kimi-k2.5 等模型
- **技能加载安全钩子修复**：before_skills_load 处理安全阻断与配置一致性修复（#452，感谢 @qqdxyg）
- **Memory LanceDB 云存储支持**：新增 `storageOptions` 配置项，支持 S3/GCS 等云对象存储后端（#454，感谢 @ddupg）
- **Memory LanceDB 本地 Embedding**：新增 `local` embedding provider，基于 node-llama-cpp 支持 GGUF 格式本地向量模型，默认模型 bge-small-zh-v1.5（#459，感谢 @ddupg）

### bug修复

- **OTEL 诊断导出修复**：更新 OTEL 导出协议与指标/trace 统计，完善诊断事件处理（#324，感谢 @Ronald-Kong99）
- **Control UI 配置保存与回显修复**：修复 `config.set` 写入时的 redaction 恢复逻辑导致的保存失败，并修复代理模型下拉框不回显已保存模型的问题
- **飞书图片发送修复**：修复 Feishu SDK 因 `form-data` 要求 ReadStream 导致 Buffer 上传失败的问题（#455）
- **macOS 网关安装修复**：修复 `launchctl bootstrap` 错误 125，增加 bootout by service identifier 确保可靠卸载已有 LaunchAgent
- **Ollama 模型崩溃修复**：修复 `AssistantMessageEventStream is not defined` 导致 Ollama 本地模型无法使用的问题，原因是 tsc 编译时错误地将值导入当作类型导入吞掉（#458，感谢 @Yishanjiu-3386）

### 上游同步（批量合并 40 个 Copilot PR）

#### 🔒 安全加固

- **插件运行时命令执行禁用**：禁用插件运行时的命令执行原语（#228，上游 #20828）
- **LINE 入站媒体临时文件命名加固**：防止路径遍历攻击（#235，上游 #20792）
- **路径遏制与 SSRF IPv4 加固**：移植 owner-only tool policy（#246）
- **安全修复批量移植**：移植 5 个安全修复 commit v2026.2.17→v2026.2.19（#252）
- **Hono 升级至 4.11.10**：启用 timing-safe 认证加固（#279）
- **沙箱浏览器 --no-sandbox 改为 opt-in**：默认启用沙箱保护（#289）
- **P0 安全加固**：移植上游 v2026.2.19→v2026.2.21 安全补丁（#295）
- **SHA-1 迁移至 SHA-256**：合成 ID 使用更安全的哈希算法（#297）
- **Shell 包装审批持久化**：持久化内部命令用于 shell-wrapper 审批（#337，上游 98b2b16）
- **RFC2544 SSRF 阻断**：移植 SSRF 阻断与 monitor typing 修复（#367）
- **安全批量移植 v2026.2.21→v2026.2.23**：移植 5 个安全 commit（#395）
- **SSRF 导航守卫与扩展中继认证**：移植浏览器 SSRF 导航守卫、扩展中继认证、IPv6 回环测试（#262）

#### 🐛 Bug 修复

- **Agent 图像清理与工具 schema 修复**：移植 v2026.2.15→v2026.2.17（#169）
- **Config/Telegram 修复**：移植上游配置与 Telegram 修复（#173）
- **Token 用量报告隔离**：隔离最后一轮 total 避免累计错误（#175）
- **浏览器端口映射**：追踪原始端口映射以处理 EADDRINUSE 回退（#177）
- **Cron 自旋循环修复**：防止同秒完成自旋循环，支持 bindings accountId 解析（#179）
- **Embedding Manager 类型收紧**：收紧 embedding manager 继承类型（#189）
- **Session threadId 泄漏修复**：防止过时 threadId 泄漏到非线程会话（#193）
- **Prompt 缓存稳定性恢复**：将 per-turn ID 移至 user context 恢复 prompt 缓存稳定性（#301）
- **Cron maxConcurrentRuns 修复**：在 timer loop 中正确遵守 maxConcurrentRuns（#307）
- **Heartbeat 修复**：移植 3 个修复 v2026.2.19→v2026.2.21（#315）
- **TUI 入站元数据剥离**：剥离用户消息中的入站元数据块（#322，上游 #22345）
- **gateway.real_ip_fallback_enabled 条件严重性修复**（#353，上游 #23428）
- **Gemini thoughtSignatures 清理**：为原生 Google provider 清理 thoughtSignatures（#355）
- **SSRF dispatcher family fallback**：为 pinned SSRF dispatcher 启用 family fallback（#365）
- **配对恢复清理与认证同步测试重构**（#345）

#### 📖 文档

- **AGENTS.md GHSA 章节**：新增安全公告分类要求（#218）
- **SECURITY.md canvas 网络可见性澄清**（#222）
- **SECURITY.md sessionKey 信任边界澄清**（#333）
- **安全公告分类提醒**：移植到 AGENTS.md（#331）

#### 📦 其他

- **iOS Talk redaction 与 ATS 加固**：移植 v2026.2.15→v2026.2.17（#165）
- **Telegram 冲突提交移植**：移植 3 个 P1 commit v2026.2.19→v2026.2.21（#321）
- **Agents 冲突提交移植**：移植 5 个 commit v2026.2.17→v2026.2.19（#260）
- **测试去重**：lifecycle、oauth、prompt-limit fixtures 去重（#335）
- **Changelog 条目移植**：webchat 命令认证修复（#163）、飞书路径遍历加固（#220）、v2026.2.18 安全修复（#224）、canvas auth 加固（#277）

## 0.1.7

> 🔒 **安全加固**：同步上游 v2026.2.19→v2026.2.21 安全补丁（security-part3 P0）

### 🔒 安全修复

- **BlueBubbles/Security**：要求所有 BlueBubbles webhook 请求进行 token 认证，移除 loopback/本地代理的免密码访问回退行为（上游 commit `6b2f2811dc62`）
- **Security/Exec**：阻断 shell 启动文件环境注入（`BASH_ENV`、`ENV`、`BASH_FUNC_*`、`LD_*`、`DYLD_*` 等），在 config env 摄入、node-host 继承环境清理和 macOS exec 宿主运行时三处统一拦截，防止攻击者通过环境变量触发预命令执行（上游 commit `2cdbadee1f8f`）

> 🆕 **重要功能**：新增 GLM-5 模型支持，完善 Z.AI Provider 集成
> 🐛 **关键修复**：修复 Context 显示、压缩功能、浏览器控制等核心问题
> 🔧 **开发体验**：改进 macOS pre-commit hook 兼容性，修复 CI/CD 发布流程
> 🔒 **安全加固**：移除 Canvas 端点共享 IP 回退，强制要求 Token 或会话能力
> 📡 **上游同步**：同步上游 v2026.2.17 → v2026.2.21 更新

### 🔒 安全加固

- **Gateway/安全**：移除 Canvas 端点的共享 IP 回退机制，要求提供 Token 或会话能力方可访问 Canvas。感谢 @thewilloftheshadow。（upstream v2026.2.21）

### ✨ 新增功能

- **GLM-5 模型支持**：新增 GLM-5 模型配置和 Z.AI Provider 完整集成
  - 支持 200K 上下文窗口，128K 最大输出 token
  - 支持 reasoning 模式（深度思考）
  - 更新 UI 标签为 "Z.AI (GLM-5)"
  - 更新文档（zai.md、glm.md）

### 🔒 安全加固

- **Security/Hooks**: 对 `openclaw.hooks` 和 `openclaw.extensions` 插件包条目强制路径包含检查（lexical + symlink realpath），防止路径遍历和符号链接逃逸攻击
- **Security/Hooks**: Hook 加载器对通过符号链接逃逸 hook 目录的处理器文件进行拒绝，防止任意模块加载
- **Security/Plugins**: 插件发现层对所有 `openclaw.extensions` 条目强制路径包含验证，逃逸包目录的条目被拒绝
- **Security/Net**: SSRF 检查中对 IPv4 字面量使用严格的点分十进制解析，对不支持的遗留形式（八进制/十六进制/短格式/打包格式，如 `0177.0.0.1`、`127.1`、`2130706433`）执行失败关闭策略，防止 SSRF 绕过
- **Security/Gateway/Agents**: 通过集中式工具策略包装器及 `ownerOnly` 工具元数据强制仅限 owner 使用 `cron`、`gateway`、`whatsapp_login` 工具，防止非 owner DM 权限提升

### 🐛 Bug 修复

- **Security/BlueBubbles**: make parsed chat allowlist checks fail closed when `allowFrom` is empty, restoring expected `pairing`/`allowlist` DM gating for BlueBubbles and blocking unauthorized DM/reaction processing when no allowlist entries are configured. Thanks @tdjackey for reporting.
- **Security/iMessage**: make allowlist checks fail closed when `allowFrom` is empty (same fix as BlueBubbles). Thanks @tdjackey for reporting.
- **Security/Discord**: add `openclaw security audit` warnings for name/tag-based Discord allowlist entries (DM allowlists, guild/channel `users`, and pairing-store entries), highlighting slug-collision risk while keeping name-based matching supported. Thanks @tdjackey for reporting.
- **Context 显示修复**：修复 `/status` 命令显示 `Context: ?/200k` 的问题，现在会显示实际 token 使用量（如 `Context: 1.5k/200k (1%)`）
  - 启用 `includeTranscriptUsage` 标志，从 session transcript 文件读取实际使用量
- **压缩功能修复**：修复 `/compact` 命令失败的问题（`systemPromptOverride is not a function`）
  - 修正 `compactEmbeddedPiSession` 中的类型错误，将错误的函数调用改为字符串传递
- **浏览器控制修复**：修复 Agent 无法访问 gateway 浏览器控制服务的问题
  - 使用 HTTP 协议替代 WebSocket 连接到浏览器控制端点
- **Pre-commit Hook 兼容性**：修复 VS Code 提交时报 `mapfile: command not found` 的问题
  - 兼容 macOS 默认 Bash 3.2，使用 `while read` 循环替代 Bash 4+ 的 `mapfile` 命令
  - 保持 NUL 分隔文件列表处理的安全性

### 🔧 CI/CD 改进

- **npm 发布标签修复**：修复测试版本（`-test`/`-beta`）错误发布到 `latest` 频道的问题
  - 现在从 Git 标签名中提取版本号判断发布频道，而不是从 package.json
  - 添加调试输出显示发布频道

### 🔒 安全更新

- **依赖安全加固**：将 `hono` 升级至 `4.11.10`，修复 `basicAuth`/`bearerAuth` 中的时序安全认证比较漏洞（`GHSA-gq3j-xvxp-8hrf`）。（上游：@vincentkoc）

### 📦 上游同步

- **v2026.2.21**：同步上游安全加固更新（Canvas 端点认证加固）
- **v2026.2.17**：同步上游核心稳定性更新

### 📝 文档更新

- 更新 GLM 和 Z.AI Provider 文档
- 完善模型配置和认证说明

## 0.1.5-fix.3

### 🐛 Bug 修复

- **图像 resize 日志优化**：将图像缩放日志改为单行格式，包含尺寸信息（upstream 414b996b0cbf）
- **图像工具 schema 兼容性修复**：将 image tool schema 从 Anthropic 不兼容的 union 类型改为显式的 `image`（单图）和 `images`（多图）参数，保持 schema 不使用 `anyOf`/`oneOf`/`allOf` 的同时支持多图分析（upstream 391796a3fb21）

### ✨ 功能改进

- **图像清理尺寸可配置**：新增 `agents.defaults.imageMaxDimensionPx` 配置项，允许自定义 transcript/tool 图像下采样的最大边长（默认 1200px）（upstream b05e89e5e605）

## 0.1.5-fix.3

### 🐛 Bug 修复

- **Telegram 命令名称规范化**：修复 Telegram 原生命令名称中的连字符导致 `BOT_COMMAND_INVALID` 错误的问题——现在自动将命令名称中的 `-` 转换为 `_`（例如 `export-session` → `export_session`），符合 Telegram Bot API 规范；同时改进命令同步失败时的错误日志输出（#19257，感谢 @akramcodez）
- **Config 对象数组合并增强**：强化 `config.patch` 中对象数组按 id 合并的回退处理逻辑，确保基础数组已完全按 id 索引时才启用合并，避免在混合 id 条目时发生不可预期的行为（#17989，感谢 @stakeswky 和 @sebslight）
- **Config 补丁数组保护**：防止 `config.patch` 在补丁条目缺少 id 时销毁整个数组——现在即使部分补丁条目缺少 id，也会将它们追加到数组末尾而非触发全量替换，避免部分 `agents.list` 更新误删无关 Agent（#18030，感谢 @stakeswky）

## 0.1.5-fix.2

### 🔒 安全修复

- **Windows 定时任务环境变量注入修复**：对生成 `gateway.cmd` 时的定时任务环境变量赋值进行转义和引号包裹（`set "KEY=VALUE"`），防止通过配置中的环境变量进行命令注入，将在下次 npm 发布中生效（upstream `8288702f51a3`，感谢 @tdjackey 报告）
- **Lobster (Windows) 安全修复**：移除启动 Lobster 包装器（`.cmd`/`.bat`）时的 shell 回退路径，改为显式 argv 执行与包装入口点解析，防止命令注入同时保持 Windows 包装器兼容性，将在下次 npm 发布中生效（upstream `cf6edc6d57e7`，感谢 @allsmog 报告）
- **IPv6 过渡地址 SSRF 绕过修复**：阻止通过 NAT64（`64:ff9b::/96`、`64:ff9b:1::/48`）、6to4（`2002::/16`）和 Teredo（`2001:0000::/32`）IPv6 过渡地址绕过 SSRF 防护，并在 IPv6 地址解析失败时默认拒绝（upstream `42d2a6188864`，感谢 @jackhax 报告）
- **Cron Webhook SSRF 出站防护**：使用 SSRF 安全出站请求（`fetchWithSsrFGuard`）保护 cron webhook POST 投递，阻止请求发往内网或元数据目标（upstream `35851cdaff42`，感谢 @Adam55A-code 报告）

### 🐛 Bug 修复

- **Session threadId 泄漏修复**：修复用户从 DM topic (thread) 切换到主 DM 时，stale `lastThreadId` 导致回复错误发送到旧 topic 的问题——非 thread session 现在正确地不继承历史 threadId（感谢上游 commit [`5f821ed`](https://github.com/openclaw/openclaw/commit/5f821ed06731e81002b69af329a151da4efdafa2)）
- **Control UI 网关 Token 修复**：修复首次安装后打开带 Token 的仪表盘 URL 时，Token 未被持久化导致网关连接报 `unauthorized: gateway token missing (1008)` 的问题
- **MiniMax API Key 认证修复**：修复手动配置 MiniMax API Key 后认证失败的问题——向导错误地将 API Key 用户路由到仅接受 OAuth Token 的 Anthropic 兼容端点 (`api.minimax.io/anthropic`)，现已切换到正确的 OpenAI 兼容端点 (`api.minimax.chat/v1`)

### 🔒 安全（Security）

- **飞书路径遍历加固**：防止飞书入站媒体临时文件写入中的路径遍历攻击，将密钥派生的临时文件名替换为基于 UUID 的名称。感谢 @allsmog 报告。（upstream `65a7fc6de7e9`）

### ✨ 功能改进

- **MiniMax 全模型支持**：隐式 Provider 和模型目录补全所有 MiniMax 模型（M2.5、M2.5-highspeed、M2.1-highspeed、M2）
- **iOS Talk 配置安全加固**：移植上游 iOS Talk 模式改进，支持在网关配置隐藏 API Key 时通过本地 Keychain 覆盖配置，提升隐私和安全性；增强 Talk 配置处理逻辑，忽略已隐藏的 API Key 和环境变量占位符；改进辅助功能支持（减少动画、高对比度、无障碍标签优化）；收紧 ATS 策略从 `NSAllowsArbitraryLoadsInWebContent` 改为 `NSAllowsLocalNetworking`，仅允许本地网络访问 (upstream #18163)

## 0.1.5

> 🔒 **安全加固**：同步上游 77 项安全修复（P0-A + P0-B + P0-C + P0-D），覆盖 v2026.2.1 ~ v2026.2.15 全部安全补丁。
> 🐛 **关键 Bug 修复**：同步上游 50 项关键 Bug 修复（P1-A ~ P1-E），涵盖会话/网关/定时任务/心跳/内存/CJK/记忆搜索等核心稳定性问题。
> ✨ **核心功能同步**：同步上游 37 项核心功能改进（P2-A ~ P2-E），覆盖 Agent/会话管理、Cron 增强、Config 改进等。
> 🤖 **模型/Provider 支持**：同步上游 17 项模型与 Provider 支持（P3-A + P3-B），覆盖中国 Provider、新模型、国际 Provider 等。
> 📡 **频道 Bug 修复**：同步上游 47 项频道 Bug 修复（P4-A ~ P4-H），覆盖 Telegram/WhatsApp/Discord/Slack/Signal/飞书/Web UI/TUI 等全部通道。

### ✨ 本版本新增功能

- **QMD 记忆搜索系统**：新增 QMD（Quick Memory Documents）本地记忆搜索功能，支持将工作区文档建立向量索引并通过自然语言进行语义搜索；Agent 可在对话中自动检索相关记忆上下文，CLI 支持通过 `openclaw-cn memory search` 直接搜索
- **飞书默认关闭流式输出**：飞书频道默认关闭 `streaming` 和 `blockStreaming`，减少 API 请求消耗，降低飞书 API 配额压力
- **火山引擎引导修复**：修复 Volcengine 引导流程误用 Venice 配置导致的 401 认证错误和模型选择错误
- **飞书出站会话修复**：修复 Agent 通过 `message` 工具向同频道发送文件时，因 Feishu `oc_` 前缀歧义（同时用于群聊和单聊）创建多余会话的问题

### 🤖 模型 / Provider 支持（Model & Provider）

#### P3-A：中国相关 Provider

- **月之暗面 Moonshot**：Onboarding 新增 Moonshot (.cn) 认证选项 + China base URL（upstream #7180）
- **智谱 Z.AI**：新增 Z.AI 端点认证选项 + 模型目录（upstream #13456）
- **GLM-5**：新增 GLM-5 合成模型目录支持（upstream #15867）
- **MiniMax M2.5**：更新 MiniMax 默认模型到 M2.5（upstream #14865）
- **MiniMax Provider 修复**：将 MiniMax API-key provider 切换到 anthropic-messages（upstream #15297）

#### P3-B：国际 Provider

- **Claude Opus 4.6**：新增 Claude Opus 4.6 内置模型目录（upstream #9853）
- **Antigravity Opus 4.6**：Opus 4.6 前向兼容 + thinking 签名清理（upstream #14218）
- **gpt-5.3-codex**：新增 gpt-5.3-codex 严格回退（upstream #9995）
- **gpt-5.3-codex-spark**：新增 Codex Spark 前向兼容模型（upstream #14990, #15174）
- **Codex OAuth**：实现 Codex OAuth 登录流程（upstream #15406）
- **xAI Grok**：新增 xAI (Grok) Provider 支持（upstream #9885）
- **Hugging Face**：新增 Hugging Face Inference Provider（upstream #13472）
- **Cloudflare AI Gateway**：新增 Cloudflare AI Gateway Provider（upstream #7914）
- **HTTP 400 容错**：将 HTTP 400 视为 failover 可选状态（upstream #1879）
- **GitHub Copilot xhigh**：允许 github-copilot 模型使用 xhigh thinking（upstream #11646）
- **Ollama baseUrl**：使用配置的 baseUrl 进行 Ollama 模型发现（upstream #14131）
- **Ollama 原生流式**：新增 Ollama 原生 /api/chat 流式 + 工具调用 Provider（upstream #11853）

### ✨ 核心功能（Core Features）

#### P2-A：Agent / 会话管理

- **系统提示安全护栏**：增强 system prompt 安全检查（upstream #5445）
- **缓存保留重命名**：`cacheControlTtl` 重命名为 `cacheRetention`（upstream ba4a55f6d）
- **子代理默认 thinking**：为子代理设置默认 thinking 模式（upstream #7372）
- **会话历史限制**：限制 sessions_history 载荷大小（upstream #10000）
- **Agent 管理 RPC**：新增 agent 管理 RPC 方法（upstream #11045）
- **OPENCLAW_HOME 路径覆盖**：支持通过环境变量覆盖配置目录（upstream #12091）
- **Pre-prompt 上下文诊断**：增加 pre-prompt 上下文诊断信息（upstream #8930）
- **BOOTSTRAP.MD 部分工作区**：支持部分工作区 BOOTSTRAP.MD 引导（upstream #16457）
- **Tool 变更可见性**：保持未解决的变更工具失败可见（upstream #16131）

#### P2-B：Cron 增强

- **Announce 投递模式**：新增 announce 投递模式 + 增强作业配置（upstream 3f82daefd）
- **默认 announce + ISO 8601**：隔离作业默认使用 announce 投递 + ISO 8601 支持（upstream 0bb0dfc9b）
- **One-shot 清理**：成功后默认删除一次性作业（upstream ab9f06f4f）
- **deleteAfterRun**：honor deleteAfterRun + 排除 maxTokens 重编辑（upstream #13342）
- **Session 模型覆盖**：隔离 agent 运行时尊重 session 模型覆盖（upstream #14983）

#### P2-C：Config 改进

- **maxTokens 钳位**：将 maxTokens 钳位到 contextWindow（upstream #5516）
- **避免重编辑 maxTokens**：避免重编辑 maxTokens 类字段（upstream #14006）
- **忽略 meta 字段变更**：config watcher 忽略 meta 字段变更（upstream #13460）
- **保留环境变量引用**：写回 config 时保留 `${VAR}` 环境变量引用（upstream #11560）
- **接受 $schema**：根 config 接受 `$schema` 键（upstream #14998）
- **遗留音频迁移**：遗留音频转录配置迁移 + exec 审批提示修复（upstream #5042）

#### P2-D：其他核心功能

- **Agents 仪表板**：Web UI 新增 Agents 仪表板（upstream 2a68bcbeb）
- **per-channel responsePrefix**：支持每通道 responsePrefix 覆盖（upstream #9001）
- **Token 使用仪表板**：Web UI 新增 token 使用量仪表板（upstream #10072）
- **Voyage 嵌入**：文档化 Voyage embeddings + VOYAGE_API_KEY（upstream #7078）
- **压缩分隔符**：聊天历史中显示压缩分隔符（upstream #11341）
- **本地时间日志**：`logs` 命令新增 `--localTime` 选项（upstream #13818）
- **Cloudflare Markdown**：web_fetch 支持 Cloudflare Markdown for Agents（upstream #15376）
- **QAT 嵌入**：对齐 QAT 默认文档/测试（upstream #15429）
- **流式刷新**：段落边界上刷新 block streaming（upstream #7014）

### 🔒 安全（Security）

#### P0-A / P0-B（v2026.2.1 ~ v2026.2.13）

- **沙箱安全**：限制沙箱路径遍历、命令注入与进程逃逸（upstream #10531, #12803, #15269, #15325, #15336, #15399, #15410, #15536）
- **ACP 权限加固**：阻止高风险工具通过 HTTP `/tools/invoke` 调用，新增 `DANGEROUS_ACP_TOOLS` 集合与 `resolvePermissionRequest` 审批流（upstream #15390）
- **Canvas 认证**：限制 Canvas IP 认证仅允许私网/回环地址（upstream #14661）
- **浏览器路径约束**：约束浏览器 trace 和下载输出路径在安全根目录内（upstream #15652）
- **A2UI 文件安全**：使用 `openFileWithinRoot` 替代手动路径遍历检查（upstream #10525）
- **WhatsApp 凭证权限**：强制 WhatsApp 凭证文件使用 `0o600` 权限（upstream #10529）
- **WebSocket 日志清理**：清理 WebSocket 日志中的敏感 header 信息（upstream #15592）
- **审计区分**：区分 webhook 与内部 hook 的审计摘要（upstream #13474）
- **路由绑定作用域**：强制严格 binding-scope 匹配 + 角色路由支持（upstream #15274）
- **Exec 审批流程**：为 Agent 工具执行添加两阶段审批流程（upstream #4726）
- **Heredoc 白名单**：在允许列表安全模式下支持 heredoc 操作符（upstream #13811）
- **Hook 去重**：修复 embedded runtime 中 `before_tool_call` 重复触发问题（upstream #15635）
- **Tool-call ID 清理**：清理 OpenAI/Codex/Anthropic 的 tool-call ID 格式（upstream #15279）
- **链接理解 SSRF**：修复链接理解功能的 SSRF 漏洞（upstream #649826e）
- **安全审计**：新增 `doctor-security` 深度安全审计命令，检测 30+ 项安全配置（upstream #12803, #13129）
- **工具配置沙箱**：强制沙箱工具配置文件验证与默认安全策略（upstream #15536）
- **CSRF/认证**：加固 gateway HTTP 端点认证与 CSRF 防护（upstream #15399, #15410）

#### P0-C（v2026.2.14 安全批次）

- **Hook transform 限制**：限制 hook transform 函数的可用范围（upstream `a0361b8ba`）
- **Hook manifest 路径**：加固 hook manifest 路径验证（upstream `18e8bd68c`）
- **Hooks 加固**：强化 hooks 整体安全机制（upstream `35c0e66ed`）
- **Archive 提取限制**：限制 archive 提取的文件数量和大小（upstream `d3ee5deb8`）
- **媒体 Base64 拒绝**：拒绝超大 Base64 编码的媒体负载（upstream `31791233d`）
- **媒体大小边界**：限制媒体绑定大小上限（upstream `00a089088`）
- **Slack DM 认证**：加固 Slack DM 频道认证策略（upstream `f19eabee5`）
- **Telegram 发送者 ID**：移除用户名匹配，强制要求发送者 ID 验证（upstream `e3b432e48`）
- **Telegram webhookSecret**：为 Telegram webhook 添加 secret 验证和 `127.0.0.1` 绑定（upstream `633fe8b9c`）
- **Windows 子进程**：加固 Windows 平台子进程执行安全（upstream `a7eb0dd9a`）
- **CLI PID 清理**：使用 ppid 过滤加固 CLI 进程清理逻辑（upstream `6084d13b9`, `eb60e2e1b`）
- **apply_patch 边界**：移除路径遍历函数 `expandPath`/`resolvePathFromCwd`（upstream `5544646a0`, `4a44da7d9`）
- **apply_patch 符号链接**：阻止 apply_patch 通过符号链接逃逸沙箱（upstream `914b9d1e7`）
- **macOS 钥匙串注入**：使用 `execFileSync` 防止 macOS 钥匙串命令注入（upstream `3967ece62`）
- **Chutes OAuth 状态**：加固 Chutes OAuth 状态验证（upstream `3967ece62`, `a99ad11a4`）
- **Gateway URL 覆盖**：限制 gateway URL 参数覆盖（upstream `2d5647a80`）
- **Gateway SSRF**：阻止 gateway 出站消息 SSRF（upstream `c5406e1d2`）
- **node.invoke 审批**：为 node.invoke 添加工具审批流程（upstream `01b3226ec`）
- **Skills 配置脱敏**：在 skills/hooks 状态输出中脱敏配置值（upstream `d3428053d`）
- **IPv4 映射 SSRF**：阻止完整格式 IPv4 映射 IPv6 绕过 SSRF 防护（upstream `c0c0e0f9a`）
- **浏览器 CSRF**：阻止跨域请求对回环浏览器路由的修改操作（upstream `b566b09f8`）
- **safeBins 绕过**：阻止 shell 展开绕过 safeBins 限制（upstream `77b89719d`, `24d2c6292`）
- **exec PATH 加固**：加固 exec PATH 处理逻辑（upstream `013e8f6b3`）
- **发现路由 + TLS 固定**：加固发现路由和 TLS 证书固定（upstream `d583782ee`）
- **macOS 深度链接**：加固 macOS 深度链接处理（upstream `28d9dd7a7`）
- **QMD 作用域**：防止 QMD 作用域 deny 绕过（upstream `f9bb748a6`）
- **LanceDB 内存加固**：加固 LanceDB 内存召回和自动捕获（upstream `61725fb37`, `ed7d83bcf`）
- **媒体本地路径**：限制本地媒体读取在工作区/沙箱允许目录内（upstream `6863b9dbe`, `683aa09b5`, `9f368ac9e`）
- **Discord 语音媒体**：加固 Discord 语音消息媒体加载（upstream `725741486`）
- **Telnyx webhook**：集中化 Telnyx webhook 验证，缺少公钥时默认拒绝（upstream `f47584fec`, `29b587e73`）
- **Twilio webhook**：在 ngrok 回环模式下强制 Twilio 签名验证（upstream `ff11d8793`）
- **Archive 提取加固**：加固 archive 提取 + 浏览器下载 + Signal 安装（upstream `3aa94afcf`）

#### P0-D（v2026.2.15 安全批次）

- **提示路径注入加固**：强化系统提示中的路径注入防护机制（upstream `93b9f1ec5fdf`）
- **跨会话来源安全修复**：修复跨会话来源追踪的安全漏洞（upstream `e3445f59c986`）
- **Control UI XSS 防护**：通过移除内联脚本注入、将启动配置改为 JSON 服务、强制 `script-src 'self'` 策略，防止通过助手名称/头像进行存储型 XSS 攻击（upstream `01b1e350b20f`，感谢 @Adam55A-code）
- **Gateway 非管理员状态脱敏**：对非管理员客户端的 `status` 响应中脱敏敏感会话/路径细节；完整信息仅对 `operator.admin` 开放（upstream `0954618cfb7f` #8590，感谢 @fr33d3m0n）
- **Gateway 命令鉴权修复**：保持 webchat 命令授权在内部 `webchat` 上下文中，而不是从频道白名单推断其他 provider，修复配置频道白名单时 Control UI 中 `/new` 和 `/status` 命令被丢弃的问题（upstream `c953cfdee7e9` #7189，感谢 @karlisbergmanis-lv）

### 🐛 关键 Bug 修复（Critical Bugs）

#### P1-A：会话与网关稳定性（26 项）

- **会话存储锁保护**：防止 `withSessionStoreLock` 在 `storePath` 未定义时调用 `path.dirname` 导致崩溃（upstream #14717）
- **Transcript tool-call 清理**：会话 transcript 修复期间丢弃必填字段空白（`id`/`name` 或缺失 `input`/`arguments`）的畸形 tool-call 块，防止后续回合持续的 tool-call 损坏（upstream `7a23ac290e95` #15485，感谢 @mike-zachariades）
- **压缩后失忆**：修复会话压缩后上下文丢失问题（upstream `0cf93b8fa`）
- **上下文溢出截断**：修复上下文溢出时工具结果被截断问题（upstream `0deb8b0da`）
- **会话重置中止**：在 sessions.reset 前中止活跃运行（upstream `3efb75212`）
- **transcript 路径解析**：修复 transcript 路径解析逻辑（upstream `cab0abf52`）
- **压缩安全超时**：为压缩操作添加安全超时机制（upstream `c0cd3c3c0`）
- **进程日志分页**：修复进程日志分页问题（upstream `dec685970`）
- **压缩超时死锁**：修复压缩超时导致的死锁问题（upstream `e6f67d5f3`）
- **空流故障转移**：修复空流响应的故障转移逻辑（upstream `eb846c95b`）
- **预写式投递队列**：新增预写式投递队列防止消息丢失（upstream `207e2c5af`）
- **重启前排空活跃对话**：重启前排空活跃对话防止消息丢失（upstream `acb9cbb89`）
- **安装时自动生成 token**：修复 gateway install 时自动生成认证 token（upstream `94d685816`）
- **防止 undefined token**：防止 auth 配置中出现 undefined token（upstream `f8c91b3c5`）
- **EPIPE 异步处理**：修复关闭时的异步 EPIPE 错误处理（upstream `2ef4ac08c`）
- **全局安装 Dashboard 资源**：修复全局安装时 Dashboard 资源缺失问题（upstream `8d5094e1f`）
- **SIGUSR1 后清理状态**：清理 SIGUSR1 进程内重启后的过时状态（upstream `4e9f933e8`）
- **通知队列发送失败保留**：发送失败时保留通知队列项目（upstream `2a8360928`）
- **WebSocket 5MB 限制**：提升 WebSocket 最大负载至 5MB 以支持图片上传（upstream `626a1d069`）
- **多 Agent 用量发现**：修复多 Agent sessions.usage 发现逻辑（upstream `9271fcb3d`）
- **agentId transcript 路径**：使用 session key agentId 解析 transcript 路径（upstream `dc3c73361`）
- **agentId 贯穿状态/用量路径**：将 agentId 贯穿到所有状态和用量查询路径（upstream `990413534`）
- **归档旧 transcript**：在 /new 和 /reset 时归档旧 transcript 文件（upstream `31537c669`）
- **停止钳制 totalTokens**：停止钳制派生的 totalTokens 值（upstream `fd076eb43`）
- **防止子进程 FD 泄漏**：修复子进程清理时的文件描述符泄漏（upstream `4c350bc4c`）
- **防止缓存 TTL 双重压缩**：防止 cache-ttl 条目绕过保护导致的双重压缩（upstream `dcb921944`）

#### P1-B：定时任务与心跳（16 项）

- **Cron 调度回归修复**：修复 cron 调度和提醒投递回归问题（upstream `821520a05`）
- **防止跳过到期任务**：防止 recomputeNextRuns 跳过到期任务（upstream `313e2f2e8`）
- **Cron 心跳可靠性**：改进 cron 心跳可靠性（upstream `40e23b05f`）
- **legacy atMs 字段**：处理调度中的 legacy atMs 字段（upstream `b0befb5f5`）
- **防止跳过执行**：防止 nextRunAtMs 推进时跳过 cron 执行（upstream `39e3d58fe`）
- **主 session 任务传递 agentId**：修复主 session 任务传递 agentId 给 heartbeat（upstream `04e3a66f9`）
- **活跃任务执行时重置定时器**：在活跃任务执行期间 onTimer 触发时重新设置定时器（upstream `ace5e33ce`）
- **防止同时触发重复**：防止多个任务同时触发时重复执行（upstream `dd6047d99`）
- **调度错误隔离**：隔离调度错误防止一个坏任务影响所有任务（upstream `04f695e56`）
- **心跳调度器异常处理**：防止 runOnce 抛出异常时心跳调度器死亡（upstream `5147656d6`）
- **防止 list/status 跳过 cron**：防止 list/status 静默跳过周期性 cron 任务（upstream `c60844931`）
- **心跳定时器改进**：改进心跳定时器逻辑（upstream `7b89e68d1`）
- **心跳唤醒竞态**：防止唤醒处理器竞态导致心跳调度器静默死亡（upstream `40aff672c`）
- **豁免唤醒/hook 原因**：豁免 wake 和 hook 原因的空心跳跳过逻辑（upstream `7f0d6b1fc`）
- **HEARTBEAT_OK 清理**：忽略 HEARTBEAT_OK token 周围的非单词字符（upstream `f9379ecee`）
- **HEARTBEAT.md 自动创建**：工作区初始化时不再自动创建 HEARTBEAT.md（upstream `386bb0c61`）

#### P1-C：内存泄漏（7 项）

- **诊断会话状态模块**：拆分诊断会话状态模块减少内存占用（upstream `0dec23450`）
- **Agent 运行序列跟踪**：限定 Agent 运行序列跟踪器增长（upstream `fc8f59261`）
- **中止内存映射**：限定中止回调内存映射增长（upstream `414b7db8a`）
- **Slack 线程缓存**：限定 Slack 线程启动器缓存增长（upstream `6d0cd54ac`）
- **目录缓存内存**：限定出站目录缓存内存增长（upstream `48fef2786`）
- **远程节点缓存**：断开连接时清理远程节点缓存（upstream `dabfcbe94`）
- **Skills 监视器 FD**：避免 skills 监视器文件描述符耗尽（upstream `0e046f61a`）

#### P1-D：CJK 兼容（1 项）

- **Voice Wake CJK 崩溃**：防止 CJK 触发词导致 Voice Wake 崩溃（upstream `c32b92b7a`）

#### P1-E：记忆搜索（1 项）

- **Memory/FTS Unicode 查询**：使 `buildFtsQuery` 具备 Unicode 感知能力，使非 ASCII 查询（包括 CJK）生成关键词 token 而非回退到纯向量搜索（upstream `7089885ac49e` #17672，感谢 @KinGP5471）

### 📡 频道 Bug 修复（Channel Fixes）

#### P4-A：Telegram（14 项）

- **线程规格强制**：强制 DM 与 Forum 发送线程规格生效（upstream #6833）
- **转发元数据**：包含 `forward_from_chat` 转发元数据（upstream #8392）
- **DM topic threadId 注入**：自动为 DM topic 注入 threadId（upstream #7235）
- **session 模型覆盖**：inline 模型选择器尊重 session 模型覆盖（upstream #8193）
- **引用解析加固**：加固 quote 解析并保留引用上下文（upstream #12156）
- **过期 topic 恢复**：从过期 topic thread ID 恢复主动消息发送（upstream #11620）
- **Markdown spoiler**：渲染 Markdown spoiler 为 tg-spoiler 标签（upstream #11543）
- **DM allowFrom**：匹配 DM allowFrom 对发送者 user ID 而非用户名（upstream #12779）
- **blockquote 渲染**：渲染 blockquote 为原生 HTML blockquote（upstream #14608）
- **model picker 空消息**：处理 model picker 中无文本消息情况（upstream #14397）
- **REACTION_INVALID 警告**：将 REACTION_INVALID 作为非致命警告输出（upstream #14340）
- **命令上限 100**：bot 菜单注册命令数上限 100（upstream #15844）
- **skill 命令作用域**：scope skill 命令到已解析的 agent（upstream #15599）
- **webhook 回调超时**：设置 webhook 回调超时处理（upstream #16763）

#### P4-A 附加：媒体（1 项）

- **MP3/M4A 语音兼容**：将 MP3/M4A 视为语音兼容音频格式（upstream #15438）

#### P4-B：WhatsApp（4 项）

- **粗体/删除线转换**：将 Markdown 粗体/删除线转换为 WhatsApp 格式（upstream #14285）
- **纯媒体发送**：允许纯媒体发送 + 规范化前导空白负载（upstream #14408）
- **语音 MIME 类型**：语音消息默认 MIME 类型（upstream #14444）
- **文档文件名保留**：保留出站文档文件名（upstream #15594）

#### P4-C：Discord（9 项）

- **线程父级绑定**：继承线程父级频道绑定用于路由（upstream #3892）
- **PluralKit 代理发送者**：解析 PluralKit 代理发送者身份（upstream #5838）
- **论坛/媒体线程**：支持论坛/媒体 thread-create 起始消息（upstream #10062）
- **DM 反应处理**：处理 DM 频道的反应事件（upstream #10418）
- **线程 replyToMode**：线程中尊重 replyToMode 设置（upstream #11062）
- **纯媒体消息**：省略纯媒体消息的空内容字段（upstream #9507）
- **数字 guild 白名单**：避免数字 guild 白名单条目误路由（upstream #12326）
- **historyLimit 应用**：将频道 historyLimit 应用到 sessions（upstream #11224）
- **空 channels 白名单**：empty channels 配置视为无白名单而非全拒绝（upstream #16714）

#### P4-D：Slack（5 项）

- **媒体抓取限制**：加固媒体抓取限制和文件 URL 校验（upstream #6639）
- **mention 剥离模式**：为 /new 和 /reset 命令添加 mention stripPatterns（upstream #9971）
- **replyToMode 默认值**：将默认 replyToMode 从 off 改为 all（upstream #14364）
- **bot mention 命令检测**：检测以 bot mention 开头的命令消息（upstream #14142）
- **线程归属权门控**：新增 thread-ownership 出站门控插件（upstream #15775）

#### P4-E：Signal（4 项）

- **E.164 校验**：强制 E.164 电话号码格式校验（upstream #15063）
- **mention 渲染**：将 mention 占位符渲染为 @uuid/@phone（upstream #2013）
- **大小写敏感 group ID**：保留大小写敏感的 group: 目标 ID（upstream #16748）
- **非 x64 安装**：非 x64 Linux 上自动安装 signal-cli（upstream #15443）

#### P4-F：飞书 Feishu（4 项）

- **Buffer 直传**：直接传递 Buffer 到 SDK upload API（upstream #10345）
- **mention 门控群组**：仅在 bot 被 @ 时触发 mention 门控群组处理（upstream #11088）
- **探活状态上下文**：probe status 使用已解析的账户上下文（upstream #11233）
- **DocX block 顺序**：保留 DocX 顶层转换 block 顺序（upstream #13994）

#### P4-G：Web UI（4 项）

- **滚动位置**：流式输出时尊重用户滚动位置（upstream #7226）
- **logo 路径**：basePath 设置时正确解析 header logo 路径（upstream #7178）
- **DOMPurify img**：将 img 添加到 DOMPurify 允许标签列表（upstream #15437）
- **Windows 路径换行符**：保留 Windows 路径中的 literal `\\n` 序列（upstream #11547）

#### P4-H：TUI（6 项）

- **并发流保留**：并发 run finalize 时保留进行中的流式回复（upstream #10704）
- **工具边界文本**：保持 pre-tool 流式文本可见（upstream #6958）
- **ANSI 清理**：清理历史文本中的 ANSI/控制字符（upstream #13007）
- **窄终端加固**：加固窄终端渲染时的清理器（upstream #5355）
- **亮色主题对比**：亮色主题使用终端默认前景色渲染（upstream #16750）
- **流式文本保留**：保留更丰富的流式助手文本内容（upstream #15452）

---

## 0.1.0

> 🎉 **版本号规范化**：从本版本起，openclaw-cn 采用标准语义化版本号 (Semver)，告别日期版本。
> 本版本整合了 2026.2.3 ~ 2026.2.5 的所有更新内容。

### ✨ 新功能（Features）

- **飞书多 Agent 路由**：新增飞书多 Agent 路由支持，可根据 `bindings` 配置将不同用户/群聊分发到不同 Agent (#27) - 感谢 @wsbjj
- **飞书群聊增强**：添加群组消息引用功能、显示群组 ID、回复引用模式，增强对话上下文清晰度
- **飞书文档提取**：添加文档链接提取功能，支持从文本和富文本消息中提取飞书文档引用
- **中文命令支持**：添加斜杠命令格式支持、中文命令别名、命令帮助文本中文国际化
- **工作区迁移**：添加迁移旧工作区目录功能，确保用户无缝升级到新目录
- **火山引擎自定义 Header**：支持通过环境变量 `MODEL_AGENT_CLIENT_REQ_ID` 和 `MODEL_AGENT_CLIENT_REQ_VALUE` 为火山引擎模型请求添加自定义 Header (#24) - 感谢 @dragonforce2010
- **消息聊天类型**：添加消息聊天类型参数，支持不同聊天场景的处理

### 🔧 修复（Fixes）

- **飞书流式卡片 fallback**：改进 `closeStreamingMode` 返回值检查，API 失败时正确回退到普通消息 (#57) - 感谢 @Y1fe1Zh0u
- **飞书富文本解析**：修复 post 富文本消息解析，支持 locale 包装格式和嵌入图片下载 (#37)
- **依赖安装问题彻底解决**：使用 `@openclaw-cn/baileys` 替代上游 `@whiskeysockets/baileys`，彻底解决全局安装时 libsignal git 依赖导致的安装失败问题
- **npm/yarn 兼容**：完善 libsignal 依赖替换，添加 npm `overrides` 和 yarn `resolutions` 支持
- **Control UI 资源**：修复 npm 包缺少 Control UI 资源的问题 (#28)
- **Feishu 扩展打包**：修复 npm 包缺少 feishu 扩展 dist 目录的问题
- **心跳逻辑**：更新心跳跳过逻辑，使其能够处理 cron 事件
- **崩溃修复**：修复 model.input.includes 未定义导致的崩溃 (#32)
- **WSL/容器环境**：改进 WSL/容器环境下网关服务命令的错误提示 (#26)

### 📚 文档（Docs）

- 翻译记忆（memory）文档为中文 (#51) - 感谢 @Y1fe1Zh0u
- 翻译供应商文档为中文（openai、anthropic、moonshot、openrouter、venice 等 10 篇，moonshot 默认端点改为国内） (#48) - 感谢 @Y1fe1Zh0u
- 命令响应和使用说明翻译成中文（/whoami、/models、/activation、/send 等）
- 添加火山引擎供应商文档和配置示例
- 添加飞书多 Agent 路由配置说明、流式输出说明
- 添加 WSL 用户 gateway restart 注意事项
- 添加 Windows PowerShell 更新/卸载命令
- 添加 'disconnected (1006)' 错误排查指南

---

## 2026.2.5

### ✨ 新功能（Features）

- Feishu: 新增飞书多 Agent 路由支持，可根据 `bindings` 配置将不同用户/群聊分发到不同 Agent (#27) - 感谢 @wsbjj

### 🔧 修复（Fixes）

- Dependencies: 使用 `@openclaw-cn/baileys` 替代上游 `@whiskeysockets/baileys`，彻底解决全局安装时 libsignal git 依赖导致的安装失败问题
- Dependencies: 完善 libsignal 依赖替换，添加 npm `overrides` 和 yarn `resolutions` 支持，修复 npm/yarn 用户仍遇到 git 依赖安装失败的问题
- Feishu: 优化权限缺失时的错误提示，降低国内用户配置排障门槛 (#27)

---

## 2026.2.4

### ✨ 新功能（Features）

- Volcengine: 支持通过环境变量 `MODEL_AGENT_CLIENT_REQ_ID` 和 `MODEL_AGENT_CLIENT_REQ_VALUE` 为火山引擎模型请求添加自定义 Header，用于标识调用方来源 (#24) - 感谢 @dragonforce2010

### 🔧 修复（Fixes）

- Packaging: 修复 npm 包缺少 Control UI 资源的问题，导致网关管理页面无法正常显示 (#28)
- Dependencies: 使用 `@openclaw-cn/libsignal` 替代 git 依赖，解决中国大陆用户因无法访问 GitHub 导致安装失败的问题

---

## 2026.2.3

### 🔧 修复（Fixes）

- Packaging: 修复 npm 包缺少 feishu 扩展 dist 目录的问题，导致 onboard 选择本地飞书插件时加载失败

---

## 2026.2.2

### 🚨 安全更新（Security）

- **紧急修复 CVE: GHSA-g8p2-7wf7-98mq** - 1-Click RCE 漏洞修复
  - 修复 URL 参数 `gatewayUrl` 被自动应用的问题，现在需要用户确认
  - 新增 WebSocket Origin 验证，阻止跨站 WebSocket 劫持 (CSWSH) 攻击
  - 详情：https://github.com/clawdbot/clawdbot/security/advisories/GHSA-g8p2-7wf7-98mq
- Security: restrict local media reads to workspace/media (#4880)

### ✨ 新功能（Features）

- **飞书流式输出**：新增飞书消息流式输出支持，使用 CardKit 实现实时打字效果
- **小米 MiMo 模型**：新增小米 MiMo (mimo-v2-flash) 模型提供商支持
- **火山引擎模型**：新增火山引擎 (Volcengine ARK) 模型提供商支持 (#18) Thanks @dragonforce2010
- Models: 添加 Qwen 系列和 DeepSeek Reasoner 模型支持
- Models: 添加 Kimi K2.5 模型到合成目录 (#4407)
- Auth: 新增 MiniMax OAuth 插件 (upstream #4521)

### 🔧 修复（Fixes）

- Control UI: 修复全局安装时静态资源加载问题 (upstream #4909)
- macOS: 修复发现服务 stderr 反压问题 (upstream #3304)
- LINE: 修复 status 命令 TypeError (upstream #4651)
- Routing: 优先使用 requesterOrigin 而非过期的 session entry (upstream #4957)
- BlueBubbles: 修复 text+image 消息的去重逻辑 (upstream #4984)
- Auth: 修复有效 refresh token 时的过期警告 (upstream #4593)
- Telegram: 接受 react 中的数字 messageId/chatId (upstream #4533)
- Telegram: 修复 bold/italic HTML 嵌套问题 (upstream #4578)
- Telegram: 支持 undici fetch 代理 dispatcher (#4456)
- Telegram: 标准化账户 token 查找 (#5055)
- Gateway: 防止未定义的 gateway token 默认值 (#4873)
- Feishu: 增强账户检索逻辑和 AccountId 处理

### 📦 Docker 部署

- 新增预构建 Docker 镜像和多架构支持
- 改进 Docker 部署文档和故障排除指南
- 修复容器权限和路径兼容性问题（支持宝塔面板）

### 🔄 上游合并

本版本合并了 openclaw 2026.1.30 版本的部分功能和修复。

---

## 2026.1.25

Status: unreleased.

### Changes

- Models: add Xiaomi MiMo (小米 MiMo) as model provider.
- Models: add Volcengine (火山引擎) as model provider. (#18) Thanks @dragonforce2010.
- Agents: honor tools.exec.safeBins in exec allowlist checks. (#2281)
- Docs: tighten Fly private deployment steps. (#2289) Thanks @dguido.
- Gateway: warn on hook tokens via query params; document header auth preference. (#2200) Thanks @YuriNachos.
- Gateway: add dangerous Control UI device auth bypass flag + audit warnings. (#2248)
- Doctor: warn on gateway exposure without auth. (#2016) Thanks @Alex-Alaniz.
- Discord: add configurable privileged gateway intents for presences/members. (#2266) Thanks @kentaro.
- Docs: add Vercel AI Gateway to providers sidebar. (#1901) Thanks @jerilynzheng.
- Agents: expand cron tool description with full schema docs. (#1988) Thanks @tomascupr.
- Skills: add missing dependency metadata for GitHub, Notion, Slack, Discord. (#1995) Thanks @jackheuberger.
- Docs: add Render deployment guide. (#1975) Thanks @anurag.
- Docs: add Claude Max API Proxy guide. (#1875) Thanks @atalovesyou.
- Docs: add DigitalOcean deployment guide. (#1870) Thanks @0xJonHoldsCrypto.
- Docs: add Raspberry Pi install guide. (#1871) Thanks @0xJonHoldsCrypto.
- Docs: add GCP Compute Engine deployment guide. (#1848) Thanks @hougangdev.
- Docs: add LINE channel guide. Thanks @thewilloftheshadow.
- Docs: credit both contributors for Control UI refresh. (#1852) Thanks @EnzeD.
- Onboarding: add Venice API key to non-interactive flow. (#1893) Thanks @jonisjongithub.
- Onboarding: strengthen security warning copy for beta + access control expectations.
- Tlon: format thread reply IDs as @ud. (#1837) Thanks @wca4a.
- Gateway: prefer newest session metadata when combining stores. (#1823) Thanks @emanuelst.
- Web UI: keep sub-agent announce replies visible in WebChat. (#1977) Thanks @andrescardonas7.
- CI: increase Node heap size for macOS checks. (#1890) Thanks @realZachi.
- macOS: avoid crash when rendering code blocks by bumping Textual to 0.3.1. (#2033) Thanks @garricn.
- Browser: fall back to URL matching for extension relay target resolution. (#1999) Thanks @jonit-dev.
- Update: ignore dist/control-ui for dirty checks and restore after ui builds. (#1976) Thanks @Glucksberg.
- Telegram: allow caption param for media sends. (#1888) Thanks @mguellsegarra.
- Telegram: support plugin sendPayload channelData (media/buttons) and validate plugin commands. (#1917) Thanks @JoshuaLelon.
- Telegram: avoid block replies when streaming is disabled. (#1885) Thanks @ivancasco.
- Auth: show copyable Google auth URL after ASCII prompt. (#1787) Thanks @robbyczgw-cla.
- Routing: precompile session key regexes. (#1697) Thanks @Ray0907.
- TUI: avoid width overflow when rendering selection lists. (#1686) Thanks @mossein.
- Telegram: keep topic IDs in restart sentinel notifications. (#1807) Thanks @hsrvc.
- Config: apply config.env before ${VAR} substitution. (#1813) Thanks @spanishflu-est1918.
- Slack: clear ack reaction after streamed replies. (#2044) Thanks @fancyboi999.
- macOS: keep custom SSH usernames in remote target. (#2046) Thanks @algal.

### Fixes

- Telegram: wrap reasoning italics per line to avoid raw underscores. (#2181) Thanks @YuriNachos.
- Voice Call: enforce Twilio webhook signature verification for ngrok URLs; disable ngrok free tier bypass by default.
- Security: harden Tailscale Serve auth by validating identity via local tailscaled before trusting headers.
- Build: align memory-core peer dependency with lockfile.
- Security: add mDNS discovery mode with minimal default to reduce information disclosure. (#1882) Thanks @orlyjamie.
- Security: harden URL fetches with DNS pinning to reduce rebinding risk. Thanks Chris Zheng.
- Web UI: improve WebChat image paste previews and allow image-only sends. (#1925) Thanks @smartprogrammer93.
- Security: wrap external hook content by default with a per-hook opt-out. (#1827) Thanks @mertcicekci0.
- Gateway: default auth now fail-closed (token/password required; Tailscale Serve identity remains allowed).

## 2026.1.24-3

### Fixes

- Slack: fix image downloads failing due to missing Authorization header on cross-origin redirects. (#1936) Thanks @sanderhelgesen.
- Gateway: harden reverse proxy handling for local-client detection and unauthenticated proxied connects. (#1795) Thanks @orlyjamie.
- Security audit: flag loopback Control UI with auth disabled as critical. (#1795) Thanks @orlyjamie.
- CLI: resume claude-cli sessions and stream CLI replies to TUI clients. (#1921) Thanks @rmorse.

## 2026.1.24-2

### Fixes

- Packaging: include dist/link-understanding output in npm tarball (fixes missing apply.js import on install).

## 2026.1.24-1

### Fixes

- Packaging: include dist/shared output in npm tarball (fixes missing reasoning-tags import on install).

## 2026.1.24

### Highlights

- Providers: Ollama discovery + docs; Venice guide upgrades + cross-links. (#1606) Thanks @abhaymundhara. https://docs.clawd.bot/providers/ollama https://docs.clawd.bot/providers/venice
- Channels: LINE plugin (Messaging API) with rich replies + quick replies. (#1630) Thanks @plum-dawg.
- TTS: Edge fallback (keyless) + `/tts` auto modes. (#1668, #1667) Thanks @steipete, @sebslight. https://docs.clawd.bot/tts
- Exec approvals: approve in-chat via `/approve` across all channels (including plugins). (#1621) Thanks @czekaj. https://docs.clawd.bot/tools/exec-approvals https://docs.clawd.bot/tools/slash-commands
- Telegram: DM topics as separate sessions + outbound link preview toggle. (#1597, #1700) Thanks @rohannagpal, @zerone0x. https://docs.clawd.bot/channels/telegram

### Changes

- Channels: add LINE plugin (Messaging API) with rich replies, quick replies, and plugin HTTP registry. (#1630) Thanks @plum-dawg.
- TTS: add Edge TTS provider fallback, defaulting to keyless Edge with MP3 retry on format failures. (#1668) Thanks @steipete. https://docs.clawd.bot/tts
- TTS: add auto mode enum (off/always/inbound/tagged) with per-session `/tts` override. (#1667) Thanks @sebslight. https://docs.clawd.bot/tts
- Telegram: treat DM topics as separate sessions and keep DM history limits stable with thread suffixes. (#1597) Thanks @rohannagpal.
- Telegram: add `channels.telegram.linkPreview` to toggle outbound link previews. (#1700) Thanks @zerone0x. https://docs.clawd.bot/channels/telegram
- Web search: add Brave freshness filter parameter for time-scoped results. (#1688) Thanks @JonUleis. https://docs.clawd.bot/tools/web
- UI: refresh Control UI dashboard design system (colors, icons, typography). (#1745, #1786) Thanks @EnzeD, @mousberg.
- Exec approvals: forward approval prompts to chat with `/approve` for all channels (including plugins). (#1621) Thanks @czekaj. https://docs.clawd.bot/tools/exec-approvals https://docs.clawd.bot/tools/slash-commands
- Gateway: expose config.patch in the gateway tool with safe partial updates + restart sentinel. (#1653) Thanks @Glucksberg.
- Diagnostics: add diagnostic flags for targeted debug logs (config + env override). https://docs.clawd.bot/diagnostics/flags
- Docs: expand FAQ (migration, scheduling, concurrency, model recommendations, OpenAI subscription auth, Pi sizing, hackable install, docs SSL workaround).
- Docs: add verbose installer troubleshooting guidance.
- Docs: add macOS VM guide with local/hosted options + VPS/nodes guidance. (#1693) Thanks @f-trycua.
- Docs: add Bedrock EC2 instance role setup + IAM steps. (#1625) Thanks @sergical. https://docs.clawd.bot/bedrock
- Docs: update Fly.io guide notes.
- Dev: add prek pre-commit hooks + dependabot config for weekly updates. (#1720) Thanks @dguido.

### Fixes

- Web UI: fix config/debug layout overflow, scrolling, and code block sizing. (#1715) Thanks @saipreetham589.
- Web UI: show Stop button during active runs, swap back to New session when idle. (#1664) Thanks @ndbroadbent.
- Web UI: clear stale disconnect banners on reconnect; allow form saves with unsupported schema paths but block missing schema. (#1707) Thanks @Glucksberg.
- Web UI: hide internal `message_id` hints in chat bubbles.
- Gateway: allow Control UI token-only auth to skip device pairing even when device identity is present (`gateway.controlUi.allowInsecureAuth`). (#1679) Thanks @steipete.
- Matrix: decrypt E2EE media attachments with preflight size guard. (#1744) Thanks @araa47.
- BlueBubbles: route phone-number targets to DMs, avoid leaking routing IDs, and auto-create missing DMs (Private API required). (#1751) Thanks @tyler6204. https://docs.clawd.bot/channels/bluebubbles
- BlueBubbles: keep part-index GUIDs in reply tags when short IDs are missing.
- iMessage: normalize chat_id/chat_guid/chat_identifier prefixes case-insensitively and keep service-prefixed handles stable. (#1708) Thanks @aaronn.
- Signal: repair reaction sends (group/UUID targets + CLI author flags). (#1651) Thanks @vilkasdev.
- Signal: add configurable signal-cli startup timeout + external daemon mode docs. (#1677) https://docs.clawd.bot/channels/signal
- Telegram: set fetch duplex="half" for uploads on Node 22 to avoid sendPhoto failures. (#1684) Thanks @commdata2338.
- Telegram: use wrapped fetch for long-polling on Node to normalize AbortSignal handling. (#1639)
- Telegram: honor per-account proxy for outbound API calls. (#1774) Thanks @radek-paclt.
- Telegram: fall back to text when voice notes are blocked by privacy settings. (#1725) Thanks @foeken.
- Voice Call: return stream TwiML for outbound conversation calls on initial Twilio webhook. (#1634)
- Voice Call: serialize Twilio TTS playback and cancel on barge-in to prevent overlap. (#1713) Thanks @dguido.
- Google Chat: tighten email allowlist matching, typing cleanup, media caps, and onboarding/docs/tests. (#1635) Thanks @iHildy.
- Google Chat: normalize space targets without double `spaces/` prefix.
- Agents: auto-compact on context overflow prompt errors before failing. (#1627) Thanks @rodrigouroz.
- Agents: use the active auth profile for auto-compaction recovery.
- Media understanding: skip image understanding when the primary model already supports vision. (#1747) Thanks @tyler6204.
- Models: default missing custom provider fields so minimal configs are accepted.
- Messaging: keep newline chunking safe for fenced markdown blocks across channels.
- Messaging: treat newline chunking as paragraph-aware (blank-line splits) to keep lists and headings together. (#1726) Thanks @tyler6204.
- TUI: reload history after gateway reconnect to restore session state. (#1663)
- Heartbeat: normalize target identifiers for consistent routing.
- Exec: keep approvals for elevated ask unless full mode. (#1616) Thanks @ivancasco.
- Exec: treat Windows platform labels as Windows for node shell selection. (#1760) Thanks @ymat19.
- Gateway: include inline config env vars in service install environments. (#1735) Thanks @Seredeep.
- Gateway: skip Tailscale DNS probing when tailscale.mode is off. (#1671)
- Gateway: reduce log noise for late invokes + remote node probes; debounce skills refresh. (#1607) Thanks @petter-b.
- Gateway: clarify Control UI/WebChat auth error hints for missing tokens. (#1690)
- Gateway: listen on IPv6 loopback when bound to 127.0.0.1 so localhost webhooks work.
- Gateway: store lock files in the temp directory to avoid stale locks on persistent volumes. (#1676)
- macOS: default direct-transport `ws://` URLs to port 18789; document `gateway.remote.transport`. (#1603) Thanks @ngutman.
- Tests: cap Vitest workers on CI macOS to reduce timeouts. (#1597) Thanks @rohannagpal.
- Tests: avoid fake-timer dependency in embedded runner stream mock to reduce CI flakes. (#1597) Thanks @rohannagpal.
- Tests: increase embedded runner ordering test timeout to reduce CI flakes. (#1597) Thanks @rohannagpal.

## 2026.1.23-1

### Fixes

- Packaging: include dist/tts output in npm tarball (fixes missing dist/tts/tts.js).

## 2026.1.23

### Highlights

- TTS: move Telegram TTS into core + enable model-driven TTS tags by default for expressive audio replies. (#1559) Thanks @Glucksberg. https://docs.clawd.bot/tts
- Gateway: add `/tools/invoke` HTTP endpoint for direct tool calls (auth + tool policy enforced). (#1575) Thanks @vignesh07. https://docs.clawd.bot/gateway/tools-invoke-http-api
- Heartbeat: per-channel visibility controls (OK/alerts/indicator). (#1452) Thanks @dlauer. https://docs.clawd.bot/gateway/heartbeat
- Deploy: add Fly.io deployment support + guide. (#1570) https://docs.clawd.bot/platforms/fly
- Channels: add Tlon/Urbit channel plugin (DMs, group mentions, thread replies). (#1544) Thanks @wca4a. https://docs.clawd.bot/channels/tlon

### Changes

- Channels: allow per-group tool allow/deny policies across built-in + plugin channels. (#1546) Thanks @adam91holt. https://docs.clawd.bot/multi-agent-sandbox-tools
- Agents: add Bedrock auto-discovery defaults + config overrides. (#1553) Thanks @fal3. https://docs.clawd.bot/bedrock
- CLI: add `clawdbot system` for system events + heartbeat controls; remove standalone `wake`. (commit 71203829d) https://docs.clawd.bot/cli/system
- CLI: add live auth probes to `clawdbot models status` for per-profile verification. (commit 40181afde) https://docs.clawd.bot/cli/models
- CLI: restart the gateway by default after `clawdbot update`; add `--no-restart` to skip it. (commit 2c85b1b40)
- Browser: add node-host proxy auto-routing for remote gateways (configurable per gateway/node). (commit c3cb26f7c)
- Plugins: add optional `llm-task` JSON-only tool for workflows. (#1498) Thanks @vignesh07. https://docs.clawd.bot/tools/llm-task
- Markdown: add per-channel table conversion (bullets for Signal/WhatsApp, code blocks elsewhere). (#1495) Thanks @odysseus0.
- Agents: keep system prompt time zone-only and move current time to `session_status` for better cache hits. (commit 66eec295b)
- Agents: remove redundant bash tool alias from tool registration/display. (#1571) Thanks @Takhoffman.
- Docs: add cron vs heartbeat decision guide (with Lobster workflow notes). (#1533) Thanks @JustYannicc. https://docs.clawd.bot/automation/cron-vs-heartbeat
- Docs: clarify HEARTBEAT.md empty file skips heartbeats, missing file still runs. (#1535) Thanks @JustYannicc. https://docs.clawd.bot/gateway/heartbeat

### Fixes

- Sessions: accept non-UUID sessionIds for history/send/status while preserving agent scoping. (#1518)
- Heartbeat: accept plugin channel ids for heartbeat target validation + UI hints.
- Messaging/Sessions: mirror outbound sends into target session keys (threads + dmScope), create session entries on send, and normalize session key casing. (#1520, commit 4b6cdd1d3)
- Sessions: reject array-backed session stores to prevent silent wipes. (#1469)
- Gateway: compare Linux process start time to avoid PID recycling lock loops; keep locks unless stale. (#1572) Thanks @steipete.
- Gateway: accept null optional fields in exec approval requests. (#1511) Thanks @pvoo.
- Exec approvals: persist allowlist entry ids to keep macOS allowlist rows stable. (#1521) Thanks @ngutman.
- Exec: honor tools.exec ask/security defaults for elevated approvals (avoid unwanted prompts). (commit 5662a9cdf)
- Daemon: use platform PATH delimiters when building minimal service paths. (commit a4e57d3ac)
- Linux: include env-configured user bin roots in systemd PATH and align PATH audits. (#1512) Thanks @robbyczgw-cla.
- Tailscale: retry serve/funnel with sudo only for permission errors and keep original failure details. (#1551) Thanks @sweepies.
- Docker: update gateway command in docker-compose and Hetzner guide. (#1514)
- Agents: show tool error fallback when the last assistant turn only invoked tools (prevents silent stops). (commit 8ea8801d0)
- Agents: ignore IDENTITY.md template placeholders when parsing identity. (#1556)
- Agents: drop orphaned OpenAI Responses reasoning blocks on model switches. (#1562) Thanks @roshanasingh4.
- Agents: add CLI log hint to "agent failed before reply" messages. (#1550) Thanks @sweepies.
- Agents: warn and ignore tool allowlists that only reference unknown or unloaded plugin tools. (#1566)
- Agents: treat plugin-only tool allowlists as opt-ins; keep core tools enabled. (#1467)
- Agents: honor enqueue overrides for embedded runs to avoid queue deadlocks in tests. (commit 084002998)
- Slack: honor open groupPolicy for unlisted channels in message + slash gating. (#1563) Thanks @itsjaydesu.
- Discord: limit autoThread mention bypass to bot-owned threads; keep ack reactions mention-gated. (#1511) Thanks @pvoo.
- Discord: retry rate-limited allowlist resolution + command deploy to avoid gateway crashes. (commit f70ac0c7c)
- Mentions: ignore mentionPattern matches when another explicit mention is present in group chats (Slack/Discord/Telegram/WhatsApp). (commit d905ca0e0)
- Telegram: render markdown in media captions. (#1478)
- MS Teams: remove `.default` suffix from Graph scopes and Bot Framework probe scopes. (#1507, #1574) Thanks @Evizero.
- Browser: keep extension relay tabs controllable when the extension reuses a session id after switching tabs. (#1160)
- Voice wake: auto-save wake words on blur/submit across iOS/Android and align limits with macOS. (commit 69f645c66)
- UI: keep the Control UI sidebar visible while scrolling long pages. (#1515) Thanks @pookNast.
- UI: cache Control UI markdown rendering + memoize chat text extraction to reduce Safari typing jank. (commit d57cb2e1a)
- TUI: forward unknown slash commands, include Gateway commands in autocomplete, and render slash replies as system output. (commit 1af227b61, commit 8195497ce, commit 6fba598ea)
- CLI: auth probe output polish (table output, inline errors, reduced noise, and wrap fixes in `clawdbot models status`). (commit da3f2b489, commit 00ae21bed, commit 31e59cd58, commit f7dc27f2d, commit 438e782f8, commit 886752217, commit aabe0bed3, commit 81535d512, commit c63144ab1)
- Media: only parse `MEDIA:` tags when they start the line to avoid stripping prose mentions. (#1206)
- Media: preserve PNG alpha when possible; fall back to JPEG when still over size cap. (#1491) Thanks @robbyczgw-cla.
- Skills: gate bird Homebrew install to macOS. (#1569) Thanks @bradleypriest.

## 2026.1.22

### Changes

- Highlight: Compaction safeguard now uses adaptive chunking, progressive fallback, and UI status + retries. (#1466) Thanks @dlauer.
- Providers: add Antigravity usage tracking to status output. (#1490) Thanks @patelhiren.
- Slack: add chat-type reply threading overrides via `replyToModeByChatType`. (#1442) Thanks @stefangalescu.
- BlueBubbles: add `asVoice` support for MP3/CAF voice memos in sendAttachment. (#1477, #1482) Thanks @Nicell.
- Onboarding: add hatch choice (TUI/Web/Later), token explainer, background dashboard seed on macOS, and showcase link.

### Fixes

- BlueBubbles: stop typing indicator on idle/no-reply. (#1439) Thanks @Nicell.
- Message tool: keep path/filePath as-is for send; hydrate buffers only for sendAttachment. (#1444) Thanks @hopyky.
- Auto-reply: only report a model switch when session state is available. (#1465) Thanks @robbyczgw-cla.
- Control UI: resolve local avatar URLs with basePath across injection + identity RPC. (#1457) Thanks @dlauer.
- Agents: sanitize assistant history text to strip tool-call markers. (#1456) Thanks @zerone0x.
- Discord: clarify Message Content Intent onboarding hint. (#1487) Thanks @kyleok.
- Gateway: stop the service before uninstalling and fail if it remains loaded.
- Agents: surface concrete API error details instead of generic AI service errors.
- Exec: fall back to non-PTY when PTY spawn fails (EBADF). (#1484)
- Exec approvals: allow per-segment allowlists for chained shell commands on gateway + node hosts. (#1458) Thanks @czekaj.
- Agents: make OpenAI sessions image-sanitize-only; gate tool-id/repair sanitization by provider.
- Doctor: honor CLAWDBOT_GATEWAY_TOKEN for auth checks and security audit token reuse. (#1448) Thanks @azade-c.
- Agents: make tool summaries more readable and only show optional params when set.
- Agents: honor SOUL.md guidance even when the file is nested or path-qualified. (#1434) Thanks @neooriginal.
- Matrix (plugin): persist m.direct for resolved DMs and harden room fallback. (#1436, #1486) Thanks @sibbl.
- CLI: prefer `~` for home paths in output.
- Mattermost (plugin): enforce pairing/allowlist gating, keep @username targets, and clarify plugin-only docs. (#1428) Thanks @damoahdominic.
- Agents: centralize transcript sanitization in the runner; keep <final> tags and error turns intact.
- Auth: skip auth profiles in cooldown during initial selection and rotation. (#1316) Thanks @odrobnik.
- Agents/TUI: honor user-pinned auth profiles during cooldown and preserve search picker ranking. (#1432) Thanks @tobiasbischoff.
- Docs: fix gog auth services example to include docs scope. (#1454) Thanks @zerone0x.
- Slack: reduce WebClient retries to avoid duplicate sends. (#1481)
- Slack: read thread replies for message reads when threadId is provided (replies-only). (#1450) Thanks @rodrigouroz.
- Discord: honor accountId across message actions and cron deliveries. (#1492) Thanks @svkozak.
- macOS: prefer linked channels in gateway summary to avoid false “not linked” status.
- macOS/tests: fix gateway summary lookup after guard unwrap; prevent browser opens during tests. (ECID-1483)

## 2026.1.21-2

### Fixes

- Control UI: ignore bootstrap identity placeholder text for avatar values and fall back to the default avatar. https://docs.clawd.bot/cli/agents https://docs.clawd.bot/web/control-ui
- Slack: remove deprecated `filetype` field from `files.uploadV2` to eliminate API warnings. (#1447)

## 2026.1.21

### Changes

- Highlight: Lobster optional plugin tool for typed workflows + approval gates. https://docs.clawd.bot/tools/lobster
- Lobster: allow workflow file args via `argsJson` in the plugin tool. https://docs.clawd.bot/tools/lobster
- Heartbeat: allow running heartbeats in an explicit session key. (#1256) Thanks @zknicker.
- CLI: default exec approvals to the local host, add gateway/node targeting flags, and show target details in allowlist output.
- CLI: exec approvals mutations render tables instead of raw JSON.
- Exec approvals: support wildcard agent allowlists (`*`) across all agents.
- Exec approvals: allowlist matches resolved binary paths only, add safe stdin-only bins, and tighten allowlist shell parsing.
- Nodes: expose node PATH in status/describe and bootstrap PATH for node-host execution.
- CLI: flatten node service commands under `clawdbot node` and remove `service node` docs.
- CLI: move gateway service commands under `clawdbot gateway` and add `gateway probe` for reachability.
- Sessions: add per-channel reset overrides via `session.resetByChannel`. (#1353) Thanks @cash-echo-bot.
- Agents: add identity avatar config support and Control UI avatar rendering. (#1329, #1424) Thanks @dlauer.
- UI: show per-session assistant identity in the Control UI. (#1420) Thanks @robbyczgw-cla.
- CLI: add `clawdbot update wizard` for interactive channel selection and restart prompts. https://docs.clawd.bot/cli/update
- Signal: add typing indicators and DM read receipts via signal-cli.
- MSTeams: add file uploads, adaptive cards, and attachment handling improvements. (#1410) Thanks @Evizero.
- Onboarding: remove the run setup-token auth option (paste setup-token or reuse CLI creds instead).
- Docs: add troubleshooting entry for gateway.mode blocking gateway start. https://docs.clawd.bot/gateway/troubleshooting
- Docs: add /model allowlist troubleshooting note. (#1405)
- Docs: add per-message Gmail search example for gog. (#1220) Thanks @mbelinky.

### Breaking

- **BREAKING:** Control UI now rejects insecure HTTP without device identity by default. Use HTTPS (Tailscale Serve) or set `gateway.controlUi.allowInsecureAuth: true` to allow token-only auth. https://docs.clawd.bot/web/control-ui#insecure-http
- **BREAKING:** Envelope and system event timestamps now default to host-local time (was UTC) so agents don’t have to constantly convert.

### Fixes

- Nodes/macOS: prompt on allowlist miss for node exec approvals, persist allowlist decisions, and flatten node invoke errors. (#1394) Thanks @ngutman.
- Gateway: keep auto bind loopback-first and add explicit tailnet binding to avoid Tailscale taking over local UI. (#1380)
- Memory: prevent CLI hangs by deferring vector probes, adding sqlite-vec/embedding timeouts, and showing sync progress early.
- Agents: enforce 9-char alphanumeric tool call ids for Mistral providers. (#1372) Thanks @zerone0x.
- Embedded runner: persist injected history images so attachments aren’t reloaded each turn. (#1374) Thanks @Nicell.
- Nodes tool: include agent/node/gateway context in tool failure logs to speed approval debugging.
- macOS: exec approvals now respect wildcard agent allowlists (`*`).
- macOS: allow SSH agent auth when no identity file is set. (#1384) Thanks @ameno-.
- Gateway: prevent multiple gateways from sharing the same config/state at once (singleton lock).
- UI: remove the chat stop button and keep the composer aligned to the bottom edge.
- Typing: start instant typing indicators at run start so DMs and mentions show immediately.
- Configure: restrict the model allowlist picker to OAuth-compatible Anthropic models and preselect Opus 4.5.
- Configure: seed model fallbacks from the allowlist selection when multiple models are chosen.
- Model picker: list the full catalog when no model allowlist is configured.
- Discord: honor wildcard channel configs via shared match helpers. (#1334) Thanks @pvoo.
- BlueBubbles: resolve short message IDs safely and expose full IDs in templates. (#1387) Thanks @tyler6204.
- Infra: preserve fetch helper methods when wrapping abort signals. (#1387)
- macOS: default distribution packaging to universal binaries. (#1396) Thanks @JustYannicc.

## 2026.1.20

### Changes

- Control UI: add copy-as-markdown with error feedback. (#1345) https://docs.clawd.bot/web/control-ui
- Control UI: drop the legacy list view. (#1345) https://docs.clawd.bot/web/control-ui
- TUI: add syntax highlighting for code blocks. (#1200) https://docs.clawd.bot/tui
- TUI: session picker shows derived titles, fuzzy search, relative times, and last message preview. (#1271) https://docs.clawd.bot/tui
- TUI: add a searchable model picker for quicker model selection. (#1198) https://docs.clawd.bot/tui
- TUI: add input history (up/down) for submitted messages. (#1348) https://docs.clawd.bot/tui
- ACP: add `clawdbot acp` for IDE integrations. https://docs.clawd.bot/cli/acp
- ACP: add `clawdbot acp client` interactive harness for debugging. https://docs.clawd.bot/cli/acp
- Skills: add download installs with OS-filtered options. https://docs.clawd.bot/tools/skills
- Skills: add the local sherpa-onnx-tts skill. https://docs.clawd.bot/tools/skills
- Memory: add hybrid BM25 + vector search (FTS5) with weighted merging and fallback. https://docs.clawd.bot/concepts/memory
- Memory: add SQLite embedding cache to speed up reindexing and frequent updates. https://docs.clawd.bot/concepts/memory
- Memory: add OpenAI batch indexing for embeddings when configured. https://docs.clawd.bot/concepts/memory
- Memory: enable OpenAI batch indexing by default for OpenAI embeddings. https://docs.clawd.bot/concepts/memory
- Memory: allow parallel OpenAI batch indexing jobs (default concurrency: 2). https://docs.clawd.bot/concepts/memory
- Memory: render progress immediately, color batch statuses in verbose logs, and poll OpenAI batch status every 2s by default. https://docs.clawd.bot/concepts/memory
- Memory: add `--verbose` logging for memory status + batch indexing details. https://docs.clawd.bot/concepts/memory
- Memory: add native Gemini embeddings provider for memory search. (#1151) https://docs.clawd.bot/concepts/memory
- Browser: allow config defaults for efficient snapshots in the tool/CLI. (#1336) https://docs.clawd.bot/tools/browser
- Nostr: add the Nostr channel plugin with profile management + onboarding defaults. (#1323) https://docs.clawd.bot/channels/nostr
- Matrix: migrate to matrix-bot-sdk with E2EE support, location handling, and group allowlist upgrades. (#1298) https://docs.clawd.bot/channels/matrix
- Slack: add HTTP webhook mode via Bolt HTTP receiver. (#1143) https://docs.clawd.bot/channels/slack
- Telegram: enrich forwarded-message context with normalized origin details + legacy fallback. (#1090) https://docs.clawd.bot/channels/telegram
- Discord: fall back to `/skill` when native command limits are exceeded. (#1287)
- Discord: expose `/skill` globally. (#1287)
- Zalouser: add channel dock metadata, config schema, setup wiring, probe, and status issues. (#1219) https://docs.clawd.bot/plugins/zalouser
- Plugins: require manifest-embedded config schemas with preflight validation warnings. (#1272) https://docs.clawd.bot/plugins/manifest
- Plugins: move channel catalog metadata into plugin manifests. (#1290) https://docs.clawd.bot/plugins/manifest
- Plugins: align Nextcloud Talk policy helpers with core patterns. (#1290) https://docs.clawd.bot/plugins/manifest
- Plugins/UI: let channel plugin metadata drive UI labels/icons and cron channel options. (#1306) https://docs.clawd.bot/web/control-ui
- Agents/UI: add agent avatar support in identity config, IDENTITY.md, and the Control UI. (#1329) https://docs.clawd.bot/gateway/configuration
- Plugins: add plugin slots with a dedicated memory slot selector. https://docs.clawd.bot/plugins/agent-tools
- Plugins: ship the bundled BlueBubbles channel plugin (disabled by default). https://docs.clawd.bot/channels/bluebubbles
- Plugins: migrate bundled messaging extensions to the plugin SDK and resolve plugin-sdk imports in the loader.
- Plugins: migrate the Zalo plugin to the shared plugin SDK runtime. https://docs.clawd.bot/channels/zalo
- Plugins: migrate the Zalo Personal plugin to the shared plugin SDK runtime. https://docs.clawd.bot/plugins/zalouser
- Plugins: allow optional agent tools with explicit allowlists and add the plugin tool authoring guide. https://docs.clawd.bot/plugins/agent-tools
- Plugins: auto-enable bundled channel/provider plugins when configuration is present.
- Plugins: sync plugin sources on channel switches and update npm-installed plugins during `clawdbot update`.
- Plugins: share npm plugin update logic between `clawdbot update` and `clawdbot plugins update`.

- Gateway/API: add `/v1/responses` (OpenResponses) with item-based input + semantic streaming events. (#1229)
- Gateway/API: expand `/v1/responses` to support file/image inputs, tool_choice, usage, and output limits. (#1229)
- Usage: add `/usage cost` summaries and macOS menu cost charts. https://docs.clawd.bot/reference/api-usage-costs
- Security: warn when <=300B models run without sandboxing while web tools are enabled. https://docs.clawd.bot/cli/security
- Exec: add host/security/ask routing for gateway + node exec. https://docs.clawd.bot/tools/exec
- Exec: add `/exec` directive for per-session exec defaults (host/security/ask/node). https://docs.clawd.bot/tools/exec
- Exec approvals: migrate approvals to `~/.clawdbot/exec-approvals.json` with per-agent allowlists + skill auto-allow toggle, and add approvals UI + node exec lifecycle events. https://docs.clawd.bot/tools/exec-approvals
- Nodes: add headless node host (`clawdbot node start`) for `system.run`/`system.which`. https://docs.clawd.bot/cli/node
- Nodes: add node daemon service install/status/start/stop/restart. https://docs.clawd.bot/cli/node
- Bridge: add `skills.bins` RPC to support node host auto-allow skill bins.
- Sessions: add daily reset policy with per-type overrides and idle windows (default 4am local), preserving legacy idle-only configs. (#1146) https://docs.clawd.bot/concepts/session
- Sessions: allow `sessions_spawn` to override thinking level for sub-agent runs. https://docs.clawd.bot/tools/subagents
- Channels: unify thread/topic allowlist matching + command/mention gating helpers across core providers. https://docs.clawd.bot/concepts/groups
- Models: add Qwen Portal OAuth provider support. (#1120) https://docs.clawd.bot/providers/qwen
- Onboarding: add allowlist prompts and username-to-id resolution across core and extension channels. https://docs.clawd.bot/start/onboarding
- Docs: clarify allowlist input types and onboarding behavior for messaging channels. https://docs.clawd.bot/start/onboarding
- Docs: refresh Android node discovery docs for the Gateway WS service type. https://docs.clawd.bot/platforms/android
- Docs: surface Amazon Bedrock in provider lists and clarify Bedrock auth env vars. (#1289) https://docs.clawd.bot/bedrock
- Docs: clarify WhatsApp voice notes. https://docs.clawd.bot/channels/whatsapp
- Docs: clarify Windows WSL portproxy LAN access notes. https://docs.clawd.bot/platforms/windows
- Docs: refresh bird skill install metadata and usage notes. (#1302) https://docs.clawd.bot/tools/browser-login
- Agents: add local docs path resolution and include docs/mirror/source/community pointers in the system prompt.
- Agents: clarify node_modules read-only guidance in agent instructions.
- Config: stamp last-touched metadata on write and warn if the config is newer than the running build.
- macOS: hide usage section when usage is unavailable instead of showing provider errors.
- Android: migrate node transport to the Gateway WebSocket protocol with TLS pinning support + gateway discovery naming.
- Android: send structured payloads in node events/invokes and include user-agent metadata in gateway connects.
- Android: remove legacy bridge transport code now that nodes use the gateway protocol.
- Android: bump okhttp + dnsjava to satisfy lint dependency checks.
- Build: update workspace + core/plugin deps.
- Build: use tsgo for dev/watch builds by default (opt out with `CLAWDBOT_TS_COMPILER=tsc`).
- Repo: remove the Peekaboo git submodule now that the SPM release is used.
- macOS: switch PeekabooBridge integration to the tagged Swift Package Manager release.
- macOS: stop syncing Peekaboo in postinstall.
- Swabble: use the tagged Commander Swift package release.

### Breaking

- **BREAKING:** Reject invalid/unknown config entries and refuse to start the gateway for safety. Run `clawdbot doctor --fix` to repair, then update plugins (`clawdbot plugins update`) if you use any.

### Fixes

- Discovery: shorten Bonjour DNS-SD service type to `_clawdbot-gw._tcp` and update discovery clients/docs.
- Diagnostics: export OTLP logs, correct queue depth tracking, and document message-flow telemetry.
- Diagnostics: emit message-flow diagnostics across channels via shared dispatch. (#1244)
- Diagnostics: gate heartbeat/webhook logging. (#1244)
- Gateway: strip inbound envelope headers from chat history messages to keep clients clean.
- Gateway: clarify unauthorized handshake responses with token/password mismatch guidance.
- Gateway: allow mobile node client ids for iOS + Android handshake validation. (#1354)
- Gateway: clarify connect/validation errors for gateway params. (#1347)
- Gateway: preserve restart wake routing + thread replies across restarts. (#1337)
- Gateway: reschedule per-agent heartbeats on config hot reload without restarting the runner.
- Gateway: require authorized restarts for SIGUSR1 (restart/apply/update) so config gating can't be bypassed.
- Cron: auto-deliver isolated agent output to explicit targets without tool calls. (#1285)
- Agents: preserve subagent announce thread/topic routing + queued replies across channels. (#1241)
- Agents: propagate accountId into embedded runs so sub-agent announce routing honors the originating account. (#1058)
- Agents: avoid treating timeout errors with "aborted" messages as user aborts, so model fallback still runs. (#1137)
- Agents: sanitize oversized image payloads before send and surface image-dimension errors.
- Sessions: fall back to session labels when listing display names. (#1124)
- Compaction: include tool failure summaries in safeguard compaction to prevent retry loops. (#1084)
- Config: log invalid config issues once per run and keep invalid-config errors stackless.
- Config: allow Perplexity as a web_search provider in config validation. (#1230)
- Config: allow custom fields under `skills.entries.<name>.config` for skill credentials/config. (#1226)
- Doctor: clarify plugin auto-enable hint text in the startup banner.
- Doctor: canonicalize legacy session keys in session stores to prevent stale metadata. (#1169)
- Docs: make docs:list fail fast with a clear error if the docs directory is missing.
- Plugins: add Nextcloud Talk manifest for plugin config validation. (#1297)
- Plugins: surface plugin load/register/config errors in gateway logs with plugin/source context.
- CLI: preserve cron delivery settings when editing message payloads. (#1322)
- CLI: keep `clawdbot logs` output resilient to broken pipes while preserving progress output.
- CLI: avoid duplicating --profile/--dev flags when formatting commands.
- CLI: centralize CLI command registration to keep fast-path routing and program wiring in sync. (#1207)
- CLI: keep banners on routed commands, restore config guarding outside fast-path routing, and tighten fast-path flag parsing while skipping console capture for extra speed. (#1195)
- CLI: skip runner rebuilds when dist is fresh. (#1231)
- CLI: add WSL2/systemd unavailable hints in daemon status/doctor output.
- Status: route native `/status` to the active agent so model selection reflects the correct profile. (#1301)
- Status: show both usage windows with reset hints when usage data is available. (#1101)
- UI: keep config form enums typed, preserve empty strings, protect sensitive defaults, and deepen config search. (#1315)
- UI: preserve ordered list numbering in chat markdown. (#1341)
- UI: allow Control UI to read gatewayUrl from URL params for remote WebSocket targets. (#1342)
- UI: prevent double-scroll in Control UI chat by locking chat layout to the viewport. (#1283)
- UI: enable shell mode for sync Windows spawns to avoid `pnpm ui:build` EINVAL. (#1212)
- TUI: keep thinking blocks ordered before content during streaming and isolate per-run assembly. (#1202)
- TUI: align custom editor initialization with the latest pi-tui API. (#1298)
- TUI: show generic empty-state text for searchable pickers. (#1201)
- TUI: highlight model search matches and stabilize search ordering.
- Configure: hide OpenRouter auto routing model from the model picker. (#1182)
- Memory: show total file counts + scan issues in `clawdbot memory status`.
- Memory: fall back to non-batch embeddings after repeated batch failures.
- Memory: apply OpenAI batch defaults even without explicit remote config.
- Memory: index atomically so failed reindex preserves the previous memory database. (#1151)
- Memory: avoid sqlite-vec unique constraint failures when reindexing duplicate chunk ids. (#1151)
- Memory: retry transient 5xx errors (Cloudflare) during embedding indexing.
- Memory: parallelize embedding indexing with rate-limit retries.
- Memory: split overly long lines to keep embeddings under token limits.
- Memory: skip empty chunks to avoid invalid embedding inputs.
- Memory: split embedding batches to avoid OpenAI token limits during indexing.
- Memory: probe sqlite-vec availability in `clawdbot memory status`.
- Exec approvals: enforce allowlist when ask is off.
- Exec approvals: prefer raw command for node approvals/events.
- Tools: show exec elevated flag before the command and keep it outside markdown in tool summaries.
- Tools: return a companion-app-required message when node exec is requested with no paired node.
- Tools: return a companion-app-required message when `system.run` is requested without a supporting node.
- Exec: default gateway/node exec security to allowlist when unset (sandbox stays deny).
- Exec: prefer bash when fish is default shell, falling back to sh if bash is missing. (#1297)
- Exec: merge login-shell PATH for host=gateway exec while keeping daemon PATH minimal. (#1304)
- Streaming: emit assistant deltas for OpenAI-compatible SSE chunks. (#1147)
- Discord: make resolve warnings avoid raw JSON payloads on rate limits.
- Discord: process message handlers in parallel across sessions to avoid event queue blocking. (#1295)
- Discord: stop reconnecting the gateway after aborts to prevent duplicate listeners.
- Discord: only emit slow listener warnings after 30s.
- Discord: inherit parent channel allowlists for thread slash commands and reactions. (#1123)
- Telegram: honor pairing allowlists for native slash commands.
- Telegram: preserve hidden text_link URLs by expanding entities in inbound text. (#1118)
- Slack: resolve Bolt import interop for Bun + Node. (#1191)
- Web search: infer Perplexity base URL from API key source (direct vs OpenRouter).
- Web fetch: harden SSRF protection with shared hostname checks and redirect limits. (#1346)
- Browser: register AI snapshot refs for act commands. (#1282)
- Voice call: include request query in Twilio webhook verification when publicUrl is set. (#864)
- Anthropic: default API prompt caching to 1h with configurable TTL override.
- Anthropic: ignore TTL for OAuth.
- Auth profiles: keep auto-pinned preference while allowing rotation on failover. (#1138)
- Auth profiles: user pins stay locked. (#1138)
- Model catalog: avoid caching import failures, log transient discovery errors, and keep partial results. (#1332)
- Tests: stabilize Windows gateway/CLI tests by skipping sidecars, normalizing argv, and extending timeouts.
- Tests: stabilize plugin SDK resolution and embedded agent timeouts.
- Windows: install gateway scheduled task as the current user.
- Windows: show friendly guidance instead of failing on access denied.
- macOS: load menu session previews asynchronously so items populate while the menu is open.
- macOS: use label colors for session preview text so previews render in menu subviews.
- macOS: suppress usage error text in the menubar cost view.
- macOS: Doctor repairs LaunchAgent bootstrap issues for Gateway + Node when listed but not loaded. (#1166)
- macOS: avoid touching launchd in Remote over SSH so quitting the app no longer disables the remote gateway. (#1105)
- macOS: bundle Textual resources in packaged app builds to avoid code block crashes. (#1006)
- Daemon: include HOME in service environments to avoid missing HOME errors. (#1214)

Thanks @AlexMikhalev, @CoreyH, @John-Rood, @KrauseFx, @MaudeBot, @Nachx639, @NicholaiVogel, @RyanLisse, @ThePickle31, @VACInc, @Whoaa512, @YuriNachos, @aaronveklabs, @abdaraxus, @alauppe, @ameno-, @artuskg, @austinm911, @bradleypriest, @cheeeee, @dougvk, @fogboots, @gnarco, @gumadeiras, @jdrhyne, @joelklabo, @longmaba, @mukhtharcm, @odysseus0, @oscargavin, @rhjoh, @sebslight, @sibbl, @sleontenko, @steipete, @suminhthanh, @thewilloftheshadow, @tyler6204, @vignesh07, @visionik, @ysqander, @zerone0x.

## 2026.1.16-2

### Changes

- CLI: stamp build commit into dist metadata so banners show the commit in npm installs.
- CLI: close memory manager after memory commands to avoid hanging processes. (#1127) — thanks @NicholasSpisak.

## 2026.1.16-1

### Highlights

- Hooks: add hooks system with bundled hooks, CLI tooling, and docs. (#1028) — thanks @ThomsenDrake. https://docs.clawd.bot/hooks
- Media: add inbound media understanding (image/audio/video) with provider + CLI fallbacks. https://docs.clawd.bot/nodes/media-understanding
- Plugins: add Zalo Personal plugin (`@clawdbot/zalouser`) and unify channel directory for plugins. (#1032) — thanks @suminhthanh. https://docs.clawd.bot/plugins/zalouser
- Models: add Vercel AI Gateway auth choice + onboarding updates. (#1016) — thanks @timolins. https://docs.clawd.bot/providers/vercel-ai-gateway
- Sessions: add `session.identityLinks` for cross-platform DM session li nking. (#1033) — thanks @thewilloftheshadow. https://docs.clawd.bot/concepts/session
- Web search: add `country`/`language` parameters (schema + Brave API) and docs. (#1046) — thanks @YuriNachos. https://docs.clawd.bot/tools/web

### Breaking

- **BREAKING:** `clawdbot message` and message tool now require `target` (dropping `to`/`channelId` for destinations). (#1034) — thanks @tobalsan.
- **BREAKING:** Channel auth now prefers config over env for Discord/Telegram/Matrix (env is fallback only). (#1040) — thanks @thewilloftheshadow.
- **BREAKING:** Drop legacy `chatType: "room"` support; use `chatType: "channel"`.
- **BREAKING:** remove legacy provider-specific target resolution fallbacks; target resolution is centralized with plugin hints + directory lookups.
- **BREAKING:** `clawdbot hooks` is now `clawdbot webhooks`; hooks live under `clawdbot hooks`. https://docs.clawd.bot/cli/webhooks
- **BREAKING:** `clawdbot plugins install <path>` now copies into `~/.clawdbot/extensions` (use `--link` to keep path-based loading).

### Changes

- Plugins: ship bundled plugins disabled by default and allow overrides by installed versions. (#1066) — thanks @ItzR3NO.
- Plugins: add bundled Antigravity + Gemini CLI OAuth + Copilot Proxy provider plugins. (#1066) — thanks @ItzR3NO.
- Tools: improve `web_fetch` extraction using Readability (with fallback).
- Tools: add Firecrawl fallback for `web_fetch` when configured.
- Tools: send Chrome-like headers by default for `web_fetch` to improve extraction on bot-sensitive sites.
- Tools: Firecrawl fallback now uses bot-circumvention + cache by default; remove basic HTML fallback when extraction fails.
- Tools: default `exec` exit notifications and auto-migrate legacy `tools.bash` to `tools.exec`.
- Tools: add `exec` PTY support for interactive sessions. https://docs.clawd.bot/tools/exec
- Tools: add tmux-style `process send-keys` and bracketed paste helpers for PTY sessions.
- Tools: add `process submit` helper to send CR for PTY sessions.
- Tools: respond to PTY cursor position queries to unblock interactive TUIs.
- Tools: include tool outputs in verbose mode and expand verbose tool feedback.
- Skills: update coding-agent guidance to prefer PTY-enabled exec runs and simplify tmux usage.
- TUI: refresh session token counts after runs complete or fail. (#1079) — thanks @d-ploutarchos.
- Status: trim `/status` to current-provider usage only and drop the OAuth/token block.
- Directory: unify `clawdbot directory` across channels and plugin channels.
- UI: allow deleting sessions from the Control UI.
- Memory: add sqlite-vec vector acceleration with CLI status details.
- Memory: add experimental session transcript indexing for memory_search (opt-in via memorySearch.experimental.sessionMemory + sources).
- Skills: add user-invocable skill commands and expanded skill command registration.
- Telegram: default reaction level to minimal and enable reaction notifications by default.
- Telegram: allow reply-chain messages to bypass mention gating in groups. (#1038) — thanks @adityashaw2.
- iMessage: add remote attachment support for VM/SSH deployments.
- Messages: refresh live directory cache results when resolving targets.
- Messages: mirror delivered outbound text/media into session transcripts. (#1031) — thanks @TSavo.
- Messages: avoid redundant sender envelopes for iMessage + Signal group chats. (#1080) — thanks @tyler6204.
- Media: normalize Deepgram audio upload bytes for fetch compatibility.
- Cron: isolated cron jobs now start a fresh session id on every run to prevent context buildup.
- Docs: add `/help` hub, Node/npm PATH guide, and expand directory CLI docs.
- Config: support env var substitution in config values. (#1044) — thanks @sebslight.
- Health: add per-agent session summaries and account-level health details, and allow selective probes. (#1047) — thanks @gumadeiras.
- Hooks: add hook pack installs (npm/path/zip/tar) with `clawdbot.hooks` manifests and `clawdbot hooks install/update`.
- Plugins: add zip installs and `--link` to avoid copying local paths.

### Fixes

- macOS: drain subprocess pipes before waiting to avoid deadlocks. (#1081) — thanks @thesash.
- Verbose: wrap tool summaries/output in markdown only for markdown-capable channels.
- Tools: include provider/session context in elevated exec denial errors.
- Tools: normalize exec tool alias naming in tool error logs.
- Logging: reuse shared ANSI stripping to keep console capture lint-clean.
- Logging: prefix nested agent output with session/run/channel context.
- Telegram: accept tg/group/telegram prefixes + topic targets for inline button validation. (#1072) — thanks @danielz1z.
- Telegram: split long captions into follow-up messages.
- Config: block startup on invalid config, preserve best-effort doctor config, and keep rolling config backups. (#1083) — thanks @mukhtharcm.
- Sub-agents: normalize announce delivery origin + queue bucketing by accountId to keep multi-account routing stable. (#1061, #1058) — thanks @adam91holt.
- Sessions: include deliveryContext in sessions.list and reuse normalized delivery routing for announce/restart fallbacks. (#1058)
- Sessions: propagate deliveryContext into last-route updates to keep account/channel routing stable. (#1058)
- Sessions: preserve overrides on `/new` reset.
- Memory: prevent unhandled rejections when watch/interval sync fails. (#1076) — thanks @roshanasingh4.
- Memory: avoid gateway crash when embeddings return 429/insufficient_quota (disable tool + surface error). (#1004)
- Gateway: honor explicit delivery targets without implicit accountId fallback; preserve lastAccountId for implicit routing.
- Gateway: avoid reusing last-to/accountId when the requested channel differs; sync deliveryContext with last route fields.
- Build: allow `@lydell/node-pty` builds on supported platforms.
- Repo: fix oxlint config filename and move ignore pattern into config. (#1064) — thanks @connorshea.
- Messages: `/stop` now hard-aborts queued followups and sub-agent runs; suppress zero-count stop notes.
- Messages: honor message tool channel when deduping sends.
- Messages: include sender labels for live group messages across channels, matching queued/history formatting. (#1059)
- Sessions: reset `compactionCount` on `/new` and `/reset`, and preserve `sessions.json` file mode (0600).
- Sessions: repair orphaned user turns before embedded prompts.
- Sessions: hard-stop `sessions.delete` cleanup.
- Channels: treat replies to the bot as implicit mentions across supported channels.
- Channels: normalize object-format capabilities in channel capability parsing.
- Security: default-deny slash/control commands unless a channel computed `CommandAuthorized` (fixes accidental “open” behavior), and ensure WhatsApp + Zalo plugin channels gate inline `/…` tokens correctly. https://docs.clawd.bot/gateway/security
- Security: redact sensitive text in gateway WS logs.
- Tools: cap pending `exec` process output to avoid unbounded buffers.
- CLI: speed up `clawdbot sandbox-explain` by avoiding heavy plugin imports when normalizing channel ids.
- Browser: remote profile tab operations prefer persistent Playwright and avoid silent HTTP fallbacks. (#1057) — thanks @mukhtharcm.
- Browser: remote profile tab ops follow-up: shared Playwright loader, Playwright-based focus, and more coverage (incl. opt-in live Browserless test). (follow-up to #1057) — thanks @mukhtharcm.
- Browser: refresh extension relay tab metadata after navigation so `/json/list` stays current. (#1073) — thanks @roshanasingh4.
- WhatsApp: scope self-chat response prefix; inject pending-only group history and clear after any processed message.
- WhatsApp: include `linked` field in `describeAccount`.
- Agents: drop unsigned Gemini tool calls and avoid JSON Schema `format` keyword collisions.
- Agents: hide the image tool when the primary model already supports images.
- Agents: avoid duplicate sends by replying with `NO_REPLY` after `message` tool sends.
- Auth: inherit/merge sub-agent auth profiles from the main agent.
- Gateway: resolve local auth for security probe and validate gateway token/password file modes. (#1011, #1022) — thanks @ivanrvpereira, @kkarimi.
- Signal/iMessage: bound transport readiness waits to 30s with periodic logging. (#1014) — thanks @Szpadel.
- iMessage: avoid RPC restart loops.
- OpenAI image-gen: handle URL + `b64_json` responses and remove deprecated `response_format` (use URL downloads).
- CLI: auto-update global installs when installed via a package manager.
- Routing: migrate legacy `accountID` bindings to `accountId` and remove legacy fallback lookups. (#1047) — thanks @gumadeiras.
- Discord: truncate skill command descriptions to 100 chars for slash command limits. (#1018) — thanks @evalexpr.
- Security: bump `tar` to 7.5.3.
- Models: align ZAI thinking toggles.
- iMessage/Signal: include sender metadata for non-queued group messages. (#1059)
- Discord: preserve whitespace when chunking long lines so message splits keep spacing intact.
- Skills: fix skills watcher ignored list typing (tsc).

## 2026.1.15

### Highlights

- Plugins: add provider auth registry + `clawdbot models auth login` for plugin-driven OAuth/API key flows.
- Browser: improve remote CDP/Browserless support (auth passthrough, `wss` upgrade, timeouts, clearer errors).
- Heartbeat: per-agent configuration + 24h duplicate suppression. (#980) — thanks @voidserf.
- Security: audit warns on weak model tiers; app nodes store auth tokens encrypted (Keychain/SecurePrefs).

### Breaking

- **BREAKING:** iOS minimum version is now 18.0 to support Textual markdown rendering in native chat. (#702)
- **BREAKING:** Microsoft Teams is now a plugin; install `@clawdbot/msteams` via `clawdbot plugins install @clawdbot/msteams`.
- **BREAKING:** Channel auth now prefers config over env for Discord/Telegram/Matrix (env is fallback only). (#1040) — thanks @thewilloftheshadow.

### Changes

- UI/Apps: move channel/config settings to schema-driven forms and rename Connections → Channels. (#1040) — thanks @thewilloftheshadow.
- CLI: set process titles to `clawdbot-<command>` for clearer process listings.
- CLI/macOS: sync remote SSH target/identity to config and let `gateway status` auto-infer SSH targets (ssh-config aware).
- Telegram: scope inline buttons with allowlist default + callback gating in DMs/groups.
- Telegram: default reaction notifications to own.
- Tools: improve `web_fetch` extraction using Readability (with fallback).
- Heartbeat: tighten prompt guidance + suppress duplicate alerts for 24h. (#980) — thanks @voidserf.
- Repo: ignore local identity files to avoid accidental commits. (#1001) — thanks @gerardward2007.
- Sessions/Security: add `session.dmScope` for multi-user DM isolation and audit warnings. (#948) — thanks @Alphonse-arianee.
- Plugins: add provider auth registry + `clawdbot models auth login` for plugin-driven OAuth/API key flows.
- Onboarding: switch channels setup to a single-select loop with per-channel actions and disabled hints in the picker.
- TUI: show provider/model labels for the active session and default model.
- Heartbeat: add per-agent heartbeat configuration and multi-agent docs example.
- UI: show gateway auth guidance + doc link on unauthorized Control UI connections.
- UI: add session deletion action in Control UI sessions list. (#1017) — thanks @Szpadel.
- Security: warn on weak model tiers (Haiku, below GPT-5, below Claude 4.5) in `clawdbot security audit`.
- Apps: store node auth tokens encrypted (Keychain/SecurePrefs).
- Daemon: share profile/state-dir resolution across service helpers and honor `CLAWDBOT_STATE_DIR` for Windows task scripts.
- Docs: clarify multi-gateway rescue bot guidance. (#969) — thanks @bjesuiter.
- Agents: add Current Date & Time system prompt section with configurable time format (auto/12/24).
- Tools: normalize Slack/Discord message timestamps with `timestampMs`/`timestampUtc` while keeping raw provider fields.
- macOS: add `system.which` for prompt-free remote skill discovery (with gateway fallback to `system.run`).
- Docs: add Date & Time guide and update prompt/timezone configuration docs.
- Messages: debounce rapid inbound messages across channels with per-connector overrides. (#971) — thanks @juanpablodlc.
- Messages: allow media-only sends (CLI/tool) and show Telegram voice recording status for voice notes. (#957) — thanks @rdev.
- Auth/Status: keep auth profiles sticky per session (rotate on compaction/new), surface provider usage headers in `/status` and `clawdbot models status`, and update docs.
- CLI: add `--json` output for `clawdbot daemon` lifecycle/install commands.
- Memory: make `node-llama-cpp` an optional dependency (avoid Node 25 install failures) and improve local-embeddings fallback/errors.
- Browser: add `snapshot refs=aria` (Playwright aria-ref ids) for self-resolving refs across `snapshot` → `act`.
- Browser: `profile="chrome"` now defaults to host control and returns clearer “attach a tab” errors.
- Browser: prefer stable Chrome for auto-detect, with Brave/Edge fallbacks and updated docs. (#983) — thanks @cpojer.
- Browser: increase remote CDP reachability timeouts + add `remoteCdpTimeoutMs`/`remoteCdpHandshakeTimeoutMs`.
- Browser: preserve auth/query tokens for remote CDP endpoints and pass Basic auth for CDP HTTP/WS. (#895) — thanks @mukhtharcm.
- Telegram: add bidirectional reaction support with configurable notifications and agent guidance. (#964) — thanks @bohdanpodvirnyi.
- Telegram: allow custom commands in the bot menu (merged with native; conflicts ignored). (#860) — thanks @nachoiacovino.
- Discord: allow allowlisted guilds without channel lists to receive messages when `groupPolicy="allowlist"`. — thanks @thewilloftheshadow.
- Discord: allow emoji/sticker uploads + channel actions in config defaults. (#870) — thanks @JDIVE.

### Fixes

- Messages: make `/stop` clear queued followups and pending session lane work for a hard abort.
- Messages: make `/stop` abort active sub-agent runs spawned from the requester session and report how many were stopped.
- WhatsApp: report linked status consistently in channel status. (#1050) — thanks @YuriNachos.
- Sessions: keep per-session overrides when `/new` resets compaction counters. (#1050) — thanks @YuriNachos.
- Skills: allow OpenAI image-gen helper to handle URL or base64 responses. (#1050) — thanks @YuriNachos.
- WhatsApp: default response prefix only for self-chat, using identity name when set.
- Signal/iMessage: bound transport readiness waits to 30s with periodic logging. (#1014) — thanks @Szpadel.
- iMessage: treat missing `imsg rpc` support as fatal to avoid restart loops.
- Auth: merge main auth profiles into per-agent stores for sub-agents and document inheritance. (#1013) — thanks @marcmarg.
- Agents: avoid JSON Schema `format` collisions in tool params by renaming snapshot format fields. (#1013) — thanks @marcmarg.
- Fix: make `clawdbot update` auto-update global installs when installed via a package manager.
- Fix: list model picker entries as provider/model pairs for explicit selection. (#970) — thanks @mcinteerj.
- Fix: align OpenAI image-gen defaults with DALL-E 3 standard quality and document output formats. (#880) — thanks @mkbehr.
- Fix: persist `gateway.mode=local` after selecting Local run mode in `clawdbot configure`, even if no other sections are chosen.
- Daemon: fix profile-aware service label resolution (env-driven) and add coverage for launchd/systemd/schtasks. (#969) — thanks @bjesuiter.
- Agents: avoid false positives when logging unsupported Google tool schema keywords.
- Agents: skip Gemini history downgrades for google-antigravity to preserve tool calls. (#894) — thanks @mukhtharcm.
- Status: restore usage summary line for current provider when no OAuth profiles exist.
- Fix: guard model fallback against undefined provider/model values. (#954) — thanks @roshanasingh4.
- Fix: refactor session store updates, add chat.inject, and harden subagent cleanup flow. (#944) — thanks @tyler6204.
- Fix: clean up suspended CLI processes across backends. (#978) — thanks @Nachx639.
- Fix: support MiniMax coding plan usage responses with `model_remains`/`current_interval_*` payloads.
- Fix: honor message tool channel for duplicate suppression (prefer `NO_REPLY` after `message` tool sends). (#1053) — thanks @sashcatanzarite.
- Fix: suppress WhatsApp pairing replies for historical catch-up DMs on initial link. (#904)
- Browser: extension mode recovers when only one tab is attached (stale targetId fallback).
- Browser: fix `tab not found` for extension relay snapshots/actions when Playwright blocks `newCDPSession` (use the single available Page).
- Browser: upgrade `ws` → `wss` when remote CDP uses `https` (fixes Browserless handshake).
- Telegram: skip `message_thread_id=1` for General topic sends while keeping typing indicators. (#848) — thanks @azade-c.
- Fix: sanitize user-facing error text + strip `<final>` tags across reply pipelines. (#975) — thanks @ThomsenDrake.
- Fix: normalize pairing CLI aliases, allow extension channels, and harden Zalo webhook payload parsing. (#991) — thanks @longmaba.
- Fix: allow local Tailscale Serve hostnames without treating tailnet clients as direct. (#885) — thanks @oswalpalash.
- Fix: reset sessions after role-ordering conflicts to recover from consecutive user turns. (#998)

## 2026.1.14-1

### Highlights

- Web search: `web_search`/`web_fetch` tools (Brave API) + first-time setup in onboarding/configure.
- Browser control: Chrome extension relay takeover mode + remote browser control via `clawdbot browser serve`.
- Plugins: channel plugins (gateway HTTP hooks) + Zalo plugin + onboarding install flow. (#854) — thanks @longmaba.
- Security: expanded `clawdbot security audit` (+ `--fix`), detect-secrets CI scan, and a `SECURITY.md` reporting policy.

### Changes

- Docs: clarify per-agent auth stores, sandboxed skill binaries, and elevated semantics.
- Docs: add FAQ entries for missing provider auth after adding agents and Gemini thinking signature errors.
- Agents: add optional auth-profile copy prompt on `agents add` and improve auth error messaging.
- Security: expand `clawdbot security audit` checks (model hygiene, config includes, plugin allowlists, exposure matrix) and extend `--fix` to tighten more sensitive state paths.
- Security: add `SECURITY.md` reporting policy.
- Channels: add Matrix plugin (external) with docs + onboarding hooks.
- Plugins: add Zalo channel plugin with gateway HTTP hooks and onboarding install prompt. (#854) — thanks @longmaba.
- Onboarding: add a security checkpoint prompt (docs link + sandboxing hint); require `--accept-risk` for `--non-interactive`.
- Docs: expand gateway security hardening guidance and incident response checklist.
- Docs: document DM history limits for channel DMs. (#883) — thanks @pkrmf.
- Security: add detect-secrets CI scan and baseline guidance. (#227) — thanks @Hyaxia.
- Tools: add `web_search`/`web_fetch` (Brave API), auto-enable `web_fetch` for sandboxed sessions, and remove the `brave-search` skill.
- CLI/Docs: add a web tools configure section for storing Brave API keys and update onboarding tips.
- Browser: add Chrome extension relay takeover mode (toolbar button), plus `clawdbot browser extension install/path` and remote browser control via `clawdbot browser serve` + `browser.controlToken`.

### Fixes

- Sessions: refactor session store updates to lock + mutate per-entry, add chat.inject, and harden subagent cleanup flow. (#944) — thanks @tyler6204.
- Browser: add tests for snapshot labels/efficient query params and labeled image responses.
- Google: downgrade unsigned thinking blocks before send to avoid missing signature errors.
- Doctor: avoid re-adding WhatsApp config when only legacy ack reactions are set. (#927, fixes #900) — thanks @grp06.
- Agents: scrub tuple `items` schemas for Gemini tool calls. (#926, fixes #746) — thanks @grp06.
- Agents: harden Antigravity Claude history/tool-call sanitization. (#968) — thanks @rdev.
- Agents: stabilize sub-agent announce status from runtime outcomes and normalize Result/Notes. (#835) — thanks @roshanasingh4.
- Embedded runner: suppress raw API error payloads from replies. (#924) — thanks @grp06.
- Auth: normalize Claude Code CLI profile mode to oauth and auto-migrate config. (#855) — thanks @sebslight.
- Daemon: clear persisted launchd disabled state before bootstrap (fixes `daemon install` after uninstall). (#849) — thanks @ndraiman.
- Logging: tolerate `EIO` from console writes to avoid gateway crashes. (#925, fixes #878) — thanks @grp06.
- Sandbox: restore `docker.binds` config validation for custom bind mounts. (#873) — thanks @akonyer.
- Sandbox: preserve configured PATH for `docker exec` so custom tools remain available. (#873) — thanks @akonyer.
- Slack: respect `channels.slack.requireMention` default when resolving channel mention gating. (#850) — thanks @evalexpr.
- Telegram: aggregate split inbound messages into one prompt (reduces “one reply per fragment”).
- Auto-reply: treat trailing `NO_REPLY` tokens as silent replies.
- Config: prevent partial config writes from clobbering unrelated settings (base hash guard + merge patch for connection saves).

## 2026.1.14

### Changes

- Usage: add MiniMax coding plan usage tracking.
- Auth: label Claude Code CLI auth options. (#915) — thanks @SeanZoR.
- Docs: standardize Claude Code CLI naming across docs and prompts. (follow-up to #915)
- Telegram: add message delete action in the message tool. (#903) — thanks @sleontenko.
- Config: add `channels.<provider>.configWrites` gating for channel-initiated config writes; migrate Slack channel IDs.

### Fixes

- Mac: pass auth token/password to dashboard URL for authenticated access. (#918) — thanks @rahthakor.
- UI: use application-defined WebSocket close code (browser compatibility). (#918) — thanks @rahthakor.
- TUI: render picker overlays via the overlay stack so /models and /settings display. (#921) — thanks @grizzdank.
- TUI: add a bright spinner + elapsed time in the status line for send/stream/run states.
- TUI: show LLM error messages (rate limits, auth, etc.) instead of `(no output)`.
- Gateway/Dev: ensure `pnpm gateway:dev` always uses the dev profile config + state (`~/.clawdbot-dev`).

#### Agents / Auth / Tools / Sandbox

- Agents: make user time zone and 24-hour time explicit in the system prompt. (#859) — thanks @CashWilliams.
- Agents: strip downgraded tool call text without eating adjacent replies and filter thinking-tag leaks. (#905) — thanks @erikpr1994.
- Agents: cap tool call IDs for OpenAI/OpenRouter to avoid request rejections. (#875) — thanks @j1philli.
- Agents: scrub tuple `items` schemas for Gemini tool calls. (#926, fixes #746) — thanks @grp06.
- Agents: stabilize sub-agent announce status from runtime outcomes and normalize Result/Notes. (#835) — thanks @roshanasingh4.
- Auth: normalize Claude Code CLI profile mode to oauth and auto-migrate config. (#855) — thanks @sebslight.
- Embedded runner: suppress raw API error payloads from replies. (#924) — thanks @grp06.
- Logging: tolerate `EIO` from console writes to avoid gateway crashes. (#925, fixes #878) — thanks @grp06.
- Sandbox: restore `docker.binds` config validation and preserve configured PATH for `docker exec`. (#873) — thanks @akonyer.
- Google: downgrade unsigned thinking blocks before send to avoid missing signature errors.

#### macOS / Apps

- macOS: ensure launchd log directory exists with a test-only override. (#909) — thanks @roshanasingh4.
- macOS: format ConnectionsStore config to satisfy SwiftFormat lint. (#852) — thanks @mneves75.
- macOS: pass auth token/password to dashboard URL for authenticated access. (#918) — thanks @rahthakor.
- macOS: reuse launchd gateway auth and skip wizard when gateway config already exists. (#917)
- macOS: prefer the default bridge tunnel port in remote mode for node bridge connectivity; document macOS remote control + bridge tunnels. (#960, fixes #865) — thanks @kkarimi.
- Apps: use canonical main session keys from gateway defaults across macOS/iOS/Android to avoid creating bare `main` sessions.
- macOS: fix cron preview/testing payload to use `channel` key. (#867) — thanks @wes-davis.
- Telegram: honor `channels.telegram.timeoutSeconds` for grammY API requests. (#863) — thanks @Snaver.
- Telegram: split long captions into media + follow-up text messages. (#907) - thanks @jalehman.
- Telegram: migrate group config when supergroups change chat IDs. (#906) — thanks @sleontenko.
- Messaging: unify markdown formatting + format-first chunking for Slack/Telegram/Signal. (#920) — thanks @TheSethRose.
- Slack: drop Socket Mode events with mismatched `api_app_id`/`team_id`. (#889) — thanks @roshanasingh4.
- Discord: isolate autoThread thread context. (#856) — thanks @davidguttman.
- WhatsApp: fix context isolation using wrong ID (was bot's number, now conversation ID). (#911) — thanks @tristanmanchester.
- WhatsApp: normalize user JIDs with device suffix for allowlist checks in groups. (#838) — thanks @peschee.

## 2026.1.13

### Fixes

- Postinstall: treat already-applied pnpm patches as no-ops to avoid npm/bun install failures.
- Packaging: pin `@mariozechner/pi-ai` to 0.45.7 and refresh patched dependency to match npm resolution.

## 2026.1.12-2

### Fixes

- Packaging: include `dist/memory/**` in the npm tarball (fixes `ERR_MODULE_NOT_FOUND` for `dist/memory/index.js`).
- Agents: persist sub-agent registry across gateway restarts and resume announce flow safely. (#831) — thanks @roshanasingh4.
- Agents: strip invalid Gemini thought signatures from OpenRouter history to avoid 400s. (#841, #845) — thanks @MatthieuBizien.

## 2026.1.12-1

### Fixes

- Packaging: include `dist/channels/**` in the npm tarball (fixes `ERR_MODULE_NOT_FOUND` for `dist/channels/registry.js`).

## 2026.1.12

### Highlights

- **BREAKING:** rename chat “providers” (Slack/Telegram/WhatsApp/…) to **channels** across CLI/RPC/config; legacy config keys auto-migrate on load (and are written back as `channels.*`).
- Memory: add vector search for agent memories (Markdown-only) with SQLite index, chunking, lazy sync + file watch, and per-agent enablement/fallback.
- Plugins: restore full voice-call plugin parity (Telnyx/Twilio, streaming, inbound policies, tools/CLI).
- Models: add Synthetic provider plus Moonshot Kimi K2 0905 + turbo/thinking variants (with docs). (#811) — thanks @siraht; (#818) — thanks @mickahouan.
- Cron: one-shot schedules accept ISO timestamps (UTC) with optional delete-after-run; cron jobs can target a specific agent (CLI + macOS/Control UI).
- Agents: add compaction mode config with optional safeguard summarization and per-agent model fallbacks. (#700) — thanks @thewilloftheshadow; (#583) — thanks @mitschabaude-bot.

### New & Improved

- Memory: add custom OpenAI-compatible embedding endpoints; support OpenAI/local `node-llama-cpp` embeddings with per-agent overrides and provider metadata in tools/CLI. (#819) — thanks @mukhtharcm.
- Memory: new `clawdbot memory` CLI plus `memory_search`/`memory_get` tools with snippets + line ranges; index stored under `~/.clawdbot/memory/{agentId}.sqlite` with watch-on-by-default.
- Agents: strengthen memory recall guidance; make workspace bootstrap truncation configurable (default 20k) with warnings; add default sub-agent model config.
- Tools/Sandbox: add tool profiles + group shorthands; support tool-policy groups in `tools.sandbox.tools`; drop legacy `memory` shorthand; allow Docker bind mounts via `docker.binds`. (#790) — thanks @akonyer.
- Tools: add provider/model-specific tool policy overrides (`tools.byProvider`) to trim tool exposure per provider.
- Tools: add browser `scrollintoview` action; allow Claude/Gemini tool param aliases; allow thinking `xhigh` for GPT-5.2/Codex with safe downgrades. (#793) — thanks @hsrvc; (#444) — thanks @grp06.
- Gateway/CLI: add Tailscale binary discovery, custom bind mode, and probe auth retry; add `clawdbot dashboard` auto-open flow; default native slash commands to `"auto"` with per-provider overrides. (#740) — thanks @jeffersonwarrior.
- Auth/Onboarding: add Chutes OAuth (PKCE + refresh + onboarding choice); normalize API key inputs; default TUI onboarding to `deliver: false`. (#726) — thanks @FrieSei; (#791) — thanks @roshanasingh4.
- Providers: add `discord.allowBots`; trim legacy MiniMax M2 from default catalogs; route MiniMax vision to the Coding Plan VLM endpoint (also accepts `@/path/to/file.png` inputs). (#802) — thanks @zknicker.
- Gateway: allow Tailscale Serve identity headers to satisfy token auth; rebuild Control UI assets when protocol schema is newer. (#823) — thanks @roshanasingh4; (#786) — thanks @meaningfool.
- Heartbeat: default `ackMaxChars` to 300 so short `HEARTBEAT_OK` replies stay internal.

### Installer

- Install: run `clawdbot doctor --non-interactive` after git installs/updates and nudge daemon restarts when detected.

### Fixes

- Doctor: warn on pnpm workspace mismatches, missing Control UI assets, and missing tsx binaries; offer UI rebuilds.
- Tools: apply global tool allow/deny even when agent-specific tool policy is set.
- Models/Providers: treat credential validation failures as auth errors to trigger fallback; normalize `${ENV_VAR}` apiKey values and auto-fill missing provider keys; preserve explicit GitHub Copilot provider config + agent-dir auth profiles. (#822) — thanks @sebslight; (#705) — thanks @TAGOOZ.
- Auth: drop invalid auth profiles from ordering so environment keys can still be used for providers like MiniMax.
- Gemini: normalize Gemini 3 ids to preview variants; strip Gemini CLI tool call/response ids; downgrade missing `thought_signature`; strip Claude `msg_*` thought_signature fields to avoid base64 decode errors. (#795) — thanks @thewilloftheshadow; (#783) — thanks @ananth-vardhan-cn; (#793) — thanks @hsrvc; (#805) — thanks @marcmarg.
- Agents: auto-recover from compaction context overflow by resetting the session and retrying; propagate overflow details from embedded runs so callers can recover.
- MiniMax: strip malformed tool invocation XML; include `MiniMax-VL-01` in implicit provider for image pairing. (#809) — thanks @latitudeki5223.
- Onboarding/Auth: honor `CLAWDBOT_AGENT_DIR` / `PI_CODING_AGENT_DIR` when writing auth profiles (MiniMax). (#829) — thanks @roshanasingh4.
- Anthropic: handle `overloaded_error` with a friendly message and failover classification. (#832) — thanks @danielz1z.
- Anthropic: merge consecutive user turns (preserve newest metadata) before validation to avoid incorrect role errors. (#804) — thanks @ThomsenDrake.
- Messaging: enforce context isolation for message tool sends; keep typing indicators alive during tool execution. (#793) — thanks @hsrvc; (#450, #447) — thanks @thewilloftheshadow.
- Auto-reply: `/status` allowlist behavior, reasoning-tag enforcement on fallback, and system-event enqueueing for elevated/reasoning toggles. (#810) — thanks @mcinteerj.
- System events: include local timestamps when events are injected into prompts. (#245) — thanks @thewilloftheshadow.
- Auto-reply: resolve ambiguous `/model` matches; fix streaming block reply media handling; keep >300 char heartbeat replies instead of dropping.
- Discord/Slack: centralize reply-thread planning; fix autoThread routing + add per-channel autoThread; avoid duplicate listeners; keep reasoning italics intact; allow clearing channel parents via message tool. (#800, #807) — thanks @davidguttman; (#744) — thanks @thewilloftheshadow.
- Telegram: preserve forum topic thread ids, persist polling offsets, respect account bindings in webhook mode, and show typing indicator in General topics. (#727, #739) — thanks @thewilloftheshadow; (#821) — thanks @gumadeiras; (#779) — thanks @azade-c.
- Slack: accept slash commands with or without leading `/` for custom command configs. (#798) — thanks @thewilloftheshadow.
- Cron: persist disabled jobs correctly; accept `jobId` aliases for update/run/remove params. (#205, #252) — thanks @thewilloftheshadow.
- Gateway/CLI: honor `CLAWDBOT_LAUNCHD_LABEL` / `CLAWDBOT_SYSTEMD_UNIT` overrides; `agents.list` respects explicit config; reduce noisy loopback WS logs during tests; run `clawdbot doctor --non-interactive` during updates. (#781) — thanks @ronyrus.
- Onboarding/Control UI: refuse invalid configs (run doctor first); quote Windows browser URLs for OAuth; keep chat scroll position unless the user is near the bottom. (#764) — thanks @mukhtharcm; (#794) — thanks @roshanasingh4; (#217) — thanks @thewilloftheshadow.
- Tools/UI: harden tool input schemas for strict providers; drop null-only union variants for Gemini schema cleanup; treat `maxChars: 0` as unlimited; keep TUI last streamed response instead of "(no output)". (#782) — thanks @AbhisekBasu1; (#796) — thanks @gabriel-trigo; (#747) — thanks @thewilloftheshadow.
- Connections UI: polish multi-account account cards. (#816) — thanks @steipete.

### Maintenance

- Dependencies: bump Pi packages to 0.45.3 and refresh patched pi-ai.
- Testing: update Vitest + browser-playwright to 4.0.17.
- Docs: add Amazon Bedrock provider notes and link from models/FAQ.

## 2026.1.11

### Highlights

- Plugins are now first-class: loader + CLI management, plus the new Voice Call plugin.
- Config: modular `$include` support for split config files. (#731) — thanks @pasogott.
- Agents/Pi: reserve compaction headroom so pre-compaction memory writes can run before auto-compaction.
- Agents: automatic pre-compaction memory flush turn to store durable memories before compaction.

### Changes

- CLI/Onboarding: simplify MiniMax auth choice to a single M2.1 option.
- CLI: configure section selection now loops until Continue.
- Docs: explain MiniMax vs MiniMax Lightning (speed vs cost) and restore LM Studio example.
- Docs: add Cerebras GLM 4.6/4.7 config example (OpenAI-compatible endpoint).
- Onboarding/CLI: group model/auth choice by provider and label Z.AI as GLM 4.7.
- Onboarding/Docs: add Moonshot AI (Kimi K2) auth choice + config example.
- CLI/Onboarding: prompt to reuse detected API keys for Moonshot/MiniMax/Z.AI/Gemini/Anthropic/OpenCode.
- Auto-reply: add compact `/model` picker (models + available providers) and show provider endpoints in `/model status`.
- Control UI: add Config tab model presets (MiniMax M2.1, GLM 4.7, Kimi) for one-click setup.
- Plugins: add extension loader (tools/RPC/CLI/services), discovery paths, and config schema + Control UI labels (uiHints).
- Plugins: add `clawdbot plugins install` (path/tgz/npm), plus `list|info|enable|disable|doctor` UX.
- Plugins: voice-call plugin now real (Twilio/log), adds start/status RPC/CLI/tool + tests.
- Docs: add plugins doc + cross-links from tools/skills/gateway config.
- Docs: add beginner-friendly plugin quick start + expand Voice Call plugin docs.
- Tests: add Docker plugin loader + tgz-install smoke test.
- Tests: extend Docker plugin E2E to cover installing from local folders (`plugins.load.paths`) and `file:` npm specs.
- Tests: add coverage for pre-compaction memory flush settings.
- Tests: modernize live model smoke selection for current releases and enforce tools/images/thinking-high coverage. (#769) — thanks @steipete.
- Agents/Tools: add `apply_patch` tool for multi-file edits (experimental; gated by tools.exec.applyPatch; OpenAI-only).
- Agents/Tools: rename the bash tool to exec (config alias maintained). (#748) — thanks @myfunc.
- Agents: add pre-compaction memory flush config (`agents.defaults.compaction.*`) with a soft threshold + system prompt.
- Config: add `$include` directive for modular config files. (#731) — thanks @pasogott.
- Build: set pnpm minimum release age to 2880 minutes (2 days). (#718) — thanks @dan-dr.
- macOS: prompt to install the global `clawdbot` CLI when missing in local mode; install via `clawd.bot/install-cli.sh` (no onboarding) and use external launchd/CLI instead of the embedded gateway runtime.
- Docs: add gog calendar event color IDs from `gog calendar colors`. (#715) — thanks @mjrussell.
- Cron/CLI: add `--model` flag to cron add/edit commands. (#711) — thanks @mjrussell.
- Cron/CLI: trim model overrides on cron edits and document main-session guidance. (#711) — thanks @mjrussell.
- Skills: bundle `skill-creator` to guide creating and packaging skills.
- Providers: add per-DM history limit overrides (`dmHistoryLimit`) with provider-level config. (#728) — thanks @pkrmf.
- Discord: expose channel/category management actions in the message tool. (#730) — thanks @NicholasSpisak.
- Docs: rename README “macOS app” section to “Apps”. (#733) — thanks @AbhisekBasu1.
- Gateway: require `client.id` in WebSocket connect params; use `client.instanceId` for presence de-dupe; update docs/tests.
- macOS: remove the attach-only gateway setting; local mode now always manages launchd while still attaching to an existing gateway if present.

### Installer

- Postinstall: replace `git apply` with builtin JS patcher (works npm/pnpm/bun; no git dependency) plus regression tests.
- Postinstall: skip pnpm patch fallback when the new patcher is active.
- Installer tests: add root+non-root docker smokes, CI workflow to fetch clawd.bot scripts and run install sh/cli with onboarding skipped.
- Installer UX: support `CLAWDBOT_NO_ONBOARD=1` for non-interactive installs; fix npm prefix on Linux and auto-install git.
- Installer UX: add `install.sh --help` with flags/env and git install hint.
- Installer UX: add `--install-method git|npm` and auto-detect source checkouts (prompt to update git checkout vs migrate to npm).

### Fixes

- Models/Onboarding: configure MiniMax (minimax.io) via Anthropic-compatible `/anthropic` endpoint by default (keep `minimax-api` as a legacy alias).
- Models: normalize Gemini 3 Pro/Flash IDs to preview names for live model lookups. (#769) — thanks @steipete.
- CLI: fix guardCancel typing for configure prompts. (#769) — thanks @steipete.
- Gateway/WebChat: include handshake validation details in the WebSocket close reason for easier debugging; preserve close codes.
- Gateway/Auth: send invalid connect responses before closing the handshake; stabilize invalid-connect auth test.
- Gateway: tighten gateway listener detection.
- Control UI: hide onboarding chat when configured and guard the mobile chat sidebar overlay.
- Auth: read Codex keychain credentials and make the lookup platform-aware.
- macOS/Release: avoid bundling dist artifacts in relay builds and generate appcasts from zip-only sources.
- Doctor: surface plugin diagnostics in the report.
- Plugins: treat `plugins.load.paths` directory entries as package roots when they contain `package.json` + `clawdbot.extensions`; load plugin packages from config dirs; extract archives without system tar.
- Config: expand `~` in `CLAWDBOT_CONFIG_PATH` and common path-like config fields (including `plugins.load.paths`); guard invalid `$include` paths. (#731) — thanks @pasogott.
- Agents: stop pre-creating session transcripts so first user messages persist in JSONL history.
- Agents: skip pre-compaction memory flush when the session workspace is read-only.
- Auto-reply: ignore inline `/status` directives unless the message is directive-only.
- Auto-reply: align `/think` default display with model reasoning defaults. (#751) — thanks @gabriel-trigo.
- Auto-reply: flush block reply buffers on tool boundaries. (#750) — thanks @sebslight.
- Auto-reply: allow sender fallback for command authorization when `SenderId` is empty (WhatsApp self-chat). (#755) — thanks @juanpablodlc.
- Auto-reply: treat whitespace-only sender ids as missing for command authorization (WhatsApp self-chat). (#766) — thanks @steipete.
- Heartbeat: refresh prompt text for updated defaults.
- Agents/Tools: use PowerShell on Windows to capture system utility output. (#748) — thanks @myfunc.
- Docker: tolerate unset optional env vars in docker-setup.sh under strict mode. (#725) — thanks @petradonka.
- CLI/Update: preserve base environment when passing overrides to update subprocesses. (#713) — thanks @danielz1z.
- Agents: treat message tool errors as failures so fallback replies still send; require `to` + `message` for `action=send`. (#717) — thanks @theglove44.
- Agents: preserve reasoning items on tool-only turns.
- Agents/Subagents: wait for completion before announcing, align wait timeout with run timeout, and make announce prompts more emphatic.
- Agents: route subagent transcripts to the target agent sessions directory and add regression coverage. (#708) — thanks @xMikeMickelson.
- Agents/Tools: preserve action enums when flattening tool schemas. (#708) — thanks @xMikeMickelson.
- Gateway/Agents: canonicalize main session aliases for store writes and add regression coverage. (#709) — thanks @xMikeMickelson.
- Agents: reset sessions and retry when auto-compaction overflows instead of crashing the gateway.
- Providers/Telegram: normalize command mentions for consistent parsing. (#729) — thanks @obviyus.
- Providers: skip DM history limit handling for non-DM sessions. (#728) — thanks @pkrmf.
- Sandbox: fix non-main mode incorrectly sandboxing the main DM session and align `/status` runtime reporting with effective sandbox state.
- Sandbox/Gateway: treat `agent:<id>:main` as a main-session alias when `session.mainKey` is customized (backwards compatible).
- Auto-reply: fast-path allowlisted slash commands (inline `/help`/`/commands`/`/status`/`/whoami` stripped before model).

## 2026.1.10

### Highlights

- CLI: `clawdbot status` now table-based + shows OS/update/gateway/daemon/agents/sessions; `status --all` adds a full read-only debug report (tables, log tails, Tailscale summary, and scan progress via OSC-9 + spinner).
- CLI Backends: add Codex CLI fallback with resume support (text output) and JSONL parsing for new runs, plus a live CLI resume probe.
- CLI: add `clawdbot update` (safe-ish git checkout update) + `--update` shorthand. (#673) — thanks @fm1randa.
- Gateway: add OpenAI-compatible `/v1/chat/completions` HTTP endpoint (auth, SSE streaming, per-agent routing). (#680).

### Changes

- Onboarding/Models: add first-class Z.AI (GLM) auth choice (`zai-api-key`) + `--zai-api-key` flag.
- CLI/Onboarding: add OpenRouter API key auth option in configure/onboard. (#703) — thanks @mteam88.
- Agents: add human-delay pacing between block replies (modes: off/natural/custom, per-agent configurable). (#446) — thanks @tony-freedomology.
- Agents/Browser: add `browser.target` (sandbox/host/custom) with sandbox host-control gating via `agents.defaults.sandbox.browser.allowHostControl`, allowlists for custom control URLs/hosts/ports, and expand browser tool docs (remote control, profiles, internals).
- Onboarding/Models: add catalog-backed default model picker to onboarding + configure. (#611) — thanks @jonasjancarik.
- Agents/OpenCode Zen: update fallback models + defaults, keep legacy alias mappings. (#669) — thanks @magimetal.
- CLI: add `clawdbot reset` and `clawdbot uninstall` flows (interactive + non-interactive) plus docker cleanup smoke test.
- Providers: move provider wiring to a plugin architecture. (#661).
- Providers: unify group history context wrappers across providers with per-provider/per-account `historyLimit` overrides (fallback to `messages.groupChat.historyLimit`). Set `0` to disable. (#672).
- Gateway/Heartbeat: optionally deliver heartbeat `Reasoning:` output (`agents.defaults.heartbeat.includeReasoning`). (#690)
- Docker: allow optional home volume + extra bind mounts in `docker-setup.sh`. (#679) — thanks @gabriel-trigo.

### Fixes

- Auto-reply: suppress draft/typing streaming for `NO_REPLY` (silent system ops) so it doesn’t leak partial output.
- CLI/Status: expand tables to full terminal width; clarify provider setup vs runtime warnings; richer per-provider detail; token previews in `status` while keeping `status --all` redacted; add troubleshooting link footer; keep log tails pasteable; show gateway auth used when reachable; surface provider runtime errors (Signal/iMessage/Slack); harden `tailscale status --json` parsing; make `status --all` scan progress determinate; and replace the footer with a 3-line “Next steps” recommendation (share/debug/probe).
- CLI/Gateway: clarify that `clawdbot gateway status` reports RPC health (connect + RPC) and shows RPC failures separately from connect failures.
- CLI/Update: gate progress spinner on stdout TTY and align clean-check step label. (#701) — thanks @bjesuiter.
- Telegram: add `/whoami` + `/id` commands to reveal sender id for allowlists; allow `@username` and prefixed ids in `allowFrom` prompts (with stability warning).
- Heartbeat: strip markup-wrapped `HEARTBEAT_OK` so acks don’t leak to external providers (e.g., Telegram).
- Control UI: stop auto-writing `telegram.groups["*"]` and warn/confirm before enabling wildcard groups.
- WhatsApp: send ack reactions only for handled messages and ignore legacy `messages.ackReaction` (doctor copies to `whatsapp.ackReaction`). (#629) — thanks @pasogott.
- Sandbox/Skills: mirror skills into sandbox workspaces for read-only mounts so SKILL.md stays accessible.
- Terminal/Table: ANSI-safe wrapping to prevent table clipping/color loss; add regression coverage.
- Docker: allow optional apt packages during image build and document the build arg. (#697) — thanks @gabriel-trigo.
- Gateway/Heartbeat: deliver reasoning even when the main heartbeat reply is `HEARTBEAT_OK`. (#694) — thanks @antons.
- Agents/Pi: inject config `temperature`/`maxTokens` into streaming without replacing the session streamFn; cover with live maxTokens probe. (#732) — thanks @peschee.
- macOS: clear unsigned launchd overrides on signed restarts and warn via doctor when attach-only/disable markers are set. (#695) — thanks @jeffersonwarrior.
- Agents: enforce single-writer session locks and drop orphan tool results to prevent tool-call ID failures (MiniMax/Anthropic-compatible APIs).
- Docs: make `clawdbot status` the first diagnostic step, clarify `status --deep` behavior, and document `/whoami` + `/id`.
- Docs/Testing: clarify live tool+image probes and how to list your testable `provider/model` ids.
- Tests/Live: make gateway bash+read probes resilient to provider formatting while still validating real tool calls.
- WhatsApp: detect @lid mentions in groups using authDir reverse mapping + resolve self JID E.164 for mention gating. (#692) — thanks @peschee.
- Gateway/Auth: default to token auth on loopback during onboarding, add doctor token generation flow, and tighten audio transcription config to Whisper-only.
- Providers: dedupe inbound messages across providers to avoid duplicate LLM runs on redeliveries/reconnects. (#689) — thanks @adam91holt.
- Agents: strip `<thought>`/`<antthinking>` tags from hidden reasoning output and cover tag variants in tests. (#688) — thanks @theglove44.
- macOS: save model picker selections as normalized provider/model IDs and keep manual entries aligned. (#683) — thanks @benithors.
- Agents: recognize "usage limit" errors as rate limits for failover. (#687) — thanks @evalexpr.
- CLI: avoid success message when daemon restart is skipped. (#685) — thanks @carlulsoe.
- Commands: disable `/config` + `/debug` by default; gate via `commands.config`/`commands.debug` and hide from native registration/help output.
- Agents/System: clarify that sub-agents remain sandboxed and cannot use elevated host access.
- Gateway: disable the OpenAI-compatible `/v1/chat/completions` endpoint by default; enable via `gateway.http.endpoints.chatCompletions.enabled=true`.
- macOS: stabilize bridge tunnels, guard invoke senders on disconnect, and drain stdout/stderr to avoid deadlocks. (#676) — thanks @ngutman.
- Agents/System: clarify sandboxed runtime in system prompt and surface elevated availability when sandboxed.
- Auto-reply: prefer `RawBody` for command/directive parsing (WhatsApp + Discord) and prevent fallback runs from clobbering concurrent session updates. (#643) — thanks @mcinteerj.
- WhatsApp: fix group reactions by preserving message IDs and sender JIDs in history; normalize participant phone numbers to JIDs in outbound reactions. (#640) — thanks @mcinteerj.
- WhatsApp: expose group participant IDs to the model so reactions can target the right sender.
- Cron: `wakeMode: "now"` waits for heartbeat completion (and retries when the main lane is busy). (#666) — thanks @roshanasingh4.
- Agents/OpenAI: fix Responses tool-only → follow-up turn handling (avoid standalone `reasoning` items that trigger 400 “required following item”) and replay reasoning items in Responses/Codex Responses history for tool-call-only turns.
- Sandbox: add `clawdbot sandbox explain` (effective policy inspector + fix-it keys); improve “sandbox jail” tool-policy/elevated errors with actionable config key paths; link to docs.
- Hooks/Gmail: keep Tailscale serve path at `/` while preserving the public path. (#668) — thanks @antons.
- Hooks/Gmail: allow Tailscale target URLs to preserve internal serve paths.
- Auth: update Claude Code keychain credentials in-place during refresh sync; share JSON file helpers; add CLI fallback coverage.
- Auth: throttle external CLI credential syncs (Claude/Codex), reduce Keychain reads, and skip sync when cached credentials are still fresh.
- CLI: respect `CLAWDBOT_STATE_DIR` for node pairing + voice wake settings storage. (#664) — thanks @azade-c.
- Onboarding/Gateway: persist non-interactive gateway token auth in config; add WS wizard + gateway tool-calling regression coverage.
- Gateway/Control UI: make `chat.send` non-blocking, wire Stop to `chat.abort`, and treat `/stop` as an out-of-band abort. (#653)
- Gateway/Control UI: allow `chat.abort` without `runId` (abort active runs), suppress post-abort chat streaming, and prune stuck chat runs. (#653)
- Gateway/Control UI: sniff image attachments for chat.send, drop non-images, and log mismatches. (#670) — thanks @cristip73.
- macOS: force `restart-mac.sh --sign` to require identities and keep bundled Node signed for relay verification. (#580) — thanks @jeffersonwarrior.
- Gateway/Agent: accept image attachments on `agent` (multimodal message) and add live gateway image probe (`CLAWDBOT_LIVE_GATEWAY_IMAGE_PROBE=1`).
- CLI: `clawdbot sessions` now includes `elev:*` + `usage:*` flags in the table output.
- CLI/Pairing: accept positional provider for `pairing list|approve` (npm-run compatible); update docs/bot hints.
- Branding: normalize user-facing “ClawdBot”/“CLAWDBOT” → “Clawdbot” (CLI, status, docs).
- Auto-reply: fix native `/model` not updating the actual chat session (Telegram/Slack/Discord). (#646)
- Doctor: offer to run `clawdbot update` first on git installs (keeps doctor output aligned with latest).
- Doctor: avoid false legacy workspace warning when install dir is `~/clawdbot`. (#660)
- iMessage: fix reasoning persistence across DMs; avoid partial/duplicate replies when reasoning is enabled. (#655) — thanks @antons.
- Models/Auth: allow MiniMax API configs without `models.providers.minimax.apiKey` (auth profiles / `MINIMAX_API_KEY`). (#656) — thanks @mneves75.
- Agents: avoid duplicate replies when the message tool sends. (#659) — thanks @mickahouan.
- Agents: harden Cloud Code Assist tool ID sanitization (toolUse/toolCall/toolResult) and scrub extra JSON Schema constraints. (#665) — thanks @sebslight.
- Agents: sanitize tool results + Cloud Code Assist tool IDs at context-build time (prevents mid-run strict-provider request rejects).
- Agents/Tools: resolve workspace-relative Read/Write/Edit paths; align bash default cwd. (#642) — thanks @mukhtharcm.
- Discord: include forwarded message snapshots in agent session context. (#667) — thanks @rubyrunsstuff.
- Telegram: add `telegram.draftChunk` to tune draft streaming chunking for `streamMode: "block"`. (#667) — thanks @rubyrunsstuff.
- Tests/Agents: add regression coverage for workspace tool path resolution and bash cwd defaults.
- iOS/Android: enable stricter concurrency/lint checks; fix Swift 6 strict concurrency issues + Android lint errors (ExifInterface, obsolete SDK check). (#662) — thanks @KristijanJovanovski.
- Auth: read Codex CLI keychain tokens on macOS before falling back to `~/.codex/auth.json`, preventing stale refresh tokens from breaking gateway live tests.
- iOS/macOS: share `AsyncTimeout`, require explicit `bridgeStableID` on connect, and harden tool display defaults (avoids missing-resource label fallbacks).
- Telegram: serialize media-group processing to avoid missed albums under load.
- Signal: handle `dataMessage.reaction` events (signal-cli SSE) to avoid broken attachment errors. (#637) — thanks @neist.
- Docs: showcase entries for ParentPay, R2 Upload, iOS TestFlight, and Oura Health. (#650) — thanks @henrino3.
- Agents: repair session transcripts by dropping duplicate tool results across the whole history (unblocks Anthropic-compatible APIs after retries).
- Tests/Live: reset the gateway session between model runs to avoid cross-provider transcript incompatibilities (notably OpenAI Responses reasoning replay rules).

## 2026.1.9

### Highlights

- Microsoft Teams provider: polling, attachments, outbound CLI send, per-channel policy.
- Models/Auth expansion: OpenCode Zen + MiniMax API onboarding; token auth profiles + auth order; OAuth health in doctor/status.
- CLI/Gateway UX: message subcommands, gateway discover/status/SSH, /config + /debug, sandbox CLI.
- Provider reliability sweep: WhatsApp contact cards/targets, Telegram audio-as-voice + streaming, Signal reactions, Slack threading, Discord stability.
- Auto-reply + status: block-streaming controls, reasoning handling, usage/cost reporting.
- Control UI/TUI: queued messages, session links, reasoning view, mobile polish, logs UX.

### Breaking

- CLI: `clawdbot message` now subcommands (`message send|poll|...`) and requires `--provider` unless only one provider configured.
- Commands/Tools: `/restart` and gateway restart tool disabled by default; enable with `commands.restart=true`.

### New Features and Changes

- Models/Auth: OpenCode Zen onboarding (#623) — thanks @magimetal; MiniMax Anthropic-compatible API + hosted onboarding (#590, #495) — thanks @mneves75, @tobiasbischoff.
- Models/Auth: setup-token + token auth profiles; `clawdbot models auth order {get,set,clear}`; per-agent auth candidates in `/model status`; OAuth expiry checks in doctor/status.
- Agent/System: claude-cli runner; `session_status` tool (and sandbox allow); adaptive context pruning default; system prompt messaging guidance + no auto self-update; eligible skills list injection; sub-agent context trimmed.
- Commands: `/commands` list; `/models` alias; `/usage` alias; `/debug` runtime overrides + effective config view; `/config` chat updates + `/config get`; `config --section`.
- CLI/Gateway: unified message tool + message subcommands; gateway discover (local + wide-area DNS-SD) with JSON/timeout; gateway status human-readable + JSON + SSH loopback; wide-area records include gatewayPort/sshPort/cliPath + tailnet DNS fallback.
- CLI UX: logs output modes (pretty/plain/JSONL) + colorized health/daemon output; global `--no-color`; lobster palette in onboarding/config.
- Dev ergonomics: gateway `--dev/--reset` + dev profile auto-config; C-3PO dev templates; dev gateway/TUI helper scripts.
- Sandbox/Workspace: sandbox list/recreate commands; sync skills into sandbox workspace; sandbox browser auto-start.
- Config/Onboarding: inline env vars; OpenAI API key flow to shared `~/.clawdbot/.env`; Opus 4.5 default prompt for Anthropic auth; QuickStart auto-install gateway (Node-only) + provider picker tweaks + skip-systemd flags; TUI bootstrap prompt (`tui --message`); remove Bun runtime choice.
- Providers: Microsoft Teams provider (polling, attachments, outbound sends, requireMention, config reload/DM policy). (#404) — thanks @onutc
- Providers: WhatsApp broadcast groups for multi-agent replies (#547) — thanks @pasogott; inbound media size cap configurable (#505) — thanks @koala73; identity-based message prefixes (#578) — thanks @p6l-richard.
- Providers: Telegram inline keyboard buttons + callback payload routing (#491) — thanks @azade-c; cron topic delivery targets (#474/#478) — thanks @mitschabaude-bot, @nachoiacovino; `[[audio_as_voice]]` tag support (#490) — thanks @jarvis-medmatic.
- Providers: Signal reactions + notifications with allowlist support.
- Status/Usage: /status cost reporting + `/cost` lines; auth profile snippet; provider usage windows.
- Control UI: mobile responsiveness (#558) — thanks @carlulsoe; queued messages + Enter-to-send (#527) — thanks @YuriNachos; session links (#471) — thanks @HazAT; reasoning view; skill install feedback (#445) — thanks @pkrmf; chat layout refresh (#475) — thanks @rahthakor; docs link + new session button; drop explicit `ui:install`.
- TUI: agent picker + agents list RPC; improved status line.
- Doctor/Daemon: audit/repair flows, permissions checks, supervisor config audits; provider status probes + warnings for Discord intents and Telegram privacy; last activity timestamps; gateway restart guidance.
- Docs: Hetzner Docker VPS guide + cross-links (#556/#592) — thanks @Iamadig; Ansible guide (#545) — thanks @pasogott; provider troubleshooting index; hook parameter expansion (#532) — thanks @mcinteerj; model allowlist notes; OAuth deep dive; showcase refresh.
- Apps/Branding: refreshed iOS/Android/macOS icons (#521) — thanks @fishfisher.

### Fixes

- Packaging: include MS Teams send module in npm tarball.
- Sandbox/Browser: auto-start CDP endpoint; proxy CDP out of container for attachOnly; relax Bun fetch typing; align sandbox list output with config images.
- Agents/Runtime: gate heartbeat prompt to default sessions; /stop aborts between tool calls; require explicit system-event session keys; guard small context windows; fix model fallback stringification; sessions_spawn inherits provider; failover on billing/credits; respect auth cooldown ordering; restore Anthropic OAuth tool dispatch + tool-name bypass; avoid OpenAI invalid reasoning replay; harden Gmail hook model defaults.
- Agent history/schema: strip/skip empty assistant/error blocks to prevent session corruption/Claude 400s; scrub unsupported JSON Schema keywords + sanitize tool call IDs for Cloud Code Assist; simplify Gemini-compatible tool/session schemas; require raw for config.apply.
- Auto-reply/Streaming: default audioAsVoice false; preserve audio_as_voice propagation + buffer audio blocks + guard voice notes; block reply ordering (timeout) + forced-block fence-safe; avoid chunk splits inside parentheses + fence-close breaks + invalid UTF-16 truncation; preserve inline directive spacing + allow whitespace in reply tags; filter NO_REPLY prefixes + normalize routed replies; suppress <think> leakage with separate Reasoning; block streaming defaults (off by default, minChars/idle tuning) + coalesced blocks; dedupe followup queue; restore explicit responsePrefix default.
- Status/Commands: provider prefix in /status model display; usage filtering + provider mapping; auth label + usage snapshots (claude-cli fallback + optional claude.ai); show Verbose/Elevated only when enabled; compact usage/cost line + restore emoji-rich status; /status in directive-only + multi-directive handling; mention-bypass elevated handling; surface provider usage errors; wire /usage to /status; restore hidden gateway-daemon alias; fallback /model list when catalog unavailable.
- WhatsApp: vCard/contact cards (prefer FN, include numbers, show all contacts, keep summary counts, better empty summaries); preserve group JIDs + normalize targets; resolve @lid mappings/JIDs (Baileys/auth-dir) + inbound mapping; route queued replies to sender; improve web listener errors + remove provider name from errors; record outbound activity account id; fix web media fetch errors; broadcast group history consistency.
- Telegram: keep streamMode draft-only; long-poll conflict retries + update dedupe; grammY fetch mismatch fixes + restrict native fetch to Bun; suppress getUpdates stack traces; include user id in pairing; audio_as_voice handling fixes.
- Discord/Slack: thread context helpers + forum thread starters; avoid category parent overrides; gateway reconnect logs + HELLO timeout + stop provider after reconnect exhaustion; DM recipient parsing for numeric IDs; remove incorrect limited warning; reply threading + mrkdwn edge cases; remove ack reactions after reply; gateway debug event visibility.
- Signal: reaction handling safety; own-reaction matching (uuid+phone); UUID-only senders accepted; ignore reaction-only messages.
- MS Teams: download image attachments reliably; fix top-level replies; stop on shutdown + honor chunk limits; normalize poll providers/deps; pairing label fixes.
- iMessage: isolate group-ish threads by chat_id.
- Gateway/Daemon/Doctor: atomic config writes; repair gateway service entrypoint + install switches; non-interactive legacy migrations; systemd unit alignment + KillMode=process; node bridge keepalive/pings; Launch at Login persistence; bundle ClawdbotKit resources + Swift 6.2 compat dylib; relay version check + remove smoke test; regen Swift GatewayModels + keep agent provider string; cron jobId alias + channel alias migration + main session key normalization; heartbeat Telegram accountId resolution; avoid WhatsApp fallback for internal runs; gateway listener error wording; serveBaseUrl param; honor gateway --dev; fix wide-area discovery updates; align agents.defaults schema; provider account metadata in daemon status; refresh Carbon patch for gateway fixes; restore doctor prompter initialValue handling.
- Control UI/TUI: persist per-session verbose off + hide tool cards; logs tab opens at bottom; relative asset paths + landing cleanup; session labels lookup/persistence; stop pinning main session in recents; start logs at bottom; TUI status bar refresh + timeout handling + hide reasoning label when off.
- Onboarding/Configure: QuickStart single-select provider picker; avoid Codex CLI false-expiry warnings; clarify WhatsApp owner prompt; fix Minimax hosted onboarding (agents.defaults + msteams heartbeat target); remove configure Control UI prompt; honor gateway --dev flag.

### Maintenance

- Dependencies: bump pi-\* stack to 0.42.2.
- Dependencies: Pi 0.40.0 bump (#543) — thanks @mcinteerj.
- Build: Docker build cache layer (#605) — thanks @zknicker.

- Auth: enable OAuth token refresh for Claude Code CLI credentials (`anthropic:claude-cli`) with bidirectional sync back to Claude Code storage (file on Linux/Windows, Keychain on macOS). This allows long-running agents to operate autonomously without manual re-authentication (#654 — thanks @radek-paclt).

## 2026.1.8

### Highlights

- Security: DMs locked down by default across providers; pairing-first + allowlist guidance.
- Sandbox: per-agent scope defaults + workspace access controls; tool/session isolation tuned.
- Agent loop: compaction, pruning, streaming, and error handling hardened.
- Providers: Telegram/WhatsApp/Discord/Slack reliability, threading, reactions, media, and retries improved.
- Control UI: logs tab, streaming stability, focus mode, and large-output rendering fixes.
- CLI/Gateway/Doctor: daemon/logs/status, auth migration, and diagnostics significantly expanded.

### Breaking

- **SECURITY (update ASAP):** inbound DMs are now **locked down by default** on Telegram/WhatsApp/Signal/iMessage/Discord/Slack.
  - Previously, if you didn’t configure an allowlist, your bot could be **open to anyone** (especially discoverable Telegram bots).
  - New default: DM pairing (`dmPolicy="pairing"` / `discord.dm.policy="pairing"` / `slack.dm.policy="pairing"`).
  - To keep old “open to everyone” behavior: set `dmPolicy="open"` and include `"*"` in the relevant `allowFrom` (Discord/Slack: `discord.dm.allowFrom` / `slack.dm.allowFrom`).
  - Approve requests via `clawdbot pairing list <provider>` + `clawdbot pairing approve <provider> <code>`.
- Sandbox: default `agent.sandbox.scope` to `"agent"` (one container/workspace per agent). Use `"session"` for per-session isolation; `"shared"` disables cross-session isolation.
- Timestamps in agent envelopes are now UTC (compact `YYYY-MM-DDTHH:mmZ`); removed `messages.timestampPrefix`. Add `agent.userTimezone` to tell the model the user’s local time (system prompt only).
- Model config schema changes (auth profiles + model lists); doctor auto-migrates and the gateway rewrites legacy configs on startup.
- Commands: gate all slash commands to authorized senders; add `/compact` to manually compact session context.
- Groups: `whatsapp.groups`, `telegram.groups`, and `imessage.groups` now act as allowlists when set. Add `"*"` to keep allow-all behavior.
- Auto-reply: removed `autoReply` from Discord/Slack/Telegram channel configs; use `requireMention` instead (Telegram topics now support `requireMention` overrides).
- CLI: remove `update`, `gateway-daemon`, `gateway {install|uninstall|start|stop|restart|daemon status|wake|send|agent}`, and `telegram` commands; move `login/logout` to `providers login/logout` (top-level aliases hidden); use `daemon` for service control, `send`/`agent`/`wake` for RPC, and `nodes canvas` for canvas ops.

### Fixes

- **CLI/Gateway/Doctor:** daemon runtime selection + improved logs/status/health/errors; auth/password handling for local CLI; richer close/timeout details; auto-migrate legacy config/sessions/state; integrity checks + repair prompts; `--yes`/`--non-interactive`; `--deep` gateway scans; better restart/service hints.
- **Agent loop + compaction:** compaction/pruning tuning, overflow handling, safer bootstrap context, and per-provider threading/confirmations; opt-in tool-result pruning + compact tracking.
- **Sandbox + tools:** per-agent sandbox overrides, workspaceAccess controls, session tool visibility, tool policy overrides, process isolation, and tool schema/timeout/reaction unification.
- **Providers (Telegram/WhatsApp/Discord/Slack/Signal/iMessage):** retry/backoff, threading, reactions, media groups/attachments, mention gating, typing behavior, and error/log stability; long polling + forum topic isolation for Telegram.
- **Gateway/CLI UX:** `clawdbot logs`, cron list colors/aliases, docs search, agents list/add/delete flows, status usage snapshots, runtime/auth source display, and `/status`/commands auth unification.
- **Control UI/Web:** logs tab, focus mode polish, config form resilience, streaming stability, tool output caps, windowed chat history, and reconnect/password URL auth.
- **macOS/Android/TUI/Build:** macOS gateway races, QR bundling, JSON5 config safety, Voice Wake hardening; Android EXIF rotation + APK naming/versioning; TUI key handling; tooling/bundling fixes.
- **Packaging/compat:** npm dist folder coverage, Node 25 qrcode-terminal import fixes, Bun/Playwright/WebSocket patches, and Docker Bun install.
- **Docs:** new FAQ/ClawdHub/config examples/showcase entries and clarified auth, sandbox, and systemd docs.

### Maintenance

- Skills additions (Himalaya email, CodexBar, 1Password).
- Dependency refreshes (pi-\* stack, Slack SDK, discord-api-types, file-type, zod, Biome, Vite).
- Refactors: centralized group allowlist/mention policy; lint/import cleanup; switch tsx → bun for TS execution.

## 2026.1.5

### Highlights

- Models: add image-specific model config (`agent.imageModel` + fallbacks) and scan support.
- Agent tools: new `image` tool routed to the image model (when configured).
- Config: default model shorthands (`opus`, `sonnet`, `gpt`, `gpt-mini`, `gemini`, `gemini-flash`).
- Docs: document built-in model shorthands + precedence (user config wins).
- Bun: optional local install/build workflow without maintaining a Bun lockfile (see `docs/bun.md`).

### Fixes

- Control UI: render Markdown in tool result cards.
- Control UI: prevent overlapping action buttons in Discord guild rules on narrow layouts.
- Android: tapping the foreground service notification brings the app to the front. (#179) — thanks @Syhids
- Cron tool uses `id` for update/remove/run/runs (aligns with gateway params). (#180) — thanks @adamgall
- Control UI: chat view uses page scroll with sticky header/sidebar and fixed composer (no inner scroll frame).
- macOS: treat location permission as always-only to avoid iOS-only enums. (#165) — thanks @Nachx639
- macOS: make generated gateway protocol models `Sendable` for Swift 6 strict concurrency. (#195) — thanks @andranik-sahakyan
- macOS: bundle QR code renderer modules so DMG gateway boot doesn't crash on missing qrcode-terminal vendor files.
- macOS: parse JSON5 config safely to avoid wiping user settings when comments are present.
- WhatsApp: suppress typing indicator during heartbeat background tasks. (#190) — thanks @mcinteerj
- WhatsApp: mark offline history sync messages as read without auto-reply. (#193) — thanks @mcinteerj
- Discord: avoid duplicate replies when a provider emits late streaming `text_end` events (OpenAI/GPT).
- CLI: use tailnet IP for local gateway calls when bind is tailnet/auto (fixes #176).
- Env: load global `$CLAWDBOT_STATE_DIR/.env` (`~/.clawdbot/.env`) as a fallback after CWD `.env`.
- Env: optional login-shell env fallback (opt-in; imports expected keys without overriding existing env).
- Agent tools: OpenAI-compatible tool JSON Schemas (fix `browser`, normalize union schemas).
- Onboarding: when running from source, auto-build missing Control UI assets (`bun run ui:build`).
- Discord/Slack: route reaction + system notifications to the correct session (no main-session bleed).
- Agent tools: honor `agent.tools` allow/deny policy even when sandbox is off.
- Discord: avoid duplicate replies when OpenAI emits repeated `message_end` events.
- Commands: unify /status (inline) and command auth across providers; group bypass for authorized control commands; remove Discord /clawd slash handler.
- CLI: run `clawdbot agent` via the Gateway by default; use `--local` to force embedded mode.
