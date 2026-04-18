import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── execFile mock (used by systemd.ts) ────────────────────────────────────

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

// ─── fs/promises mock (used by systemd-hints.ts for /etc/os-release) ───────

const fsReadFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: fsReadFileMock,
  },
}));

// ─── Imports (after mocks are set up) ──────────────────────────────────────

import {
  isSystemdUserServiceAvailable,
  isSystemdUserServiceAvailableDetailed,
} from "./systemd.js";
import {
  buildInstallErrorMessage,
  detectLinuxDistro,
  isSystemdUnavailableDetail,
  isWSLEnv,
  renderSystemdUnavailableHints,
} from "./systemd-hints.js";

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("isSystemdUserServiceAvailableDetailed", () => {
  beforeEach(() => {
    execFileMock.mockReset();
    fsReadFileMock.mockReset();
  });

  it("returns available=true when systemctl --user succeeds", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      cb(null, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns available=false with reason+fix when bus connection fails", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("Failed to connect to bus") as Error & { stderr?: string; code?: number };
      err.stderr = "Failed to connect to bus: No such file or directory";
      err.code = 1;
      cb(err, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(false);
    expect(result.reason).toBe("无法连接到 DBus 总线");
    expect(result.fix).toContain("loginctl enable-linger");
  });

  it("returns available=false with WSL fix for not-booted-with-systemd error", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("System has not been booted with systemd") as Error & { stderr?: string; code?: number };
      err.stderr = "System has not been booted with systemd";
      err.code = 1;
      cb(err, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(false);
    expect(result.reason).toBe("系统未使用 systemd 启动");
    expect(result.fix).toContain("/etc/wsl.conf");
  });

  it("returns available=false when systemctl command is not found", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("systemctl: command not found") as Error & { stderr?: string; code?: number };
      err.stderr = "systemctl: command not found";
      err.code = 127;
      cb(err, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(false);
    expect(result.reason).toBe("systemctl 命令未找到");
    expect(result.fix).toContain("apt install systemd");
  });

  it("returns available=false when systemd user directory is missing", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("No such file or directory") as Error & { stderr?: string; code?: number };
      err.stderr = "No such file or directory: /run/user/1000/systemd/private";
      err.code = 1;
      cb(err, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(false);
    expect(result.reason).toBe("systemd 用户目录不存在");
    expect(result.fix).toContain("mkdir -p ~/.config/systemd/user");
  });

  it("returns available=false with generic fallback for unknown errors", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("Some obscure systemd error") as Error & { stderr?: string; code?: number };
      err.stderr = "Some obscure systemd error";
      err.code = 1;
      cb(err, "", "");
    });
    const result = await isSystemdUserServiceAvailableDetailed();
    expect(result.available).toBe(false);
    expect(result.reason).toBe("systemd 用户服务不可用");
    expect(result.fix).toContain("openclaw-cn gateway run");
  });

  it("isSystemdUserServiceAvailable returns true when detailed returns available:true", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      cb(null, "", "");
    });
    await expect(isSystemdUserServiceAvailable()).resolves.toBe(true);
  });

  it("isSystemdUserServiceAvailable returns false when detailed returns available:false", async () => {
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
      const err = new Error("Failed to connect to bus") as Error & { stderr?: string; code?: number };
      err.stderr = "Failed to connect to bus";
      err.code = 1;
      cb(err, "", "");
    });
    await expect(isSystemdUserServiceAvailable()).resolves.toBe(false);
  });
});

describe("isSystemdUnavailableDetail", () => {
  it("returns true for systemctl unavailable messages", () => {
    expect(isSystemdUnavailableDetail("systemctl --user unavailable")).toBe(true);
  });

  it("returns true for not been booted with systemd", () => {
    expect(isSystemdUnavailableDetail("System has not been booted with systemd")).toBe(true);
  });

  it("returns true for failed to connect to bus", () => {
    expect(isSystemdUnavailableDetail("Failed to connect to bus")).toBe(true);
  });

  it("returns false for empty/undefined", () => {
    expect(isSystemdUnavailableDetail("")).toBe(false);
    expect(isSystemdUnavailableDetail(undefined)).toBe(false);
  });

  it("returns false for unrelated messages", () => {
    expect(isSystemdUnavailableDetail("Service started successfully")).toBe(false);
  });
});

