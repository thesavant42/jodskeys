# 🗝️ jodskeys

![version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![node](https://img.shields.io/badge/node-%3E%3D14.0.0-orange?style=flat-square)

> Skeleton key for unlocking JavaScript source maps — even from hostile, obfuscated, or self-signed hellscapes.

jodskeys downloads `.js` files from live websites or local sources, extracts embedded sourcemap URLs, and reconstructs the original source files into a clean folder structure for inspection, debugging, or reverse engineering.

---

## 🚀 Features

- 🔍 **URL Mode** — Crawl a live site, download all scripts, extract and restore sourcemaps
- 📁 **Local Mode** — Scan previously downloaded `.js` + `.map` files and restore sources
- 🎯 **Single Mode** — Target a single `.js` file and restore its sources
- 🔓 **Bypasses TLS validation** — Works on dev servers with self-signed or expired certs
- 🧼 **Domain-isolated output** — Keeps results clean and segregated per host
- 🛠 **Supports inline or referenced `.map` files** (skips data URIs by default)

---

## 📦 Installation

```bash
git clone https://github.com/thesavant42/jodskeys.git
cd jodskeys
npm install
npm link  # optional: enables global `jodskeys` command
```

---
### ⚠️ Chalk Compatibility
This project uses `chalk@4` for colorful CLI output. Do **not** upgrade to Chalk v5+ unless you migrate this project to ESM syntax.

---

## 🧪 Usage

### 🌐 URL Mode
Extract all sourcemaps from a live site:

```bash
jodskeys url https://example.com
```

### 💾 Local Mode
Reprocess already-downloaded scripts:

```bash
jodskeys local
```

### 🎯 Single File Mode
Target a specific `.js` file:

```bash
jodskeys single https://example.com/static/bundle.js
```

---

## 📂 Output Structure

```
output/
  example.com/
    downloaded_site/
      bundle.js
      bundle.js.map
    restored_sources/
      index.js
      utils.js
      App.vue
```

> 🔐 All domains are sandboxed in separate subfolders to prevent clobbering.

---

## 🧱 Developer Notes

### Insecure Certs?
You're covered — jodskeys:
- Ignores certificate validation by default (no flags required)
- Can crawl dev boxes, staging servers, and broken TLS hosts

### Centralized Fetch Logic
All TLS-tolerant networking is handled in:
```js
utils/fetchInsecure.js
```
Update this to modify how downloads work globally.

### Test Harness
Run a local test with a mock `.map` file:

```bash
node test/test_restoreSourcesFromMap.js
```

---

## 🧛‍♂️ Credits
**Built by [@thesavant42](https://github.com/thesavant42)** — professional red teamer, reverse engineering tactician, and ruthless debugger.

---

## 📜 License
MIT. Wield responsibly.

