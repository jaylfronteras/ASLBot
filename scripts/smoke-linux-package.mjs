import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wayland = process.env.JLFBOT_SMOKE_WAYLAND === "1";
const hardDeath = process.env.JLFBOT_SMOKE_HARD_DEATH === "1";
const bundled = process.env.JLFBOT_SMOKE_BUNDLED_CUA === "1";
const sessionBlocked = process.env.JLFBOT_SMOKE_LINUX_CUA_BLOCKED === "1";
const signalShutdown = process.env.JLFBOT_SMOKE_SIGNAL_SHUTDOWN === "1";
if ([hardDeath, bundled, sessionBlocked].filter(Boolean).length > 1) {
  throw new Error("hard-death, bundled, and release-safety smoke modes are mutually exclusive");
}
if (signalShutdown && !bundled) {
  throw new Error("signal-shutdown smoke requires the bundled runtime mode");
}
const executable = path.resolve(
  process.env.JLFBOT_SMOKE_EXECUTABLE ?? path.join(root, "release", "linux-unpacked", "aslbot"),
);
if (!existsSync(executable)) throw new Error(`[smoke-linux-package] missing executable: ${executable}`);

const sandbox = mkdtempSync(path.join(tmpdir(), "jlfbot-linux-smoke-"));
const home = path.join(sandbox, "home");
const xdgConfig = path.join(sandbox, "config");
const xdgRuntime = path.join(sandbox, "runtime");
const marker = path.join(sandbox, "cua-invocations.ndjson");
const fakeState = path.join(sandbox, "cua-serve-count");
const sentinel = path.join(sandbox, "cua-driver");
mkdirSync(path.join(home, ".aslbot"), { recursive: true });
mkdirSync(xdgConfig, { recursive: true });
mkdirSync(xdgRuntime, { recursive: true, mode: 0o700 });
chmodSync(xdgRuntime, 0o700);
writeFileSync(
  path.join(home, ".aslbot", "config.json"),
  JSON.stringify({ instances: { ghost: { driver: "not-a-real-driver", displayName: "Ghost" } } }),
);
for (const appName of ["aslbot", "ASLBot"]) {
  const userData = path.join(xdgConfig, appName);
  mkdirSync(userData, { recursive: true, mode: 0o700 });
  chmodSync(userData, 0o700);
  writeFileSync(
    path.join(userData, "cua-local-control.json"),
    // Keep this explicit: schema 2 prevents a safe build's opt-in from arming
    // an older Linux package that started Cua without the seat-safety flags.
    JSON.stringify({ schemaVersion: 2, linuxLocalControlEnabled: true }),
    { mode: 0o600 },
  );
}
writeFileSync(
  sentinel,
  `#!${process.execPath}
const { appendFileSync, chmodSync, existsSync, readFileSync, realpathSync, unlinkSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const marker = ${JSON.stringify(marker)};
const state = ${JSON.stringify(fakeState)};
const wayland = ${JSON.stringify(wayland)};
const args = process.argv.slice(2);
appendFileSync(marker, JSON.stringify({
  pid: process.pid,
  args,
  telemetryEnabled: process.env.CUA_DRIVER_RS_TELEMETRY_ENABLED,
  updateCheck: process.env.CUA_DRIVER_RS_UPDATE_CHECK,
  waylandEnabled: process.env.CUA_DRIVER_RS_ENABLE_WAYLAND === "1",
}) + "\\n");
const after = (flag) => { const index = args.indexOf(flag); return index === -1 ? null : args[index + 1]; };
if (args.includes("--version")) {
  process.stdout.write("cua-driver 0.19.3\\n");
  process.exit(0);
}
if (args[0] === "manifest") {
  const binary = realpathSync(process.argv[1]);
  process.stdout.write(JSON.stringify({
    schema_version: "1",
    binary_version: "0.19.3",
    binary_path: binary,
    mcp_invocation: { command: binary, args: ["mcp"] },
  }) + "\\n");
  process.exit(0);
}
if (args[0] === "doctor" && args.includes("--json")) {
  process.stdout.write(JSON.stringify({ ok: true, probes: [
    { label: "binary", status: "ok", message: "cua-driver 0.19.3" },
    { label: "display server", status: "ok", message: wayland
      ? "Wayland+XWayland (WAYLAND_DISPLAY=wayland-smoke, DISPLAY=:99)"
      : "X11 (DISPLAY=:99)" },
    { label: "X11 connection", status: "warn", message: "no top-level windows in Xvfb" },
    { label: "AT-SPI", status: "ok", message: "fixture bus available" },
  ] }) + "\\n");
  process.exit(0);
}
if (args[0] !== "serve") process.exit(64);
const socketPath = after("--socket");
const pidFile = after("--pid-file");
if (!socketPath || !pidFile || !args.includes("--embedded") || !args.includes("--no-overlay") || after("--permission-mode") !== "standard") {
  process.exit(64);
}
if ((process.env.CUA_DRIVER_RS_ENABLE_WAYLAND === "1") !== wayland) process.exit(64);
const count = existsSync(state) ? Number(readFileSync(state, "utf8")) + 1 : 1;
writeFileSync(state, String(count));
writeFileSync(pidFile, String(process.pid), { mode: 0o600 });
const metadata = {
  driver_version: "0.19.3",
  contract_version: "0.6.0",
  tools_list_schema_version: "1",
  capability_version: "1",
  mcp_protocol_version: "2025-06-18",
  pid: process.pid,
  embedded: true,
  host_bundle_id: "com.jlfbot.app",
};
const tools = ["click", "get_window_state", "list_apps", "type_text"].map((name) => ({ name }));
const toolManifest = { schema_version: "1", capability_version: "1", tools };
const healthReport = {
  schema_version: "1",
  platform: "linux",
  driver_version: "0.19.3",
  overall: "ok",
  checks: [
    { name: "binary_version", status: "pass", message: "cua-driver 0.19.3" },
    { name: "platform_supported", status: "pass", message: "Ubuntu 24.04" },
    { name: "session_active", status: "pass", message: "MCP session is active." },
    { name: "ax_capability", status: "pass", message: "AT-SPI fixture is reachable." },
    { name: "screen_capture_capability", status: "pass", message: "Portal fixture is reachable." },
    { name: "wayland_backend", status: "pass", message: "WinRects and portal/libei fixtures are reachable." },
  ],
};
const server = net.createServer((socket) => {
  let input = "";
  socket.on("data", (chunk) => {
    input += chunk;
    const newline = input.indexOf("\\n");
    if (newline === -1) return;
    const request = JSON.parse(input.slice(0, newline));
    const result = request.method === "metadata"
      ? metadata
      : request.method === "list"
        ? toolManifest
        : request.method === "call" && request.name === "health_report" && wayland
          ? { structuredContent: healthReport }
          : null;
    socket.end(JSON.stringify(result ? { ok: true, result } : { ok: false, error: "unknown" }) + "\\n");
    if (count === 1 && request.method === "list") setTimeout(() => server.close(() => process.exit(17)), 5000);
  });
});
server.listen(socketPath, () => chmodSync(socketPath, 0o600));
const shutdown = () => server.close(() => {
  for (const file of [socketPath, pidFile]) { try { unlinkSync(file); } catch {} }
  process.exit(0);
});
process.stdin.on("end", shutdown);
process.on("SIGTERM", shutdown);
`,
);
chmodSync(sentinel, 0o755);

