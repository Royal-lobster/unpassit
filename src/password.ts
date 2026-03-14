export async function resolvePassword(
  flagValue: string | undefined,
  isTTY: boolean
): Promise<string> {
  if (flagValue) return flagValue;

  const envValue = process.env.UNLOCKIT_PASSWORD;
  if (envValue) return envValue;

  if (isTTY) {
    return promptPassword();
  }

  throw new Error("No password provided. Use -p, UNLOCKIT_PASSWORD env var, or run interactively.");
}

function promptPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write("Enter password: ");

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = "";
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        stdin.pause();
        process.stderr.write("\n");
        resolve(password);
      } else if (char === "\u0003") {
        // Ctrl+C
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.pause();
        reject(new Error("Cancelled"));
      } else if (char === "\u007F" || char === "\b") {
        // Backspace
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    };

    stdin.on("data", onData);
  });
}
