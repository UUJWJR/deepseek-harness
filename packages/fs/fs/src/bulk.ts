/**
 * Bulk-operation helper: fold a target set so no target is a descendant of
 * another. A bulk delete/move applies the operation to the folded set only —
 * removing a directory already removes its children.
 *
 * @module @deepseek-ai/dsh-fs/src/bulk
 */

import type { FsTarget } from './types.ts'

/**
 * Drop any target that is a descendant of another target in the set, using
 * the backend's containment predicate. Order is preserved for the survivors.
 * @param targets - the resolved targets to fold.
 * @param contains - the backend's {@link FileSystem.contains} predicate.
 * @returns the targets with descendants removed.
 */
export function foldAncestors(
  targets: readonly FsTarget[],
  contains: (parent: FsTarget, child: FsTarget) => boolean,
): FsTarget[] {
  return targets.filter(target =>
    !targets.some(other => other !== target && contains(other, target)))
}
