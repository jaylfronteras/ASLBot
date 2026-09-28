// Proves the line the app hands a Ubuntu user actually installs, and that the
// command it replaced does not.
//
// The .deb update path ends with a command on the clipboard: the app
// deliberately never installs the package itself. That makes the command the
// whole deliverable, so it is executed here as root on a clean Ubuntu, through
// a real shell, exactly as pasted — quoting included.
//
//   node scripts/smoke-deb-command.mjs <path-to-deb>
//
// Needs a container runtime; installing a system package is the point.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { packageInstallCommand } from "../electron/package-install-command.mjs";

const IMAGE = process.env.JLFBOT_DEB_SMOKE_IMAGE || "ubuntu:24.04";
const RUNTIME = process.env.JLFBOT_DEB_SMOKE_RUNTIME || "docker";
if (!["docker", "podman"].includes(RUNTIME)) throw new Error("unsupported container runtime");

function fail(message) {
  console.error(`[smoke-deb-command] ${message}`);
  process.exit(1);
}

const deb = path.resolve(process.argv[2] ?? "");
if (!deb.endsWith(".deb") || !existsSync(deb)) fail("pass the path to a .deb");

// Inside the container the package sits at a path with a space and an
// apostrophe, so the quoting the app emits is exercised, not assumed.
const staged = "/root/pending dir/o'brien/ASLBot.deb";
const command = packageInstallCommand("deb", staged);
console.log(`[smoke-deb-command] command under test:\n    ${command}\n`);

function inContainer(script, { expectFailure = false } = {}) {
  try {
    const output = execFileSync(
      RUNTIME,
      [
        // Privileged so the package's postinst can load its browser AppArmor
        // profile the way it does on a real Ubuntu 24.04 host. Unprivileged,
        // the container inherits the host's user-namespace restriction but
        // cannot reach AppArmor, and the postinst correctly fails closed.
        "run", "--rm", "--privileged",
        "-v", `${deb}:/tmp/package.deb:ro`,
        "-e", "DEBIAN_FRONTEND=noninteractive",
        IMAGE,
        "/bin/bash", "-c", script,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15 * 60 * 1000 },
    );
    if (expectFailure) fail("the command was expected to fail but succeeded");
    return output;
  } catch (error) {
    if (expectFailure) return String(error.stdout ?? "") + String(error.stderr ?? "");
    // apt's full output is ~100 KB and the process can exit before a huge
    // write flushes, hiding the dpkg/postinst error; print the tails.
    const tail = (text) => String(text ?? "").split("\n").slice(-60).join("\n");
    process.stderr.write(`--- container stdout (tail) ---\n${tail(error.stdout)}\n--- container stderr (tail) ---\n${tail(error.stderr)}\n`);
    process.exitCode = 1;
    throw new Error(`container command failed with status ${error.status}`);
  }
}

// Everything before the command under test is setup; `set -e` keeps a failed
// setup from being read as a failed install.
const prepare = [
  "set -e",
  "apt-get update -qq",
  "apt-get install -y -qq sudo >/dev/null",
  // A privileged container still starts without securityfs; mount it so
  // AppArmor is visible (apparmor_status --enabled, apparmor_parser -r).
  "if [ ! -d /sys/kernel/security/apparmor ]; then mount -t securityfs securityfs /sys/kernel/security || true; fi",
  `mkdir -p "$(dirname "${staged}")"`,
  `cp /tmp/package.deb "${staged}"`,
].join("\n");

console.log("[smoke-deb-command] installing with the command the app hands over…");
const installed = inContainer(
  [
    prepare,
    command,
    'dpkg-query -W -f="INSTALLED=\\${Version} \\${db:Status-Abbrev}\\n" aslbot',
    'test -x /opt/ASLBot/aslbot && echo "EXECUTABLE=yes"',
  ].join("\n"),
);

const version = installed.match(/INSTALLED=(\S+) (\S+)/);
const checks = [
  ["the package installed and configured", version?.[2]?.startsWith("ii") === true],
  ["the app binary is in place", installed.includes("EXECUTABLE=yes")],
];

// The command this replaced. On a clean Ubuntu the dependencies are not
// present, and dpkg resolves none of them — which is why the old in-app
// installer could leave a user with a broken package.
console.log("[smoke-deb-command] control: the `dpkg -i` the app used to run…");
const control = inContainer([prepare, `dpkg -i "${staged}" || echo "DPKG_FAILED"`].join("\n"), {
  expectFailure: false,
});
checks.push([
  "`dpkg -i` alone fails where the handed-over command works",
  control.includes("DPKG_FAILED") || /dependency problems|not installed/i.test(control),
]);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? "✔" : "✖"} ${label}`);
  if (!ok) failed += 1;
}
if (failed > 0) fail(`${failed} check(s) failed`);
console.log(`[smoke-deb-command] OK — ${version[1]} installed by the command the app copies`);
