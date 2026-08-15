/**
 * Web file-tree plugin, node half.
 *
 * Deliberately empty. The filesystem Remote lives on the host plane and the
 * tree is a pure browser surface; the browser half below owns the UI.
 */

/** Host plugin body — the host fs Remote is composed in the base bundle, not here. */
export function apply(): void {}
