# 🔓 unpassit

> Remove passwords from protected files in one command.

Supports **PDF**, **Office** (doc/docx/xls/xlsx/ppt/pptx), **ZIP**, **RAR**, and **7z**.

## Install

```bash
npm install -g unpassit
```

Or run directly with `npx`:

```bash
npx unpassit file.pdf -p mypassword
```

## Usage

### Single file

```bash
unpassit file.pdf -p mypassword
# ✅ file.pdf → file.unlocked.pdf
```

### Interactive password prompt

```bash
unpassit file.xlsx
# 🔑 Enter password: ****
# ✅ file.xlsx → file.unlocked.xlsx
```

### Environment variable

```bash
UNPASSIT_PASSWORD=mypass unpassit file.docx
```

### Batch mode

```bash
unpassit ./locked-files/ -p mypass
unpassit ./locked-files/ -p mypass -r  # recursive
```

### Custom output directory

```bash
unpassit file.pdf -p mypass -o ./unlocked/
```

## Output

Files are saved as `filename.unlocked.ext` in the same directory (or the directory specified by `-o`).

RAR files are extracted and re-archived as ZIP: `archive.rar` → `archive.unlocked.zip`.

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--password <pass>` | `-p` | Password |
| `--output <dir>` | `-o` | Output directory |
| `--recursive` | `-r` | Scan subdirectories |
| `--force` | `-f` | Overwrite existing files |
| `--quiet` | `-q` | Only print errors |

## Requirements

- Node.js >= 18
- `qpdf` for PDF files (`brew install qpdf` / `apt install qpdf`)

## License

MIT
