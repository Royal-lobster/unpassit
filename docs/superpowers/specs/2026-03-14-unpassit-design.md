# unpassit — Design Spec

## Overview

`unpassit` is a lightweight CLI utility (distributed via npm/npx) that removes known passwords from protected files. It auto-detects file format by extension, supports batch processing, and minimizes system dependencies.

**Usage:** `npx unpassit file.pdf -p mypass`

## Supported Formats

| Format | Extensions | Library | System Deps |
|--------|-----------|---------|-------------|
| PDF | `.pdf` | `node-qpdf2` | `qpdf` (system binary) |
| Office (modern) | `.docx`, `.xlsx`, `.pptx` | `officecrypto-tool` | None (pure JS) |
| Office (legacy) | `.doc`, `.xls`, `.ppt` | `officecrypto-tool` | None (pure JS) |
| ZIP | `.zip` | `unzipper` + `archiver` | None (pure JS) |
| RAR | `.rar` | `node-unrar-js` | None (WASM) |
| 7z | `.7z` | `7zip-min` | None (bundles 7za native binary) |

### System Dependency Notes

- **PDF:** Requires `qpdf` installed on the system (`brew install qpdf` / `apt install qpdf`). The CLI will check for `qpdf` availability and print install instructions if missing.
- **7z:** `7zip-min` bundles a platform-specific `7za` binary. No manual install needed, but the package size is larger and won't work in environments that restrict native binary execution.
- **RAR:** Output is extracted to a directory (`file.unlocked/`) since RAR is a proprietary format and cannot be re-archived without the WinRAR SDK. Alternatively, extracted contents can be re-archived as a ZIP (`file.unlocked.zip`) — see Output Naming.

## CLI Interface

### Single File

```bash
npx unpassit file.pdf -p mypass
```

### Batch Mode (directory)

```bash
npx unpassit ./locked-files/ -p mypass
```

### Interactive Password Prompt

```bash
npx unpassit file.xlsx
# Prompts: Enter password: ****
```

### Environment Variable

```bash
UNPASSIT_PASSWORD=mypass npx unpassit file.docx
```

## Password Resolution Order

1. `-p` / `--password` CLI flag
2. `UNPASSIT_PASSWORD` environment variable
3. Interactive prompt via `readline` (password is hidden)

If none provided and stdin is not a TTY (e.g., piped), exit with an error.

**Security note:** When using `-p`, the password is visible in the system process list. Prefer the environment variable or interactive prompt for sensitive passwords.

## Output Naming

- Input: `report.pdf` → Output: `report.unlocked.pdf`
- Output is written to the same directory as the source file, or to the directory specified by `--output`.
- If the output file already exists, skip and warn unless `--force` is specified.
- **RAR exception:** Since RAR cannot be re-archived, RAR files are extracted to a ZIP: `archive.rar` → `archive.unlocked.zip`.

## Batch Mode Behavior

- Accepts a directory path as input.
- Scans for files with supported extensions (non-recursive by default).
- `--recursive` / `-r` flag to scan subdirectories.
- Processes each file **sequentially** to avoid memory issues with WASM-based handlers.
- Progress display: `[3/10] Unlocking report.pdf...`
- Summary at the end: `Done. 8 unlocked, 2 failed.`
- Failures do not halt the batch.

## Architecture

```
src/
  cli.ts          — CLI entry point, arg parsing (commander), password resolution
  detector.ts     — File type detection by extension
  handlers/
    pdf.ts        — PDF decryption via node-qpdf2
    office.ts     — Office file decryption via officecrypto-tool
    zip.ts        — ZIP decryption via unzipper (extract to tmp dir + re-archive via archiver)
    rar.ts        — RAR extraction via node-unrar-js (output as ZIP)
    sevenz.ts     — 7z decryption via 7zip-min
    index.ts      — Handler registry mapping extensions to handlers
  utils.ts        — Output path generation, progress logging, temp dir management
```

### Handler Interface

Each handler implements:

```typescript
interface Handler {
  extensions: string[];
  unlock(inputPath: string, outputPath: string, password: string): Promise<void>;
}
```

### Detection Flow

1. Read file extension.
2. Look up handler in registry.
3. If no handler found, print unsupported format error and skip.

### Temp Directory Strategy (ZIP/RAR handlers)

- Create a temp directory via `fs.mkdtemp(path.join(os.tmpdir(), 'unpassit-'))`.
- Extract files into the temp directory.
- Re-archive (as ZIP) without password.
- Clean up the temp directory in a `finally` block, even on failure.

## Dependencies

### Runtime

- `commander` — CLI argument parsing
- `node-qpdf2` — PDF decryption (requires system `qpdf`)
- `officecrypto-tool` — Office file decryption (pure JS)
- `unzipper` — ZIP password extraction (pure JS)
- `archiver` — Re-archive extracted ZIP/RAR files without password
- `node-unrar-js` — RAR decryption (Emscripten/WASM)
- `7zip-min` — 7z decryption (bundles 7za binary)

### Dev

- `typescript`
- `tsup` — Bundling
- `@types/node`

## Tech Stack

- **Language:** TypeScript
- **Target:** Node.js >= 18
- **Module system:** ESM
- **Bundler:** tsup
- **Package bin:** `#!/usr/bin/env node` pointing to `dist/cli.js`

## Error Handling

- Wrong password → `Error: Incorrect password for file.pdf`
- Unsupported format → `Error: Unsupported file format ".abc"`
- File not found → `Error: File not found: path/to/file`
- Already unlocked (no password) → `Skipped: file.pdf is not password-protected`
- Output exists → `Skipped: report.unlocked.pdf already exists (use --force to overwrite)`
- Missing system dep → `Error: qpdf is required for PDF files. Install with: brew install qpdf`

## Exit Codes

- `0` — All files unlocked successfully
- `1` — Some files failed (partial success in batch mode)
- `2` — Fatal error (bad arguments, no files found, missing password)

## Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--password <pass>` | `-p` | Password to use |
| `--output <dir>` | `-o` | Output directory (default: same as source) |
| `--recursive` | `-r` | Scan subdirectories in batch mode |
| `--force` | `-f` | Overwrite existing output files |
| `--quiet` | `-q` | Suppress progress output, only print errors |
| `--version` | `-V` | Print version |
| `--help` | `-h` | Print help |
