// OpenNext 在 Windows 上打包 server function 时用 symlinkSync 重建被 tracing 的
// node_modules 符号链接条目（如 @neondatabase/serverless），普通用户无开发者模式
// 时创建目录符号链接会 EPERM（junction 需绝对路径不可靠）。此脚本把该处改为
// Windows 上直接复制（目录 cpSync / 文件 copyFileSync），其余平台保持 symlink。
// npm install 重装后自动重新生效。
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'copyTracedFiles.js')
const MARK = '/* win32-copy-patch */'
const OLD = '                symlinkSync(symlink, to);'
const NEW = `                /* win32-copy-patch */ (process.platform === "win32"
                    ? (statSync(from).isDirectory()
                        ? cpSync(from, to, { recursive: true, dereference: true })
                        : copyFileAndMakeOwnerWritable(from, to))
                    : symlinkSync(symlink, to));`

if (!existsSync(file)) {
  console.error('[patch-opennext-symlink] target not found:', file)
  process.exit(1)
}

const src = readFileSync(file, 'utf8')
if (src.includes(MARK)) {
  console.log('[patch-opennext-symlink] already patched, skip')
  process.exit(0)
}
if (!src.includes(OLD)) {
  console.error('[patch-opennext-symlink] pattern not found, OpenNext version may have changed')
  process.exit(1)
}

writeFileSync(file, src.replace(OLD, NEW))
console.log('[patch-opennext-symlink] patched', file)
