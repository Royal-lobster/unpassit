declare module "officecrypto-tool" {
  const officeCrypto: {
    decrypt(buffer: Buffer, options: { password: string }): Promise<Buffer>;
    encrypt(buffer: Buffer, options: { password: string }): Promise<Buffer>;
    isEncrypted(buffer: Buffer): boolean;
  };
  export default officeCrypto;
}

declare module "7zip-min" {
  export function unpack(
    archivePath: string,
    destPath: string,
    callback: (err: Error | null) => void
  ): void;
  export function pack(
    srcPath: string,
    archivePath: string,
    callback: (err: Error | null) => void
  ): void;
  export function cmd(
    args: string[],
    callback: (err: Error | null) => void
  ): void;
}
