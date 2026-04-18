import fs from "node:fs/promises";
import { formatCliCommand } from "../cli/command-format.js";

// ─── Linux distribution detection ─────────────────────────────────────────

export type LinuxDistroInfo = {
  id: string;       // e.g. "ubuntu", "debian", "fedora"
  like: string[];   // e.g. ["debian"] for ubuntu
  isWSL: boolean;
};

let _distroCache: LinuxDistroInfo | null = null;

/**
 * Detect the current Linux distribution by reading /etc/os-release.
 * This is the standard and reliable way to identify a distro (vs parsing
 * process.env.OS / DISTRIB_ID which is not universally set).
 */
export async function detectLinuxDistro(): Promise<LinuxDistroInfo> {
  if (_distroCache !== null) return _distroCache;

  const wsl =
    !!process.env.WSL_INTEROP ||
    !!process.env.WSL_DISTRO_NAME ||
    !!process.env.WSLENV;

  try {
    const content = await fs.readFile("/etc/os-release", "utf8");
    const entries: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const eqIdx = line.indexOf("=");
      if (eqIdx < 0) continue;
      const key = line.slice(0, eqIdx).trim();
      const rawValue = line.slice(eqIdx + 1).trim().replace(/^"|"$/g, "");
      entries[key] = rawValue;
    }

    const id = (entries.ID ?? "").toLowerCase();
    const like = (entries.ID_LIKE ?? "")
      .split(/\s+/)
      .map((s) => s.toLowerCase())
      .filter(Boolean);

    _distroCache = { id, like, isWSL: wsl };
  } catch {
    _distroCache = { id: "", like: [], isWSL: wsl };
  }

  return _distroCache!;
}

/** Synchronous WSL check used in non-async contexts. */
export function isWSLEnv(): boolean {
  return (
    !!process.env.WSL_INTEROP ||
    !!process.env.WSL_DISTRO_NAME ||
    !!process.env.WSLENV
  );
}

// ─── Hint rendering ─────────────────────────────────────────────────────────

/**
 * Returns hints for when systemd user services are unavailable.
 * @param options.wsl   - whether the current environment is WSL
 * @param options.distro - optional distro info; if omitted, sync WSL check is used
 */
export function renderSystemdUnavailableHints(
  options: { wsl?: boolean; distro?: LinuxDistroInfo } = {},
): string[] {
  const wsl = options.wsl ?? isWSLEnv();
  const distro = options.distro;

  if (wsl) {
    return [
      "WSL2 需要启用 systemd：编辑 /etc/wsl.conf 添加 [boot] 和 systemd=true",
      "然后在 PowerShell 中运行: wsl --shutdown，再重新打开 WSL",
      "验证命令: systemctl --user status",
    ];
  }

  // Targeted hints based on detected distro
  if (distro) {
    const isUbuntu = distro.id === "ubuntu" || distro.like.includes("ubuntu") || distro.like.includes("debian");
    if (isUbuntu) {
      return [
        "Ubuntu/Debian 用户请确保：",
        "1. 已启用用户linger: sudo loginctl enable-linger $USER",
        "2. 用户目录已创建: mkdir -p ~/.config/systemd/user",
        "3. 可刷新会话: systemctl --user daemon-reexec",
        "",
        `或者使用前台模式: ${formatCliCommand("openclaw-cn gateway run")}`,
      ];
    }
    if (distro.id === "fedora" || distro.like.includes("fedora")) {
      return [
        "Fedora 用户请确保已启用用户linger: sudo loginctl enable-linger $USER",
        `或者使用前台模式: ${formatCliCommand("openclaw-cn gateway run")}`,
      ];
    }
  }

  return [
    "systemd 用户服务不可用；请安装/启用 systemd，或使用其他进程管理器运行网关。",
    `如果在容器中运行，请使用前台模式: ${formatCliCommand("openclaw-cn gateway run")}`,
  ];
}

// ─── Error message builder (replaces manual "\n" concatenation) ────────────

export type InstallErrorContext = {
  cause: Error | unknown;
  distro?: LinuxDistroInfo;
  wsl?: boolean;
};

/**
 * Builds a human-friendly multi-line error message for failed systemd service
 * installation, with targeted hints based on distro and error content.
 * Uses .join("\n") instead of scattered "\n" concatenation.
 */
export function buildInstallErrorMessage(ctx: InstallErrorContext): string {
  const { cause, distro, wsl } = ctx;
  const rawMsg = cause instanceof Error ? cause.message : String(cause);
  const detail = rawMsg.toLowerCase();
  const lines: string[] = [cause instanceof Error ? cause.message : String(cause)];

  // Detect WSL from error message
  const isWSLError =
    wsl ||
    detail.includes("wsl") ||
    detail.includes("not been booted") ||
    detail.includes("boot") && detail.includes("systemd");

  // Detect Ubuntu/Debian from error message
  const isUbuntuError =
    detail.includes("ubuntu") ||
    detail.includes("debian") ||
    (distro && (distro.id === "ubuntu" || distro.like.includes("ubuntu") || distro.like.includes("debian")));

  if (isWSLError) {
    lines.push("", "WSL2 用户请注意:");
    lines.push("1. 编辑 /etc/wsl.conf 添加:");
    lines.push("   [boot]");
    lines.push("   systemd=true");
    lines.push("2. 重启WSL: wsl --shutdown");
    lines.push("3. 重新打开WSL终端");
  }

  if (isUbuntuError) {
    lines.push("", "Ubuntu/Debian 用户请注意:");
    lines.push("1. 确保已启用用户linger: sudo loginctl enable-linger $USER");
    lines.push("2. 创建用户目录: mkdir -p ~/.config/systemd/user");
    lines.push("3. 重启用户服务: systemctl --user daemon-reexec");
  }

  // Always append alternatives
  lines.push("", "替代方案:");
  lines.push("• 使用前台模式: openclaw-cn gateway run");
  lines.push("• 使用其他进程管理器 (pm2, supervisor等)");
  lines.push("• 手动创建systemd服务文件");

  return lines.join("\n");
}

// ─── Detail string checker ───────────────────────────────────────────────────

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
