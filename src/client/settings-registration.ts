/**
 * Seat the pet settings page in Web Extensions when its parent is loaded and
 * in the legacy first-level settings navigation otherwise. The service is the
 * availability signal: a slot-declaration probe cannot distinguish load order.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the renderer owns ctx.slots and the locale plugin owns ctx.locale.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from './web-extension-contract.ts'
import { PetSettingsSection, type PetSettingsCardController } from './PetSettingsCard.tsx'
import { NS } from './locales.ts'

const LEGACY_SECTION = 'settings.section' as const
const WEB_EXTENSION = 'web-ui.extension' as const
type PetSettingsSeat = typeof LEGACY_SECTION | typeof WEB_EXTENSION

/** Whether the parent service is available; an inactive context reads as absent. */
export function webExtensionsLoaded(ctx: ClientContext): boolean {
  try {
    return ctx.get('webUiExtensions') !== undefined
  } catch {
    return false
  }
}

function warnRefused(seat: PetSettingsSeat, error: unknown): void {
  try {
    console.warn(`[dsh-pet] settings registration into "${seat}" was refused; restoring the reachable entry`, error)
  } catch {
    // A console failure must not tear down the remaining settings entry.
  }
}

/**
 * Register exactly one reachable pet entry and follow the parent across late
 * loading or teardown. The controller belongs to apply(), not a registration,
 * so moving seats never resets staged edits or subscriptions.
 * @returns the final registration and event-subscription disposer.
 */
export function installPetSettingsRegistration(
  ctx: ClientContext,
  controller: PetSettingsCardController,
): () => void {
  let current: PetSettingsSeat | undefined
  let unregister: (() => void) | undefined
  let reconciling = false
  let disposed = false
  let unsubscribe: (() => void) | undefined

  const register = (seat: PetSettingsSeat): (() => void) => {
    const inject = () => controller.inject()
    if (seat === WEB_EXTENSION) {
      // Keyed entries carry no list-only id/order/label. The parent owns tab
      // labels and ordering; the pet contributes only its key and render face.
      return ctx.slots.register({
        name: WEB_EXTENSION,
        key: 'pet',
        locale: NS,
        inject,
      }, PetSettingsSection)
    }
    return ctx.slots.register({
      name: LEGACY_SECTION,
      id: 'pet',
      order: 130,
      label: () => ctx.locale.bind(NS)('settings.title'),
      locale: NS,
      inject,
    }, PetSettingsSection)
  }

  const reconcile = (): void => {
    if (disposed || reconciling) return
    const target = webExtensionsLoaded(ctx) ? WEB_EXTENSION : LEGACY_SECTION
    if (current === target) return
    if (typeof ctx.slots.spec === 'function' && ctx.slots.spec(target) === undefined) return
    reconciling = true
    const previous = current
    const disposePrevious = unregister
    current = undefined
    unregister = undefined
    // The slot registry emits slots/changed synchronously from disposal and
    // registration. The latch keeps those events from registering a duplicate.
    disposePrevious?.()
    try {
      unregister = register(target)
      current = target
    } catch (error) {
      warnRefused(target, error)
      // Never trade a working entry for a refused migration. Restore the old
      // seat, or use the legacy page when the first extension attempt failed.
      const restore = previous ?? (target === WEB_EXTENSION ? LEGACY_SECTION : undefined)
      if (restore !== undefined && restore !== target) {
        try {
          unregister = register(restore)
          current = restore
        } catch (restoreError) {
          warnRefused(restore, restoreError)
        }
      }
    } finally {
      reconciling = false
    }
  }

  if (typeof ctx.on === 'function') {
    try {
      const subscription = ctx.on('slots/changed', reconcile) as unknown
      if (typeof subscription === 'function') unsubscribe = subscription as () => void
    } catch {
      // The initial entry remains usable even on an event-less context double.
    }
  }
  reconcile()

  return () => {
    if (disposed) return
    disposed = true
    unsubscribe?.()
    unsubscribe = undefined
    unregister?.()
    unregister = undefined
    current = undefined
  }
}
