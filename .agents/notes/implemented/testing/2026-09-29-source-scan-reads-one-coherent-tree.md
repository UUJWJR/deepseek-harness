# Agent Note: The persistence source scan reads one coherent tree

Status: implemented

English | [中文](2026-09-29-source-scan-reads-one-coherent-tree.zh.md)

## Problem

`scripts/oxlint-contract.spec.ts` and `scripts/persistence-schema.spec.ts` run concurrently in the `thread-safe` Vitest project. To prove that Oxlint resolves each file class to its owning tsconfig, the Oxlint spec writes temporary probe files into real project directories — `packages/core/session/src`, `packages/fs/fs-observation-policy/src`, and `packages/client/ui-primitives/src`, plus their test-side counterparts — names each probe `oxlint-contract-<uuid>.ts`, and removes them in a `finally`. Under `pnpm exec vitest run` (default file parallelism) the two specs overlap.

`extractPersistenceSchema` reads the same tree twice over, and neither read owned the paths it found:

- `collectLogEvents` globs `packages/<group>/<pkg>/src` and reads every match to find `SessionEventMap` declarations;
- the compiler program takes its root names from the tsconfig `include` globs, which match whatever is on disk at parse time, and TypeScript reads those roots lazily across the whole program build.

A probe removed between a glob and the read made either step fail on a path the scan no longer owned. The observed signature was `TS6053` for a probe under `packages/core/session/src`, reporting that the file was missing because it had been specified as a compilation root: the tsconfig globs listed the probe, and TypeScript read it after the Oxlint spec had deleted it. A `pnpm run test` run then reported two failures that named unrelated subjects, because the schema suite's subject is the whole repository source tree.

## Decision

One rule, one home: `readSourceFile` in `scripts/persistence-catalog-source.ts` reads a path the globs discovered and returns `undefined` when the only explanation for the failure is that the file is gone (`ENOENT`), rethrowing every other failure, because a file that is still on disk but unreadable — a directory, a symlink loop, a permission failure — is a real fault that must not leave the scan silently.

Both readers use it.

- The catalog's three collectors (`collectLogEvents`, `collectEventEnvelopeTypes`, `collectSurfaceEventTypes`) iterate one generator, `discoveredSources`, which pairs each globbed path with the text read for it and skips a path that is already gone.
- `readSourceRoots` reads every root the tsconfig graph discovered, and `extractPersistenceSchema` passes only those paths as root names. The compiler host answers `getSourceFile`, `fileExists`, and `readFile` from that snapshot.

Reading every root once and compiling that snapshot is what closes the TS6053 window. The root set is fixed before the program starts, so a file removed during program construction cannot become a missing root. Filtering the list once and then letting TypeScript read the files would leave the window open, because TypeScript reads roots lazily for the whole build, which is seconds on this tree. `fileExists` is answered from the snapshot as well because TypeScript reports a root its host cannot find as TS6053 without ever asking for the text.

The extraction therefore reads exactly the files present when each read happened, and a concurrent writer changes neither the result nor the failure mode.

## Alternatives considered

**Confine the Oxlint probes to a scratch directory.** Rejected: the spec's subject is that Oxlint maps each real file class — package source, package test, the Client aggregate, the CLI profile tests, `website` — to its owning tsconfig. A probe has to exist under the real project directory for that mapping to be exercised at all, so the writer cannot leave the shared tree without weakening the assertion the spec exists to make.

**Serialize the two spec files, or the whole suite, so they cannot overlap.** Rejected: the two specs contend over a resource they do not own, and serializing them protects only this pair. Every other repository-wide reader — the Oxlint gate, documentation generators, the coverage instrumentation — reads the same tree, and a sequential setting would hide that the writer publishes files into it.

**Tolerate `ENOENT` in the catalog and leave the compiler roots alone.** Rejected: it does not fix the reported failure. The catalog reader runs before the tsconfig parse, so the probe the failure named was already gone from the catalog's view by the time TypeScript listed it; only the root snapshot prevents TS6053.

**Filter the root list by existence immediately before `createProgram`.** Rejected: checking availability and claiming the file later is the shape that created the race. TypeScript reads root files throughout the build, so an existence check at one instant does not hold for the read that follows it.

**Keep the reads as they are and assert the schema inventory only when the tree is quiet.** Rejected: the extraction is a shipped gate input, and a subject that depends on what else is running is not a test of the repository's persisted format.

## Consequences

A concurrent writer no longer decides this suite's outcome. `pnpm exec vitest run scripts/oxlint-contract.spec.ts scripts/persistence-schema.spec.ts`, the smallest topology that reproduced the signature, failed in 3 of 11 pre-fix runs across two sessions — every failure whose output was captured named TS6053 — and passed 8 of 8 runs with the snapshot in place.

Both halves are pinned by a deterministic negative control, each observed to fail before its fix:

- With the catalog skip removed, a fixture root whose `packages/domain/extension/src/probe.ts` is a dangling symlink fails extraction with `ENOENT: no such file or directory, open '…/probe.ts'`.
- With the `readSourceRoots` skip removed, the case feeding it a readable path and a dangling symlink fails with `ENOENT` for the symlink; with the skip in place the snapshot holds exactly the readable path.

Regression coverage: `persistence-schema.spec.ts` gains "ignores a source file the globs matched but that is gone when it is read" (a dangling link inside the synthetic fixture root, asserting the real event is still extracted) and "compiles only the roots it read, so a root gone before compilation cannot fail the program".

The reproduction limit is explicit. The TS6053 window cannot be constructed from the filesystem alone in a test: `ts.parseJsonConfigFileContent` stats each candidate and drops a dangling link, so the only state that reaches it is a file that exists when the tsconfig is parsed and is deleted afterwards. Reaching that state deterministically needs either a production injection point for the reader or an in-process writer coordinated by a barrier, neither of which the extraction has; the concurrent two-spec topology above is the reproduction, and the per-function negative controls stand in for the window itself.

The extraction now reads every discovered root eagerly rather than letting TypeScript read them on demand, so the same files are read once more before compilation instead of during it.

## Related

- The archived [Oxlint contract cases that spawn a process carry a 90 s ceiling](../../archived/testing/2026-09-27-oxlint-contract-spawn-case-budgets.md) bounds the same spec's process-spawning cases and records the lane arithmetic this change relies on: `DSH_COVERAGE_TEST_TIMEOUT_MS=90000` raises the coverage lanes, while a developer's `pnpm run test` runs on Vitest's default. It governs how long a case may take; this note governs which files a repository-wide scan owns.
- [Windows-lane observations wait on the state they read](2026-09-27-observation-waits-on-observed-state.md) states the rule this change applies to a shared tree: an observation waits on the state it reads, not on a window that another actor can close.
- The archived [Web lane assertions name their input state](../../archived/testing/2026-09-27-web-lane-assertions-name-their-input-state.md) records the same class one layer out, where assertions sampled state a preceding action had not settled.
