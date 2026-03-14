export interface Handler {
  extensions: string[];
  unlock(inputPath: string, outputPath: string, password: string): Promise<void>;
}
