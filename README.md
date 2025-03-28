## 🔑 jodskeys — Skeleton key for sourcemap extraction

jodskeys is a surgical tool for unpacking JavaScript bundles using their sourcemaps. It can restore original folder structures, infer module names, extract inline `sourcesContent`, and now — extract embedded base64 assets (images, fonts, svgs) from restored modules.

---

### 🧪 Modes of Operation

#### 1. `url`
```bash
jodskeys url https://example.com
```
- Downloads scripts from a live website.
- Resolves and downloads all `sourceMappingURL`s.
- Restores original sources and structure.

#### 2. `single`
```bash
jodskeys single path/to/bundle.js
```
- Extracts inline sourcemaps (if any) from a single JS file.
- Restores sources to an adjacent folder.

#### 3. `local` (NEW: now path-aware + asset extractor)
```bash
# Restore all downloaded domains in ./output
jodskeys local

# Restore just one specific target
jodskeys local output/example.com
```
- Recursively processes any `.js.map` or `.js` files under `downloaded_site/`
- Extracts inline sourcemaps when present
- Restores sources into `restored_sources/`
- NEW: Extracts embedded base64 assets (images/fonts) into `extracted_assets/`

---

### 📂 Output Layout

```
output/
├── example.com/
│   ├── downloaded_site/        # Raw JS + .map files
│   ├── restored_sources/       # Reconstructed original code
│   └── extracted_assets/       # Decoded assets from base64 exports
```

---

### 🧠 Notes
- Inline sourcemaps are saved as `.inline.map` and restored normally.
- Assets like `.png`, `.woff`, `.ttf`, `.svg` are decoded from strings like:
  ```js
  export default "data:image/png;base64,..."
  ```
- Extensions are correctly inferred from MIME types.
- No more `.woff.woff`, `.svg+xml`, or duplicated folders.

---

### 📦 Packaging a Release

After updating the README and verifying functionality:
1. Commit changes.
2. Tag a release:
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```
3. Optionally publish to npm or bundle as a GitHub release.

---

For usage examples, see the `examples/` directory or run with `--help`.

🔐 Happy unlocking.

