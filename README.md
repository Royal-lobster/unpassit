# unlockit

Remove passwords from protected files. Supports PDF, Office (doc/docx/xls/xlsx/ppt/pptx), ZIP, RAR, and 7z.

## Usage

```bash
npx unlockit file.pdf -p mypassword
```

### Interactive password prompt

```bash
npx unlockit file.xlsx
# Enter password: ****
```

### Environment variable

```bash
UNLOCKIT_PASSWORD=mypass npx unlockit file.docx
```

### Batch mode

```bash
npx unlockit ./locked-files/ -p mypass
npx unlockit ./locked-files/ -p mypass -r  # recursive
```

### Custom output directory

```bash
npx unlockit file.pdf -p mypass -o ./unlocked/
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
