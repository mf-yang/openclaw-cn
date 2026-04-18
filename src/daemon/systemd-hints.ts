import { formatCliCommand } from "../cli/command-format.js";

export function isSystemdUnavailableDetail(detail?: string): boolean {
  if (!detail) return false;
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("systemctl --user unavailable") ||
    normalized.includes("systemctl not available") ||
    normalized.includes("not been booted with systemd") ||
    normalized.includes("failed to connect to bus") ||
    normalized.includes("systemd user services are required")
  );
}

export function renderSystemdUnavailableHints(options: { wsl?: boolean } = {}): string[] {
  if (options.wsl) {
    return [
      "WSL2 需要启用 systemd：编辑 /etc/wsl.conf 添加 [boot] 和 systemd=true",
      "然后在 PowerShell 中运行: wsl --shutdown，再重新打开 WSL",
      "验证命令: systemctl --user status",
    ];
  }

  return [
    "systemd 用户服务不可用；请安装/启用 systemd，或使用其他进程管理器运行网关。",
    `如果在容器中运行，请使用前台模式: ${formatCliCommand("openclaw-cn gateway run")}`,
  ];
}
