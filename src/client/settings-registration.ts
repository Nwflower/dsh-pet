/**
 * The pet settings page's contribution: the Web Extensions parent mounts it
 * through its page service, while a standalone install keeps the original
 * first-level settings section.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the renderer owns ctx.slots and the locale plugin owns ctx.locale.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from './web-extension-contract.ts'
import { PetSettingsSection, type PetSettingsCardController } from './PetSettingsCard.tsx'
import { NS } from './locales.ts'
import { installWebExtensionPage } from './web-extension-page.ts'

/**
 * Register exactly one reachable pet entry and follow the parent across late
 * loading or teardown. The controller belongs to apply(), not a registration,
 * so moving seats never resets staged edits or subscriptions.
 * @returns the page contribution's disposer.
 */
export function installPetSettingsRegistration(
  ctx: ClientContext,
  controller: PetSettingsCardController,
): () => void {
  return installWebExtensionPage(ctx, {
    key: 'pet',
    order: 130,
    locale: NS,
    label: () => ctx.locale.bind(NS)('settings.title'),
    inject: () => controller.inject(),
    component: PetSettingsSection,
  })
}
