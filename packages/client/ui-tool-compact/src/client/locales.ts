/** `tool-compact` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'compact.title': '紧凑模式',
} satisfies Record<string, string>

/** The tool-compact namespace key union. */
export type CompactKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The compact-mode row's copy. */
    'tool-compact': CompactKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'compact.title': 'Compact mode',
} satisfies Record<CompactKey, string>
