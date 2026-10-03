import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/* ────────────────────────────────────────────────────────────────────────
 *  GitHub Pages 子路径配置
 *
 *  站点会部署在   https://<用户名>.github.io/<仓库名>/
 *  所以资源必须从 /<仓库名>/ 加载，而不是从 / 加载，否则会出现 404。
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  用 GitHub Actions 部署：这里什么都不用改。                      │
 *  │  .github/workflows/deploy.yml 会自动把 VITE_BASE 设成           │
 *  │  /<当前仓库名>/，仓库名不会被写死。                              │
 *  │                                                                  │
 *  │  手动构建 dist/ 再上传：把下面 REPO_NAME 改成你的仓库名即可。    │
 *  └──────────────────────────────────────────────────────────────────┘
 * ──────────────────────────────────────────────────────────────────────── */

/** ← 只有手动构建时才需要改这一行。留空表示部署在根路径（本地开发用）。 */
const REPO_NAME = ''

// 优先级：CI 传入的环境变量 > REPO_NAME > 根路径
const base = process.env.VITE_BASE ?? (REPO_NAME ? `/${REPO_NAME}/` : '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [vue()],
})