// Accept the optional managed-Composio request but never answer it. The
// renderer must still become ready and close normally while this request is
// pending, proving hosted integration latency is outside first paint.
let brokerRequests = 0;
const brokerSockets = new Set();
const slowBroker = createServer(() => {
  brokerRequests += 1;
});
slowBroker.on("connection", (socket) => {
  brokerSockets.add(socket);
  socket.once("close", () => brokerSockets.delete(socket));
});
await new Promise((resolve, reject) => {
  slowBroker.once("error", reject);
  slowBroker.listen(0, "127.0.0.1", resolve);
});
const brokerAddress = slowBroker.address();
if (!brokerAddress || typeof brokerAddress === "string") {
  throw new Error("could not start the deterministic slow Composio broker");
}

const desktopEnv = {
  ...process.env,
  HOME: home,
  XDG_CONFIG_HOME: xdgConfig,
  XDG_RUNTIME_DIR: xdgRuntime,
  XDG_SESSION_TYPE: wayland ? "wayland" : "x11",
  XDG_CURRENT_DESKTOP: "GNOME",
  CUA_DRIVER_PATH: sentinel,
  JLFBOT_COMPOSIO_BROKER_URL: `http://127.0.0.1:${brokerAddress.port}`,
  JLFBOT_SMOKE_TEST: "1",
  JLFBOT_SMOKE_CUA: hardDeath || bundled || sessionBlocked ? "0" : "1",
  JLFBOT_SMOKE_BUNDLED_CUA: bundled ? "1" : "0",
};
if (hardDeath || signalShutdown) desktopEnv.JLFBOT_SMOKE_KEEP_OPEN = "1";
if (bundled) delete desktopEnv.CUA_DRIVER_PATH;
if (wayland) desktopEnv.WAYLAND_DISPLAY = "wayland-smoke";
else delete desktopEnv.WAYLAND_DISPLAY;

