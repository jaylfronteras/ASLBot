import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLOUDFLARED_ASSETS,
  CLOUDFLARED_VERSION,
  executableTarget,
} from "./prepare-cloudflared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.resolve(process.argv[2] ?? path.join(root, "release"));

function fail(message) {
  throw new Error(`[verify-linux-package] ${message}`);
}

function exactlyOne(suffix) {
  const matches = readdirSync(releaseDir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(releaseDir, name));
  if (matches.length !== 1) fail(`expected exactly one ${suffix} artifact, found ${matches.length}`);
  return matches[0];
}

function requireFile(file) {
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) fail(`missing file: ${file}`);
}

function requireExecutable(file) {
  requireFile(file);
  try {
    accessSync(file, constants.X_OK);
  } catch {
    fail(`not executable: ${file}`);
  }
}

// electron-updater picks its installer from resources/package-type: present
// and reading "deb" routes to DebUpdater, absent falls back to AppImageUpdater.
// electron/updater.mjs reads the same marker to decide whether the update is
// applied in place or handed to the system package manager. If packaging ever
// puts the marker in both artifacts (or neither), that routing silently
// inverts, so pin it here where both trees are already extracted.
function requirePackageType(resources, label, expected) {
  const marker = path.join(resources, "package-type");
  const found = statSync(marker, { throwIfNoEntry: false })?.isFile()
    ? readFileSync(marker, "utf8").trim()
    : null;
  if (found !== expected) {
    fail(
      `${label} package-type marker is ${JSON.stringify(found)}, expected ${JSON.stringify(expected)}`,
    );
  }
}

function requireUpdaterTarget(resources, label) {
  const updateFile = path.join(resources, "app-update.yml");
  requireFile(updateFile);
  const update = readFileSync(updateFile, "utf8");
  if (!/^owner: jaylfronteras$/m.test(update) || !/^repo: ASLBot$/m.test(update)) {
    fail(`${label} app-update.yml does not point at jaylfronteras/ASLBot`);
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function requireRegularMode(file, mode) {
  const details = lstatSync(file, { throwIfNoEntry: false });
  if (!details?.isFile() || details.isSymbolicLink()) fail(`expected a regular file: ${file}`);
  if ((details.mode & 0o777) !== mode) {
    fail(`expected mode ${mode.toString(8)} for ${file}, found ${(details.mode & 0o777).toString(8)}`);
  }
}

function requireDirectoryMode(directory, mode) {
  const details = lstatSync(directory, { throwIfNoEntry: false });
  if (!details?.isDirectory() || details.isSymbolicLink()) {
    fail(`expected a real directory: ${directory}`);
  }
  if ((details.mode & 0o777) !== mode) {
    fail(
      `expected mode ${mode.toString(8)} for ${directory}, found ${(details.mode & 0o777).toString(8)}`,
    );
  }
}

function requireExactEntries(directory, expected) {
  const actual = readdirSync(directory).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${directory} entries differ: expected ${wanted.join(", ")}; found ${actual.join(", ")}`);
  }
}

function requireContained(root, target) {
  const canonicalRoot = realpathSync(root);
  const canonicalTarget = realpathSync(target);
  if (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`)) {
    fail(`${target} resolves outside ${root}`);
  }
}

function verifyCloudflaredResources(resources, label, { directoryMode = 0o755 } = {}) {
  const cloudflaredRoot = path.join(resources, "cloudflared");
  const executable = path.join(cloudflaredRoot, "cloudflared");
  requireDirectoryMode(cloudflaredRoot, directoryMode);
  requireExactEntries(cloudflaredRoot, ["cloudflared"]);
  requireContained(resources, cloudflaredRoot);
  requireRegularMode(executable, 0o755);
  requireContained(cloudflaredRoot, executable);

  const expectedHash = CLOUDFLARED_ASSETS["linux-x64"].binarySha256;
  const actualHash = sha256(executable);
  if (actualHash !== expectedHash) {
    fail(`${label} has the wrong hash for cloudflared: ${actualHash}`);
  }
  if (executableTarget(readFileSync(executable)) !== "linux-x64") {
    fail(`${label} cloudflared does not contain the reviewed Linux x64 executable`);
  }
  const version = execFileSync(executable, ["version"], {
    encoding: "utf8",
    timeout: 5_000,
  }).trim();
  if (!version.startsWith(`cloudflared version ${CLOUDFLARED_VERSION} `)) {
    fail(`${label} cloudflared version is ${JSON.stringify(version)}`);
  }

  const licenses = path.join(resources, "licenses");
  requireDirectoryMode(licenses, directoryMode);
  for (const name of ["cloudflared-LICENSE.txt", "cloudflared-README.md"]) {
    requireRegularMode(path.join(licenses, name), 0o644);
    requireContained(licenses, path.join(licenses, name));
  }
  if (sha256(path.join(licenses, "cloudflared-LICENSE.txt")) !== sha256(path.join(root, "LICENSE"))) {
    fail(`${label} cloudflared license text differs from the reviewed Apache 2.0 text`);
  }
  if (
    sha256(path.join(licenses, "cloudflared-README.md")) !==
    sha256(path.join(root, "third_party", "cloudflared", "README.md"))
  ) {
    fail(`${label} cloudflared release provenance differs from the reviewed record`);
  }

  return actualHash;
}

const appImage = exactlyOne(".AppImage");
const deb = exactlyOne(".deb");
const unpacked = path.join(releaseDir, "linux-unpacked");
const executable = path.join(unpacked, "aslbot");
const resources = path.join(unpacked, "resources");

