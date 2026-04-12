# 🧞 Openclaw 中文社区版

**私有化部署的 AI 智能助手，完整中文本地化。**

> ⚠️ **声明：** 本项目非官方 cn 版本，此项目的目的是为了让国内用户快速接入使用，并更加适配国内网络环境。本项目已将所有 GitHub 依赖包构建为 npm 包，让国内用户使用淘宝镜像源可快速下载，避免因网络原因无法安装原版。

<p align="center">
  <img src="docs/images/main-view.png" alt="Openclaw 中文社区控制界面" width="800">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openclaw-cn"><img src="https://img.shields.io/npm/v/openclaw-cn?style=for-the-badge&logo=npm&logoColor=white&label=npm" alt="npm 版本"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2022-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 版本"></a>
  <a href="https://github.com/jiulingyun/openclaw-cn"><img src="https://img.shields.io/github/stars/jiulingyun/openclaw-cn?style=for-the-badge&logo=github&label=Stars" alt="GitHub Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-blue.svg?style=for-the-badge" alt="MIT 许可证"></a>
</p>

<p align="center">
  <a href="https://clawd.org.cn">🌐 官网</a> ·
  <a href="https://clawd.org.cn/docs">📖 文档</a> ·
  <a href="https://github.com/jiulingyun/openclaw-cn/issues">💬 反馈</a> ·
  <a href="https://clawd.org.cn/sponsor.html">❤️ 为爱发电（赞助）</a>
</p>

---

## 💎 赞助商

<p align="center">
  <a href="https://platform.ephone.ai">
    <img src="https://platform.ephone.ai/logo-e.png" alt="ePhone AI" height="48">
  </a>
</p>
<p align="center">
  <a href="https://platform.ephone.ai"><b>ePhone AI</b></a> — 统一接入，极速集成；支持 Claude、GPT 等主流模型
</p>

---

## ✨ 特性

- **🇨🇳 完整中文化** — CLI、Web 控制界面、配置向导全部汉化
- **🏠 本地优先** — 数据存储在你自己的设备上，隐私可控
- **📱 多渠道支持** — WhatsApp、Telegram、Slack、Discord、Signal、iMessage、飞书、钉钉、企业微信、QQ、微信
- **🎙️ 语音交互** — macOS/iOS/Android 语音唤醒和对话
- **🖼️ Canvas 画布** — 智能体驱动的可视化工作区
- **🔧 技能扩展** — 内置技能 + 自定义工作区技能

## 🚀 快速开始

**环境要求：** Node.js ≥ 22

```bash
# 安装
npm install -g openclaw-cn@latest

# 运行安装向导
openclaw-cn onboard --install-daemon

# 启动网关
openclaw-cn gateway --port 18789 --verbose
```

> 💡 **兼容性：** 旧版本 `clawdbot-cn` 命令仍然可用，作为别名指向 `openclaw-cn`。

## 📦 安装方式

### npm（推荐）

```bash
npm install -g openclaw-cn@latest
# 或
pnpm add -g openclaw-cn@latest
```

### 从源码构建

```bash
git clone https://github.com/jiulingyun/openclaw-cn.git
cd openclaw-cn

pnpm install
pnpm ui:build
pnpm build

pnpm openclaw-cn onboard --install-daemon
```

## 🔧 配置

