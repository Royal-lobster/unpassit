import { password as clackPassword, isCancel, cancel } from "@clack/prompts";

export async function resolvePassword(
  flagValue: string | undefined,
  isTTY: boolean
): Promise<string> {
  if (flagValue) return flagValue;

  const envValue = process.env.UNPASSIT_PASSWORD;
  if (envValue) return envValue;

  if (isTTY) {
    return promptPassword();
  }

  throw new Error("No password provided. Use -p, set UNPASSIT_PASSWORD env var, or run interactively.");
}

async function promptPassword(): Promise<string> {
  const value = await clackPassword({
    message: "Enter password",
    mask: "*",
    validate(val) {
      if (!val) return "Password is required";
    },
  });

  if (isCancel(value)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  return value;
}