requireExecutable(appImage);
requireExecutable(executable);
requireDirectoryMode(unpacked, 0o755);
for (const relative of ["app.asar", "ui/index.html", "server/index.js"]) {
  requireFile(path.join(resources, relative));
}
for (const forbidden of ["speech-helper", "cua-driver", "cua-sdk"]) {
  if (statSync(path.join(resources, forbidden), { throwIfNoEntry: false })) {
    fail(`unsupported Linux resource was bundled: ${forbidden}`);
  }
}
if (statSync(path.join(resources, "cua-linux-x64"), { throwIfNoEntry: false })) {
  fail("ASLBot packages must not include a computer-use runtime");
}
const unpackedCloudflaredHash = verifyCloudflaredResources(resources, "linux-unpacked");
requireUpdaterTarget(resources, "linux-unpacked");

const fields = execFileSync(
  "dpkg-deb",
  ["--field", deb, "Package", "Version", "Architecture", "Maintainer", "Section", "Priority"],
  { encoding: "utf8" },
);
for (const expected of [
  "Package: aslbot",
  "Architecture: amd64",
  "Maintainer: Jejomar Fronteras",
  "Section: utils",
  "Priority: optional",
]) {
  if (!fields.includes(expected)) fail(`DEB metadata is missing ${JSON.stringify(expected)}`);
}

const extracted = mkdtempSync(path.join(tmpdir(), "jlfbot-deb-verify-"));
try {
  execFileSync("dpkg-deb", ["--extract", deb, extracted]);
  const debAppRoot = path.join(extracted, "opt", "ASLBot");
  requireDirectoryMode(debAppRoot, 0o755);
  const debResources = path.join(debAppRoot, "resources");
  // Routes the in-app updater to the package-manager hand-off.
  requirePackageType(debResources, "DEB", "deb");
  requireUpdaterTarget(debResources, "DEB");
  if (statSync(path.join(debResources, "cua-linux-x64"), { throwIfNoEntry: false })) {
    fail("ASLBot packages must not include a computer-use runtime");
  }
  const debCloudflaredHash = verifyCloudflaredResources(debResources, "DEB");
  if (debCloudflaredHash !== unpackedCloudflaredHash) {
    fail(`DEB and linux-unpacked cloudflared hashes differ`);
  }
  const desktopFile = path.join(
    extracted,
    "usr",
    "share",
    "applications",
    "com.agilesolutionlabs.aslbot.desktop",
  );
  const scalableIcon = path.join(
    extracted,
    "usr",
    "share",
    "icons",
    "hicolor",
    "scalable",
    "apps",
    "aslbot.svg",
  );
  requireFile(desktopFile);
  requireFile(scalableIcon);
  const desktop = readFileSync(desktopFile, "utf8");
  for (const expected of [
    "Name=ASLBot",
    "Exec=/opt/ASLBot/aslbot %U",
    "Icon=aslbot",
    "StartupWMClass=com.agilesolutionlabs.aslbot",
    "Categories=Utility;",
  ]) {
    if (!desktop.includes(expected)) fail(`desktop entry is missing ${JSON.stringify(expected)}`);
  }
  execFileSync("desktop-file-validate", [desktopFile], { stdio: "inherit" });
} finally {
  rmSync(extracted, { recursive: true, force: true });
}

const appImageExtracted = mkdtempSync(path.join(tmpdir(), "jlfbot-appimage-verify-"));
try {
  const offset = execFileSync(appImage, ["--appimage-offset"], {
    encoding: "utf8",
    timeout: 10_000,
  }).trim();
  if (!/^\d+$/.test(offset)) fail(`AppImage returned an invalid SquashFS offset: ${offset}`);
  const squashRoot = path.join(appImageExtracted, "squashfs-root");
  execFileSync(
    "unsquashfs",
    ["-no-progress", "-offset", offset, "-d", squashRoot, appImage],
    { stdio: ["ignore", "ignore", "inherit"], timeout: 60_000 },
  );
  const appImageDirectoryMode = lstatSync(squashRoot).mode & 0o777;
  if (![0o755, 0o775].includes(appImageDirectoryMode)) {
    fail(
      `expected AppImage directory mode 755 or 775 for ${squashRoot}, found ${appImageDirectoryMode.toString(8)}`,
    );
  }
  const appImageResources = path.join(squashRoot, "resources");
  // No marker: the AppImage keeps the in-place restart-to-update path.
  requirePackageType(appImageResources, "AppImage", null);
  requireUpdaterTarget(appImageResources, "AppImage");
  // Depending on the pinned appimagetool runtime, SquashFS directories are
  // emitted as root:root 0755 or 0775. Require one mode consistently across
  // the reviewed resource tree. The app never executes through that path:
  // Electron stages and re-hashes the two pinned binaries into a fresh 0700
  // directory first. The AppImage smoke below proves that packaged path,
  // while this extraction verifies inputs.
  if (statSync(path.join(appImageResources, "cua-linux-x64"), { throwIfNoEntry: false })) {
    fail("ASLBot packages must not include a computer-use runtime");
  }
  const appImageCloudflaredHash = verifyCloudflaredResources(appImageResources, "AppImage", {
    directoryMode: appImageDirectoryMode,
  });
  if (appImageCloudflaredHash !== unpackedCloudflaredHash) {
    fail(`AppImage and linux-unpacked cloudflared hashes differ`);
  }
} finally {
  rmSync(appImageExtracted, { recursive: true, force: true });
}

console.log(`[verify-linux-package] OK\n- ${path.basename(appImage)}\n- ${path.basename(deb)}`);