describe("isWSLEnv", () => {
  const restore = (vars: Record<string, string | undefined>) => {
    Object.assign(process.env, vars);
  };

  it("returns true when WSL_INTEROP is set", () => {
    restore({ WSL_INTEROP: "some/path", WSL_DISTRO_NAME: undefined, WSLENV: undefined });
    expect(isWSLEnv()).toBe(true);
    restore({ WSL_INTEROP: undefined });
  });

  it("returns true when WSL_DISTRO_NAME is set", () => {
    restore({ WSL_DISTRO_NAME: "Ubuntu", WSL_INTEROP: undefined, WSLENV: undefined });
    expect(isWSLEnv()).toBe(true);
    restore({ WSL_DISTRO_NAME: undefined });
  });

  it("returns false when no WSL env vars are set", () => {
    restore({ WSL_INTEROP: undefined, WSL_DISTRO_NAME: undefined, WSLENV: undefined });
    expect(isWSLEnv()).toBe(false);
  });
});

describe("detectLinuxDistro", () => {
  beforeEach(() => {
    fsReadFileMock.mockReset();
  });

  it("parses /etc/os-release for Ubuntu", async () => {
    fsReadFileMock.mockResolvedValue(
      'ID=ubuntu\nID_LIKE="debian ubuntu"\nVERSION_ID="22.04"\n',
    );
    const distro = await detectLinuxDistro();
    expect(distro.id).toBe("ubuntu");
    expect(distro.like).toContain("debian");
  });

  it("parses /etc/os-release for Debian", async () => {
    fsReadFileMock.mockResolvedValue('ID=debian\nID_LIKE="debian"\nVERSION_ID="11"\n');
    const distro = await detectLinuxDistro();
    expect(distro.id).toBe("debian");
    expect(distro.like).not.toContain("ubuntu");
  });

  it("returns empty values when /etc/os-release cannot be read", async () => {
    fsReadFileMock.mockRejectedValue(new Error("ENOENT"));
    const distro = await detectLinuxDistro();
    expect(distro.id).toBe("");
    expect(distro.like).toEqual([]);
  });
});

describe("renderSystemdUnavailableHints", () => {
  it("returns WSL-specific hints when wsl=true", () => {
    const hints = renderSystemdUnavailableHints({ wsl: true });
    expect(hints[0]).toContain("WSL2");
    expect(hints[0]).toContain("/etc/wsl.conf");
  });

  it("returns Ubuntu-specific hints when distro is ubuntu", () => {
    const hints = renderSystemdUnavailableHints({
      distro: { id: "ubuntu", like: ["debian"], isWSL: false },
    });
    expect(hints.some((h) => h.includes("Ubuntu/Debian"))).toBe(true);
    expect(hints.some((h) => h.includes("loginctl enable-linger"))).toBe(true);
  });

  it("returns Ubuntu hints when distro like includes ubuntu (e.g. Pop!_OS)", () => {
    const hints = renderSystemdUnavailableHints({
      distro: { id: "pop", like: ["ubuntu", "debian"], isWSL: false },
    });
    expect(hints.some((h) => h.includes("Ubuntu/Debian"))).toBe(true);
  });

  it("returns Fedora-specific hints when distro is fedora", () => {
    const hints = renderSystemdUnavailableHints({
      distro: { id: "fedora", like: ["fedora"], isWSL: false },
    });
    expect(hints.some((h) => h.includes("Fedora"))).toBe(true);
  });

  it("returns generic hints when distro is unknown and not WSL", () => {
    const hints = renderSystemdUnavailableHints({ wsl: false });
    expect(hints[0]).toContain("systemd 用户服务不可用");
  });
});

describe("buildInstallErrorMessage", () => {
  it("includes the original error message", () => {
    const msg = buildInstallErrorMessage({
      cause: new Error("install failed"),
      wsl: false,
    });
    expect(msg).toContain("install failed");
  });

  it("adds WSL hints when wsl=true", () => {
    const msg = buildInstallErrorMessage({
      cause: new Error("systemd error"),
      wsl: true,
    });
    expect(msg).toContain("WSL2");
    expect(msg).toContain("/etc/wsl.conf");
  });

  it("adds Ubuntu hints when error message contains ubuntu", () => {
    const msg = buildInstallErrorMessage({
      cause: new Error("Ubuntu install failed"),
      wsl: false,
    });
    expect(msg).toContain("Ubuntu/Debian");
    expect(msg).toContain("loginctl enable-linger");
  });

  it("always appends alternative options", () => {
    const msg = buildInstallErrorMessage({
      cause: new Error("some error"),
      wsl: false,
    });
    expect(msg).toContain("替代方案");
    expect(msg).toContain("openclaw-cn gateway run");
  });

  it("uses .join() for multi-line strings (no scattered \\n concatenations)", () => {
    const msg = buildInstallErrorMessage({
      cause: new Error("systemd error"),
      wsl: true,
    });
    const lines = msg.split("\n");
    // Header, WSL section (multi-line), alternatives section (multi-line)
    expect(lines.length).toBeGreaterThan(3);
    // No raw "\n" embedded mid-string (lines should be clean)
    expect(msg).not.toMatch(/\\n/);
  });
});
