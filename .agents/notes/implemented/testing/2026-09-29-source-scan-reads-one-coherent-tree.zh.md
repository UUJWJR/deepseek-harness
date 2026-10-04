# Agent Note: 持久化源码扫描读取同一棵一致的源码树

Status: implemented

[English](2026-09-29-source-scan-reads-one-coherent-tree.md) | 中文

## 问题

`scripts/oxlint-contract.spec.ts` 与 `scripts/persistence-schema.spec.ts` 在 `thread-safe` Vitest 项目中并发运行。为了证明 Oxlint 会把每一类文件解析到其所属 tsconfig，Oxlint spec 会向真实项目目录——`packages/core/session/src`、`packages/fs/fs-observation-policy/src`、`packages/client/ui-primitives/src`，以及测试侧对应的路径——写入临时探测文件，逐一命名为 `oxlint-contract-<uuid>.ts`，并在 `finally` 中删除它们。在 `pnpm exec vitest run`（默认文件并行）下两个 spec 会重叠。

`extractPersistenceSchema` 对同一棵树进行两遍读取，而两遍读取都不拥有它发现的路径：

- `collectLogEvents` 用 glob 匹配 `packages/<group>/<pkg>/src`，并读取每一个匹配项以查找 `SessionEventMap` 声明；
- 编译器程序从 tsconfig 的 `include` glob 取得根文件名，而这些 glob 匹配的是解析那一刻磁盘上的内容，随后 TypeScript 会在整个程序构建过程中惰性读取这些根文件。

在 glob 与读取之间被删除的探测文件，会让上述任一步骤在扫描已不再拥有的路径上失败。观察到的签名是 `TS6053`，出现在 `packages/core/session/src` 下的一个探测文件上，报称该文件缺失，因为它被指定为编译根：tsconfig glob 列出了该探测文件，而 TypeScript 读取它时 Oxlint spec 已经把它删除了。随后一次 `pnpm run test` 报告了两个各自指向无关主题的失败，因为该 schema 套件的主题是整个仓库源码树。

## 决策

一条规则，一个归属地：`scripts/persistence-catalog-source.ts` 中的 `readSourceFile` 读取 glob 发现的路径，当且仅当失败的唯一解释是该文件已不存在（`ENOENT`）时返回 `undefined`，其余一切失败都重新抛出；因为文件仍在磁盘上却不可读——目录、符号链接环、权限失败——是真实故障，不能让它从扫描中静默消失。

两个读取方都使用它。

- 目录源的三个收集器（`collectLogEvents`、`collectEventEnvelopeTypes`、`collectSurfaceEventTypes`）迭代同一个生成器 `discoveredSources`，它把每个 glob 到的路径与为它读到的文本配对，并跳过已经消失的路径。
- `readSourceRoots` 读取 tsconfig 图发现的每一个根，`extractPersistenceSchema` 只把这些路径作为根文件名传入。编译器 host 的 `getSourceFile`、`fileExists` 与 `readFile` 都从这份快照作答。

把每个根读取一次、再编译这份快照，正是关闭 TS6053 窗口的原因。根集合在程序启动前就已固定，因此程序构建期间被删除的文件不可能变成缺失的根。若只是过滤一次列表、随后仍让 TypeScript 自己去读文件，窗口依然敞开，因为 TypeScript 会在整个构建期间惰性读取根文件，而在这棵树上这是数秒量级。`fileExists` 同样由快照作答，因为 TypeScript 会把 host 找不到的根报告为 TS6053，而根本不索要其文本。

因此该提取器读取的正是每次读取发生那一刻存在的文件，并发写入方既改变不了结果，也改变不了失败模式。

## 曾考虑的替代方案

**把 Oxlint 探测文件限制在临时目录中。** 否决：该 spec 的主题正是 Oxlint 把每一类真实文件——包源码、包测试、Client 聚合、CLI profile 测试、`website`——映射到其所属 tsconfig。探测文件必须存在于真实项目目录下，这一映射才可能被覆盖，因此写入方无法在不削弱该 spec 存在理由的前提下离开共享树。

