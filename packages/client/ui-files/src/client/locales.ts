/** `files` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.files': '文件',
  'panel.title': '文件',
  'panel.showHidden': '显示隐藏文件',
  'panel.delete': '删除',
  'panel.loading': '加载中…',
  'panel.error': '文件加载失败',
  'panel.empty': '空目录',
  'panel.close': '关闭',
  'panel.up': '上一级',
  'panel.deleteConfirm': '删除 {count} 项？',
} satisfies Record<string, string>

/** The files namespace key union. */
export type FilesKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The file tree's copy. */
    files: FilesKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.files': 'Files',
  'panel.title': 'Files',
  'panel.showHidden': 'Show hidden files',
  'panel.delete': 'Delete',
  'panel.loading': 'Loading…',
  'panel.error': 'Failed to load files',
  'panel.empty': 'Empty directory',
  'panel.close': 'Close',
  'panel.up': 'Up',
  'panel.deleteConfirm': 'Delete {count} items?',
} satisfies Record<FilesKey, string>
