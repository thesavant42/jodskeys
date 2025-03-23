
# 🔑 jodskeys

![version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![node](https://img.shields.io/badge/node-%3E%3D14.0.0-orange?style=flat-square)

**jodskeys** is a skeleton key for unlocking minified JavaScript bundles by extracting and restoring source files from `.map` files.

---

## 📦 Installation

```bash
npm install -g .
```

> From inside the project directory.

### ⚠️ Chalk Compatibility
This project uses `chalk@4` for colorful CLI output. Do **not** upgrade to Chalk v5+ unless you migrate this project to ESM syntax.

---

## 🚀 Usage

```bash
jodskeys <mode> [options]
```

### Modes

#### `local`
Scans a directory for `.map` files and restores embedded source files.

```bash
jodskeys local ./dist             # non-recursive
jodskeys local ./dist --recursive  # recurse into subdirectories
```

#### `single`
Restores sources from a single `.map` file.

```bash
jodskeys single ./main.js.map
```

#### `url`
Fetches a webpage, downloads all linked JavaScript files, finds their source maps, downloads them, and restores the sources.

```bash
jodskeys url https://target.site
```

---

## 📂 Output

- Restored sources: `restored_sources/`
- Downloaded files: `downloaded_site/`
- Logs: `logs/jodskeys-YYYY-MM-DD_HHMMSS.log`

---

## 🛠 Features

- Recursive `.map` file extraction
- Source path sanitization
- Colorful CLI + log file output
- Easy to extend with new modes

---

## 🧙 Author
**savant42** — inspired by Jod’s skeleton key from *Skeleton Crew*.

---

## 🪪 License
MIT

---

## 🌑 GitHub Preview

> Want to show this off in style? Use a dark-mode terminal screenshot or generate a badge using [shields.io](https://shields.io/) to match your repo's vibe.