最小配置 `~/.openclaw/openclaw.json`：

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}
```

## 📚 文档

- [快速开始](https://clawd.org.cn/start/getting-started.html)
- [Gateway 配置](https://clawd.org.cn/docs/gateway/configuration)
- [渠道接入](https://clawd.org.cn/channels/)
- [飞书渠道](https://clawd.org.cn/channels/feishu.html) — 官方插件 `@larksuiteoapi/feishu-openclaw-plugin`，配置向导一键安装
- [钉钉渠道](https://clawd.org.cn/channels/dingtalk-connector.html) — 官方插件，配置向导一键安装
- [企业微信渠道](https://clawd.org.cn/channels/wecom.html) — 官方插件，配置向导一键安装
- [QQ 渠道](https://clawd.org.cn/channels/qqbot.html) — 社区插件 `@sliverp/qqbot`（基于 OneBot/NapCat），配置向导一键安装
- [微信渠道](https://clawd.org.cn/channels/openclaw-weixin.html) — 官方插件 `@tencent-weixin/openclaw-weixin`，配置向导一键安装
- [QQ (OneBot) 社区插件 ↗](https://github.com/Daiyimo/openclaw-napcat) - 由 @Daiyimo 贡献，基于 NapCat/Lagrange（非官方内置）
- [技能开发](https://clawd.org.cn/tools/skills.html)

## 🔄 版本同步

本项目基于 [openclaw/openclaw](https://github.com/openclaw/openclaw) 进行中文本地化，定期与上游保持同步。

版本格式：`vYYYY.M.D-cn.N`（如 `v2026.1.24-cn.3`）

## 🤝 参与贡献

欢迎提交 Issue 和 PR！

- Bug 修复和功能优化会考虑贡献回上游
- 翻译改进、文档完善、国内渠道适配都非常欢迎

## 🙌 Thanks to all clawtributors

<p align="left">
  <a href="https://github.com/Ronald-Kong99"><img src="https://avatars.githubusercontent.com/Ronald-Kong99?v=4" width="48" height="48" alt="Ronald-Kong99" /></a>
  <a href="https://github.com/dragonforce2010"><img src="https://avatars.githubusercontent.com/dragonforce2010?v=4" width="48" height="48" alt="dragonforce2010" /></a>
  <a href="https://github.com/yanghua"><img src="https://avatars.githubusercontent.com/yanghua?v=4" width="48" height="48" alt="yanghua" /></a>
  <a href="https://github.com/qqdxyg"><img src="https://avatars.githubusercontent.com/qqdxyg?v=4" width="48" height="48" alt="qqdxyg" /></a>
  <a href="https://github.com/ddupg"><img src="https://avatars.githubusercontent.com/ddupg?v=4" width="48" height="48" alt="ddupg" /></a>
  <a href="https://github.com/Daiyimo"><img src="https://avatars.githubusercontent.com/Daiyimo?v=4" width="48" height="48" alt="Daiyimo" /></a>
  <a href="https://github.com/yebohong02"><img src="https://avatars.githubusercontent.com/yebohong02?v=4" width="48" height="48" alt="yebohong02" /></a>
  <a href="https://github.com/lvjianchaos"><img src="https://avatars.githubusercontent.com/lvjianchaos?v=4" width="48" height="48" alt="lvjianchaos" /></a>
  <a href="https://github.com/Yogdunana"><img src="https://avatars.githubusercontent.com/Yogdunana?v=4" width="48" height="48" alt="Yogdunana" /></a>
</p>

## 📋 开发计划

- [x] CLI 界面汉化
- [x] Web 控制界面汉化
- [x] 配置向导汉化
- [x] 中文官网和文档
- [x] 飞书渠道适配（官方插件，配置向导一键安装）
- [x] 钉钉渠道适配（官方插件，配置向导一键安装）
- [x] 企业微信渠道适配（官方插件，配置向导一键安装）
- [x] QQ 渠道适配（社区插件 `@sliverp/qqbot`，配置向导一键安装）
- [x] 微信渠道适配（官方插件 `@tencent-weixin/openclaw-weixin`，配置向导一键安装）

## 📄 许可证

[MIT](LICENSE)

## ⭐ Star 趋势

<a href="https://star-history.com/#jiulingyun/openclaw-cn&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=jiulingyun/openclaw-cn&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=jiulingyun/openclaw-cn&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=jiulingyun/openclaw-cn&type=Date" />
 </picture>
</a>

---

<p align="center">
  基于 <a href="https://github.com/openclaw/openclaw">Openclaw</a> · 感谢原项目开发者 🧞
</p>
