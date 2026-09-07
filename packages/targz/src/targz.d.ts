export declare function pack(
  sourceDir: string,
  outputDir?: string,
): Promise<string>;
export declare function check(
  buffer: Buffer,
  expected: {
    name: string;
    version: string;
  },
): Promise<boolean>;
export declare function unpack(
  source: string | Buffer,
  expectedHash: string,
  targetDir: string,
): Promise<void>;
