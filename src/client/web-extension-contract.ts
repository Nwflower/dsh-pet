/**
 * The Web Extensions host contract consumed by the pet settings page. This
 * package declares the collaboration types locally and never value-imports
 * the host plugin, so a standalone pet install keeps working without it.
 */

import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'

/** Optional navigator published by the Web Extensions parent section. */
export interface WebUiExtensionService {
  /** The parent keeps the established first-level section id for deep links. */
  readonly sectionId: 'web-ui-plugins'
  /** Localized parent-section label used by the host's deep-link fallback. */
  label(): string
  /** Open one extension tab by its keyed entry id. */
  open(id: string): boolean
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Presence marks the Web Extensions parent as available. */
    webUiExtensions?: WebUiExtensionService
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** One keyed, root-scoped page inside the Web Extensions parent section. */
    'web-ui.extension': {
      kind: 'keyed'
      scope: 'root'
      owner: SettingsSectionOwnerProps
    }
  }
}