**把两个 spec 文件串行化，或把整个套件串行化，使它们无法重叠。** 否决：这两个 spec 争用的是它们并不拥有的资源，而串行化只保护这一对。所有其他仓库级读取方——Oxlint 门禁、文档生成器、覆盖率插桩——读取的是同一棵树，串行开关只会掩盖「写入方把文件发布进了这棵树」这一事实。

**只在目录源容忍 `ENOENT`，不动编译器根。** 否决：它没有修复所报告的失败。目录源读取器先于 tsconfig 解析运行，因此失败所点名的探测文件在 TypeScript 列出它时早已从目录源视野中消失；只有根快照才能阻止 TS6053。

**在 `createProgram` 之前立刻按存在性过滤根列表。** 否决：先检查可用性、稍后再占用该文件，正是制造出这个竞争的形态。TypeScript 在整个构建期间读取根文件，因此某一瞬间的存在性检查对随后的读取并不成立。

**保持读取方式不变，只在树安静时才断言 schema 清单。** 否决：该提取器是一个已发布门禁的输入，其主题若取决于同时还在运行什么，就不再是对仓库持久化格式的测试。

## 后果

并发写入方不再决定该套件的结局。`pnpm exec vitest run scripts/oxlint-contract.spec.ts scripts/persistence-schema.spec.ts`——复现该签名的最小拓扑——在两个会话中修复前 11 次运行出现 3 次失败，其中凡捕获到输出的失败都指向 TS6053；快照就位后 8 次运行全部通过。

两半都由一个确定性阴性对照钉住，且各自都在其修复之前被观察到失败：

- 移除目录源的跳过逻辑后，一个 fixture 根中 `packages/domain/extension/src/probe.ts` 为悬空符号链接时，提取以 `ENOENT: no such file or directory, open '…/probe.ts'` 失败。
- 移除 `readSourceRoots` 的跳过逻辑后，喂给它一个可读路径与一个悬空符号链接的用例会为该符号链接以 `ENOENT` 失败；跳过逻辑就位时，快照恰好只包含那个可读路径。

回归覆盖：`persistence-schema.spec.ts` 新增「ignores a source file the globs matched but that is gone when it is read」（合成 fixture 根内的悬空链接，并断言真实事件仍被提取）与「compiles only the roots it read, so a root gone before compilation cannot fail the program」。

复现限制是显式的。TS6053 窗口无法在测试中仅由文件系统构造出来：`ts.parseJsonConfigFileContent` 会对每个候选做 stat 并丢弃悬空链接，因此唯一能到达该窗口的状态是「tsconfig 解析时存在、随后被删除」。要确定性地到达该状态，需要要么为读取器提供一个生产注入点，要么由屏障协调一个进程内写入方，而该提取器两者都没有；上面那个双 spec 并发拓扑就是复现方式，而按函数的阴性对照代替窗口本身。

该提取器现在会急切读取每一个被发现的根，而不再让 TypeScript 按需读取；因此同一批文件会在编译之前被多读一遍，而不是在编译期间读取。

## 相关

- 已归档的[会 spawn 进程的 Oxlint 契约用例携带 90 s 上限](../../archived/testing/2026-09-27-oxlint-contract-spawn-case-budgets.md) 界定了同一个 spec 中会 spawn 进程的用例，并记录了本改动所依赖的通道算术：`DSH_COVERAGE_TEST_TIMEOUT_MS=90000` 抬高覆盖率通道，而开发者本机的 `pnpm run test` 跑在 Vitest 默认值上。它管的是一个用例可以耗多久；本笔记管的是仓库级扫描拥有哪些文件。
- [Windows 通道的观察等待它读取的状态](2026-09-27-observation-waits-on-observed-state.zh.md) 陈述了本改动应用于共享树的规则：观察等待它读取的状态，而不是等待另一个参与者可以关闭的窗口。
- 已归档的[Web 通道断言点明其输入状态](../../archived/testing/2026-09-27-web-lane-assertions-name-their-input-state.md) 记录了同一类问题在外一层的形态：断言采样了前序动作尚未落定的状态。
