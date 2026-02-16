# WebGPU 迁移路线图（Canvas2D -> WebGPU）

## 目标与前提
- 目标：仅在 Canvas2D 背景效果无法稳定满足性能目标时，引入 WebGPU 作为渲染后端升级方案。
- 范围：优先针对背景层（blobs/starfield/grain 相关渲染），不改变现有交互信息架构与动效语义。
- 原则：同一套 design tokens 与 motion state，替换渲染后端而不是重写业务逻辑。
- 约束：必须继续遵守 `prefers-reduced-motion`、触屏降级、单一状态源与可回退策略。

---

## 1) WebGPU 准入门槛（满足后才允许引入）

WebGPU 不是默认选择，必须同时满足以下条件中的「硬条件 + 证据」：

### A. 硬条件（至少满足 2 条）
1. 在 4K（3840x2160）或等效高像素密度屏幕下，Canvas2D 背景在 60Hz 设备上长期低于 55 FPS（P95 帧时间 > 18ms）。
2. 在 120Hz/144Hz 屏幕下，Canvas2D 无法稳定达到“流畅感阈值”（P95 帧时间 > 12ms，且用户可见抖动）。
3. 背景渲染导致主线程占用持续偏高（交互期间平均 > 25%，并明显影响输入响应或滚动）。
4. 已完成 Canvas2D 优化后仍不达标（见下方“先做优化清单”）。

### B. 证据要求（必须提供）
- 至少 3 台不同档位设备（高性能桌面/普通笔记本/低功耗设备）的采样数据。
- 至少 2 种浏览器的对比（Chrome + Edge/Safari/Firefox 中可测项）。
- 固定场景回放数据（同一页面、同一粒子密度、同一分辨率）。
- 指标包含：FPS、帧时间分布（P50/P95）、CPU 占用、输入延迟体感结论。

### C. 先做优化清单（未完成前禁止引入 WebGPU）
- 限制 DPR 上限（例如 1.5~2.0）。
- 降低刷新率上限（如 60 -> 30fps 自适应）。
- 粒子/图层密度分档（High/Medium/Low）。
- 仅更新必要区域，避免全画布无差别重绘。
- 确认仅使用单一 rAF 调度，不重复监听与重复绘制。

---

## 2) 迁移路径（同 tokens/state，替换渲染后端）

### 架构原则
- 保持现有状态层不变：`motion quality`、`reduced motion`、`pointer capability`、主题 token 继续由统一 provider 管理。
- 渲染适配器化：把“渲染逻辑”抽象为后端接口，Canvas2D 与 WebGPU 实现同一接口。
- 渐进启用：默认 Canvas2D，满足能力检测才启用 WebGPU。

### 2.1 推荐模块拆分
- `lib/motion/background/state.ts`
  - 输出统一渲染输入：`time`, `pointer`, `quality`, `themeTokens`, `reducedMotion`。
- `lib/motion/background/tokens.ts`
  - 密度、亮度、速度、twinkle、blur 半径等 token（与后端无关）。
- `lib/motion/background/renderer.ts`
  - 定义接口：`init()`, `resize()`, `render(frameState)`, `dispose()`.
- `lib/motion/background/renderers/canvas2d.ts`
- `lib/motion/background/renderers/webgpu.ts`

### 2.2 运行时选择逻辑
1. 启动时检测：
   - `prefers-reduced-motion`
   - `pointer: fine` + `hover: hover`（仅影响交互增强，不阻断静态背景）
   - `navigator.gpu` 与 `adapter/device` 可用性
2. 决策优先级：
   - 若 `reduced-motion = true`：强制静态模式（不启用持续动画），后端无关。
   - 若 WebGPU 不可用：Canvas2D。
   - 若 WebGPU 可用但设备/省电策略判定为保守：仍可继续 Canvas2D Low 档。
3. 运行中监测帧耗时：
   - `Auto` 质量模式下可在后端内降档（粒子数/DPR/FPS），必要时从 WebGPU 回退 Canvas2D。

### 2.3 回退策略（必须）
- 初始化失败：WebGPU -> Canvas2D（一次切换，写入调试日志）。
- 运行中设备丢失（device lost）：
  - 立即降为静态背景，尝试一次重建；
  - 重建失败则回退 Canvas2D。
- 任意回退都不得导致空白背景或闪烁；grain/base gradient 始终保底可见。

### 2.4 迁移阶段建议
1. Phase A：整理 tokens/state/renderer 接口，但继续使用 Canvas2D。
2. Phase B：实现 WebGPU 最小版本（仅星点层），其余图层仍 Canvas2D。
3. Phase C：统一质量分档与自动降级，打通 telemetry。
4. Phase D：A/B 验证后再考虑默认启用范围。

---

## 3) 风险与测试策略

### 3.1 浏览器支持与兼容
- 支持策略：`progressive enhancement`（增强而非依赖）。
- 兼容基线：
  - 支持 WebGPU 的浏览器：可尝试 WebGPU 后端。
  - 不支持或策略禁用：始终 Canvas2D。
- 禁止把核心信息可读性绑定到 WebGPU；WebGPU 仅提供“更稳帧/更低 CPU”。

### 3.2 reduced motion / 省电模式行为
- `prefers-reduced-motion: reduce`：
  - 禁止持续漂移/twinkle/rAF 驱动动画；
  - 背景退化为静态层（base + grain + 可选静态星点）。
- 省电模式（或检测到帧耗时偏高）：
  - 自动降低密度、DPR、刷新率；
  - 达到阈值后可停用动态层，仅保留静态背景。

### 3.3 主要风险
- WebGPU 可用性碎片化（不同浏览器/系统策略差异）。
- 设备/驱动问题导致初始化失败或 device lost。
- 调试复杂度上升（shader 与管线调试成本高于 Canvas2D）。
- 双后端维护成本增加（token 同步、视觉一致性校验）。

### 3.4 测试清单（上线前必须完成）
- 功能正确性：
  - WebGPU 可用时正确启用；不可用时无缝 fallback。
  - 切主题、切语言、路由跳转后背景状态连续，无闪屏。
- 性能测试：
  - 三档设备 + 两类分辨率（1080p/4K）+ 60Hz/120Hz 场景。
  - 对比 Canvas2D 与 WebGPU：FPS、P95 帧时间、CPU 占用。
- 可访问性：
  - `prefers-reduced-motion` 下无持续运动。
  - 键盘导航与内容可读性不受背景层影响。
- 稳定性：
  - 模拟 `device lost`，验证自动回退与恢复流程。
  - 长时间运行（>= 20 分钟）无明显内存增长与帧率漂移。

---

## 决策模板（是否进入 WebGPU 实施）
- 结论：`Go` / `No-Go`
- 触发条件命中：列出满足的硬条件编号
- 基准数据：设备/浏览器/指标摘要
- 风险接受说明：兼容性、维护成本、回退完备性
- 实施范围：仅背景层 / 包含更多图层（必须分阶段）

> 默认建议：在当前项目阶段优先继续优化 Canvas2D；只有当性能证据明确且持续不达标时，才进入 WebGPU Phase B。
