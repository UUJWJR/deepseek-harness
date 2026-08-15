/** `report` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.reports': '报告',
  'gallery.title': '已发布报告',
  'gallery.empty': '暂无已发布报告',
  'gallery.loading': '加载中…',
  'gallery.error': '报告加载失败',
  'gallery.close': '关闭',
} satisfies Record<string, string>

/** The report namespace key union. */
export type ReportKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The report gallery's copy. */
    report: ReportKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.reports': 'Reports',
  'gallery.title': 'Published reports',
  'gallery.empty': 'No published reports',
  'gallery.loading': 'Loading…',
  'gallery.error': 'Failed to load reports',
  'gallery.close': 'Close',
} satisfies Record<ReportKey, string>
