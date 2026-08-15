# Agent Note: EasyWork 技能迁移至 DSH 用户技能根

Status: implemented

[English](2026-08-15-easywork-skills-migration.md) | 中文

## 问题

EasyWork 是一个独立的单用户 React/Express/SQLite 应用,其可复用的业务能力——11 个报告/数据写作技能、一个共享 `references/` 库和 22 篇设计 ADR——需要落地到 DeepSeek Harness。移植必须跟踪上游 `deepseek-ai/deepseek-harness` 仓库,使后续上游更新能干净合并而不覆盖二次开发内容。

## 决策

在上游分叉上跟踪:`origin` 为 `UUJWJR/deepseek-harness`,`upstream` 为 `deepseek-ai/deepseek-harness`;`master` 保持为上游镜像,移植工作在 `easywork` 分支上进行,以 `git fetch upstream && git merge upstream/master`(merge-forward,不 force)同步。决策记录使用 Agent Notes,而非新建 `docs/adr/` 目录。

将技能安装到用户技能根 `~/.dsh/skills`(rank 400),而不是提交到仓库。11 个技能目录与共享的 `references/` 目录一起复制;`references/` 作为各技能目录的兄弟目录存在,因为每个技能正文都以 `../references/` 引用它。

只修改会出错的部分:写死的 `.claude/skills/…` 与 `{skillDir}`/`{projectDir}` 绝对路径改为 `{baseDir}` 相对的兄弟路径(例如 `{projectDir}/.claude/skills/vocab-update/scripts/vocab-loader.py` 改为 `{baseDir}/../vocab-update/scripts/vocab-loader.py`)。Claude Code 的 `compatibility:` frontmatter 与正文工具名(`Read`/`Write`/`Edit`/`Agent`/`Glob`/`Grep`)原样保留,由模型宽松映射。

宿主 `python3` shim 已损坏(Xcode 加载器错误),故将 `python3` 符号链接到 Homebrew `python3.12`,后者已带 `yaml`、`markdown`、`openpyxl`。

## 曾考虑的替代方案

**将技能作为仓库 bundle 提交。** 否决:M1 是零代码运行时迁移;技能不入库可让上游合并无冲突,并把 bundle 决策推迟到需要分发时。

**中度或全量重写正文为 DSH 工具语义。** 否决:技能正文是 prompt 散文,模型会宽松映射;提前翻译 `Agent`→`subagent` 有引入错误的风险。改为冒烟驱动修复。

**将 `easywork` 分支 rebase 到 `upstream/master`。** 否决:重写共享分支需要 force push,且违背仓库文档化的 merge-forward 约定。

**在 `docs/adr/` 下记录决策。** 否决:仓库无此目录;按仓库"一个事实一个家"规则,rationale 归 Agent Notes。

## 后果

11 个技能立即被运行中的 DSH 技能目录发现,确定性 Python 管线(`data-to-md/convert.py`、`report-publish/summarize.py`、`report-publish/slice-ref.py`)在迁移后的路径下端到端跑通。指南所写"12 个技能"实为 11 个加 `references/` 库,且没有任何技能内嵌 EasyWork `/api/` 调用,故该移植顾虑不成立。report-publish 的 `{tmpDir}` 公式(`{baseDir}/../../../tmp/`)落在系统临时目录(`/tmp/report-publish-…`)而非项目临时目录——已记录的漂移,尚未修改。全链路模型驱动的简报模式已跑通:模型经 `skill` 工具加载 report-publish,从样例 CSV 端到端产出简报 HTML(`sample-text.html`,47 KB)。
