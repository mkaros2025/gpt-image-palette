import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';

export type FileStore = ReturnType<typeof createFileStore>;

export function createFileStore(baseDir: string) {
  async function ensureParent(relativePath: string) {
    await mkdir(dirname(resolvePath(relativePath)), { recursive: true });
  }

  function resolvePath(relativePath: string) {
    return join(baseDir, relativePath);
  }

  function toPublicUrl(relativePath: string) {
    return `/data/${relativePath.split(sep).join('/')}`;
  }

  return {
    baseDir,
    resolvePath,
    toPublicUrl,
    async writeFile(relativePath: string, bytes: Buffer) {
      await ensureParent(relativePath);
      await writeFile(resolvePath(relativePath), bytes);
    },
    async readFile(relativePath: string) {
      return readFile(resolvePath(relativePath));
    },
    async exists(relativePath: string) {
      try {
        await stat(resolvePath(relativePath));
        return true;
      } catch {
        return false;
      }
    },
    async removeFile(relativePath: string) {
      try {
        await rm(resolvePath(relativePath));
      } catch {
        // Ignore missing files.
      }
    },
    joinRelative(...parts: string[]) {
      return posix.join(...parts);
    },
  };
}
