# Content Workflow (Obsidian-Friendly)

## Goal
- Keep writing content in `content/writing/*.mdx`.
- Keep Projects/Toolbox primary source in `messages/en.json` and `messages/zh.json`.
- Keep interaction/runtime data in Upstash or database services.

## Recommended Vault Setup
- Option 1: Open the repo root as an Obsidian vault.
- Option 2: Open only `content/` as a vault if you want a narrow writing workspace.

## Add A New Writing Article
1. Create `content/writing/<slug>.en.mdx`.
2. Create `content/writing/<slug>.zh.mdx` with the same slug.
3. Add frontmatter:
   - `title` (required)
   - `date` (optional, must be parseable when present)
   - `summary` / `tags` / `eyebrow` (optional)
4. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`

## Add Or Edit A Project (Current Primary Path)
1. Edit `messages/en.json` -> `Projects.items`.
2. Edit `messages/zh.json` -> `Projects.items`.
3. Keep the same `slug` in EN/ZH.
4. Run `pnpm build` to validate schema + slug alignment.

## Add Or Edit A Toolbox Item (Current Primary Path)
1. Edit `messages/en.json` -> `Toolbox.items`.
2. Edit `messages/zh.json` -> `Toolbox.items`.
3. Keep the same `slug` in EN/ZH.
4. Run `pnpm build`.

## Optional Overlay (Future-Proof, Not Required)
- You can place locale files in:
  - `content/projects/*.en.json` + `*.zh.json`
  - `content/toolbox/*.en.json` + `*.zh.json`
- Runtime merge rule: same slug in overlay overrides `messages` item.
- Build validation will check schema and EN/ZH slug alignment when overlay files exist.

## Library Link List
- Keep reading/slides link lists under `content/library/`.
- Example: `content/library/reading.json`.
- This is only a catalog file in current phase, not an upload backend.

## Obsidian Git / CLI Push
- Obsidian Git plugin:
  1. Commit from Obsidian.
  2. Push to GitHub.
- CLI alternative:
  1. `git add .`
  2. `git commit -m "content: update writing"`
  3. `git push`

## Gitignore Recommendation
- Ignore personal Obsidian workspace settings:
  - `.obsidian/`

---

# 内容维护工作流（Obsidian 友好）

## 目标
- 写作内容放在 `content/writing/*.mdx`。
- Projects / Toolbox 的主数据仍在 `messages/en.json` 与 `messages/zh.json`。
- 交互数据继续走 Upstash 或数据库服务。

## 推荐 Vault 方式
- 方式 A：把仓库根目录作为 Obsidian vault。
- 方式 B：只把 `content/` 作为 vault，写作更聚焦。

## 新增一篇文章
1. 新建 `content/writing/<slug>.en.mdx`。
2. 新建同 slug 的 `content/writing/<slug>.zh.mdx`。
3. frontmatter 至少包含：
   - `title`（必填）
   - `date`（可选，但若填写需可解析）
   - `summary` / `tags` / `eyebrow`（可选）
4. 运行：
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`

## 新增或修改项目（当前主入口）
1. 修改 `messages/en.json` -> `Projects.items`。
2. 修改 `messages/zh.json` -> `Projects.items`。
3. EN/ZH 使用同一个 `slug`。
4. 运行 `pnpm build` 做 schema 与 slug 对齐校验。

## 新增或修改工具（当前主入口）
1. 修改 `messages/en.json` -> `Toolbox.items`。
2. 修改 `messages/zh.json` -> `Toolbox.items`。
3. EN/ZH 使用同一个 `slug`。
4. 运行 `pnpm build`。

## 可选 Overlay（为未来做准备，不强制）
- 可在以下目录新增本地化文件：
  - `content/projects/*.en.json` + `*.zh.json`
  - `content/toolbox/*.en.json` + `*.zh.json`
- 运行时合并规则：同 slug 时，overlay 覆盖 messages。
- 若存在 overlay，构建校验会检查 schema 与 EN/ZH slug 对齐。

## Reading/Slides 清单
- 链接清单放在 `content/library/`。
- 示例：`content/library/reading.json`。
- 当前阶段仅做“清单”，不做上传后台。

## 用 Obsidian Git 或命令行推送
- Obsidian Git 插件：
  1. 在 Obsidian 内提交。
  2. 直接推送到 GitHub。
- 命令行：
  1. `git add .`
  2. `git commit -m "content: update writing"`
  3. `git push`

## Gitignore 建议
- 建议忽略个人 Obsidian 工作区配置：
  - `.obsidian/`
