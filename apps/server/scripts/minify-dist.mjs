import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'terser';

const distDir = path.resolve(process.cwd(), 'dist');

async function collectJavaScriptFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nestedResults = await Promise.all(entries.map(async (entry) => {
    const targetPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectJavaScriptFiles(targetPath);
    }

    return targetPath.endsWith('.js') ? [targetPath] : [];
  }));

  return nestedResults.flat();
}

async function main() {
  const distStats = await stat(distDir);

  if (!distStats.isDirectory()) {
    throw new Error('dist 目录不存在，无法执行压缩');
  }

  const jsFiles = await collectJavaScriptFiles(distDir);

  await Promise.all(jsFiles.map(async (filePath) => {
    const sourceCode = await readFile(filePath, 'utf8');
    const result = await minify(sourceCode, {
      compress: true,
      mangle: true,
      format: {
        comments: false,
      },
    });

    if (!result.code) {
      throw new Error(`压缩失败: ${filePath}`);
    }

    await writeFile(filePath, result.code, 'utf8');
  }));

  console.log(`Minified ${jsFiles.length} files in ${distDir}`);
}

void main();
