declare const __PROD__: boolean;

interface ImportMeta {
  glob(pattern: string, options?: { eager?: boolean }): Record<string, unknown>;
}