let output = "";
let smokeResult = null;
// The smoke runs with a disposable HOME and no interactive keyring. Keep
// Electron's credential backend inside that sandbox so a GNOME Keyring unlock
// prompt cannot block the headless renderer before did-finish-load.
const electronArgs = ["--password-store=basic"];
if (wayland) electronArgs.push("--ozone-platform=x11");
const child = spawn(executable, electronArgs, {
  cwd: root,
  detached: true,
  env: desktopEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    output += chunk;
    const match = output.match(/\[smoke\] renderer-ready (\{.*\})\r?\n/);
    if (match && !smokeResult) smokeResult = JSON.parse(match[1]);
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const processRunning = (processHandle) =>
  processHandle.exitCode === null && processHandle.signalCode === null;
const childRunning = () => processRunning(child);
async function until(probe, description) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await probe().catch(() => null);
    if (value) return value;
    if (!childRunning()) {
      throw new Error(
        `Electron exited ${child.exitCode ?? child.signalCode} while waiting for ${description}.\n${output}`,
      );
    }
    await delay(100);
  }
  throw new Error(`timed out waiting for ${description}.\n${output}`);
}

async function waitForExit() {
  const deadline = Date.now() + 10_000;
  while (childRunning() && Date.now() < deadline) await delay(50);
  if (childRunning()) throw new Error(`Electron did not exit after its window closed.\n${output}`);
}

async function stopDetached(processHandle) {
  if (!processRunning(processHandle)) return;
  try {
    process.kill(-processHandle.pid, "SIGTERM");
  } catch {}
  const stopDeadline = Date.now() + 5_000;
  while (processRunning(processHandle) && Date.now() < stopDeadline) await delay(50);
  if (processRunning(processHandle)) {
    try {
      process.kill(-processHandle.pid, "SIGKILL");
    } catch {}
  }
}

async function stopProcess() {
  await stopDetached(child);
}

try {
  const result = await until(async () => smokeResult, "the packaged renderer smoke result");
  const { capabilities, health, location, title } = result;
  if (health?.app !== "aslbot" || health.static !== true) {
    throw new Error(`unexpected embedded health response: ${JSON.stringify(health)}`);
  }
  if (!String(title).includes("ASLBot")) throw new Error(`unexpected renderer title: ${title}`);
  if (capabilities.host.platform !== "linux") throw new Error("renderer did not report Linux");
  if (capabilities.host.session !== (wayland ? "wayland" : "x11")) {
    throw new Error(`renderer did not report the ${wayland ? "Wayland" : "X11"} contract`);
  }
  if (capabilities.dictation?.available) throw new Error("dictation must be unavailable on Linux");
  if (capabilities.localComputer?.available) {
    throw new Error(`computer use is not part of ASLBot: ${JSON.stringify(capabilities.localComputer)}`);
  }
  if (result.hardwareAccelerationEnabled !== false) {
    throw new Error("Linux package did not disable hardware acceleration before startup");
  }
  await until(async () => brokerRequests > 0, "the optional slow-broker request");
  if (existsSync(marker) && readFileSync(marker, "utf8").trim()) {
    throw new Error(`ASLBot invoked a computer-use driver:\n${readFileSync(marker, "utf8")}`);
  }
  if (signalShutdown) child.kill("SIGTERM");
  else if (hardDeath) child.kill("SIGKILL");
  await waitForExit();
  const staleHealth = await fetch(new URL("/api/health", location)).catch(() => null);
  if (staleHealth?.ok) throw new Error("embedded harness remained reachable after Electron quit");
  console.log(`[smoke-linux-package] OK (${path.basename(executable)}): ASLBot renderer, no computer runtime, harness shutdown`);
} finally {
  await stopProcess();
  for (const socket of brokerSockets) socket.destroy();
  await new Promise((resolve) => slowBroker.close(resolve));
  if (process.env.JLFBOT_KEEP_SMOKE_DIR !== "1") rmSync(sandbox, { recursive: true, force: true });
  else console.log(`[smoke-linux-package] kept ${sandbox}`);
}
