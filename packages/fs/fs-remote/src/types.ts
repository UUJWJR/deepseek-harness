/** Domain vocabulary for the browser-facing filesystem Remote. */

/** One child of a listed directory. */
export interface FileEntry {
  /** Basename of the child. */
  name: string
  /** Absolute host path for follow-up list/delete/move operations. */
  path: string
  /** Whether the child is a regular file, a directory, or something else. */
  type: 'file' | 'directory' | 'other'
  /** Dot-prefixed on POSIX; the browser owns whether to show it. */
  hidden: boolean
}

/** A list request for one directory level. */
export interface FileListRequest {
  /** Absolute directory path to list. */
  path: string
}

/** A delete request for one file or one empty directory. */
export interface FileDeleteRequest {
  /** Absolute path to delete. */
  path: string
}

/** A move request from one path to another. */
export interface FileMoveRequest {
  /** Absolute source path. */
  source: string
  /** Absolute destination path. */
  destination: string
}
