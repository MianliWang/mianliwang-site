# WebGPU Roadmap - 可执行任务清单

本清单是 `docs/roadmap-webgpu.md` 的执行版，目标是把“是否引入 WebGPU”变成可度量、可回退、可验收的工程任务。

## Milestone 0 - 准入门禁（Go/No-Go）

目标：在不引入 WebGPU 的前提下，先完成性能证据采集与 Canvas2D 优化闭环。  
状态：`进行中`

- [ ] 建立统一基准场景（固定页面、固定分辨率、固定粒子密度）
- [ ] 采样 3 档设备（高性能桌面 / 普通笔记本 / 低功耗设备）
- [ ] 采样至少 2 个浏览器（Chrome + 另一主流浏览器）
- [ ] 输出 FPS / P95 帧耗时 / CPU 占用记录
- [ ] 对照准入条件产出 `Go/No-Go` 结论

验收：
- 有可追溯数据，不靠主观体感决策。
- 未达到准入条件时，不进入 WebGPU 实施。

---

## Milestone 1 - Phase A（后端抽象，仍用 Canvas2D）

目标：固定 tokens/state，先完成渲染后端抽象与 fallback 骨架。  
状态：`本轮执行`

- [x] 抽离背景 tokens 读取模块（CSS variables -> runtime tokens）
- [x] 抽离质量档位与自动降档/升档策略模块
- [x] 定义渲染后端接口（renderer contract）
- [x] 落地 Canvas2D renderer 实现（保持现有视觉表现）
- [x] 增加 WebGPU 选择逻辑与自动 fallback 骨架（默认仍 Canvas2D）
- [x] 将 `BackgroundStarfield` 改为调用统一 runtime + renderer
- [ ] 补充轻量 telemetry 输出（仅 dev）

验收：
- 行为与现有版本一致（含 reduced motion 与触屏行为）。
- backend 可切换但不会破坏页面可读性。
- fallback 失败时仍有 base + grain + canvas 背景保底。

---

## Milestone 2 - Phase B（WebGPU 最小实现）

目标：只迁移星点层，其他层保持原方案。  
状态：`未开始`

- [ ] WebGPU renderer 初始化（adapter/device/pipeline）
- [ ] WebGPU 版本星点绘制（密度、亮度、漂移、轻 twinkle）
- [ ] 与现有 quality 档位打通（粒子数 / DPR / fps cap）
- [ ] device lost 自动恢复与回退

验收：
- WebGPU 支持环境可运行，非支持环境无缝回退 Canvas2D。
- 无闪屏、无空白背景、无明显带宽抖动。

---

## Milestone 3 - 风险收敛与发布

目标：在兼容与可访问性约束下再考虑启用范围。  
状态：`未开始`

- [ ] reduced motion 下完全静态（无持续漂移/twinkle）
- [ ] 省电/低性能设备自动降级验证
- [ ] 长时运行稳定性测试（>= 20min）
- [ ] A/B 对比与默认策略决策

验收：
- 性能收益真实且稳定，维护成本可接受。
- 不引入可访问性回归或主题/路由切换闪烁。

---

## 本轮执行记录（2026-02-16）

执行范围：Milestone 1（Phase A）

- 新增背景 motion 抽象模块（tokens / quality / renderer）
- 重构 `BackgroundStarfield` 为后端可插拔实现
- 保持默认 Canvas2D，WebGPU 仅保留能力检测与 fallback 入口
- 继续遵守 `prefers-reduced-motion`、`(pointer:fine)&&(hover:hover)` 与轻量主线程约束

待补：
- dev telemetry 面板里增加背景后端与降级原因展示
