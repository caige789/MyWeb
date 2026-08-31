// Prisma 6.19.x 发布包缺失 wasm.mjs（exports 声明了但 files 漏打包，官方 bug）。
// Turbopack/Next 16 走 import 条件解析 @prisma/client/wasm -> wasm.mjs 会失败。
// 此脚本在构建前补齐该文件（CJS->ESM wrapper），npm install 重装后自动重新生效。
import { existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@prisma', 'client')
const target = join(pkgDir, 'wasm.mjs')

const wrapper = `// Patch: Prisma 6.19.x missing wasm.mjs (ESM wrapper of wasm.js)
import wasm from './wasm.js'
export const PrismaClient = wasm.PrismaClient
export default wasm
`

if (!existsSync(target)) {
  writeFileSync(target, wrapper)
  console.log('[patch-prisma-wasm] created', target)
} else {
  console.log('[patch-prisma-wasm] wasm.mjs already exists, skip')
}
