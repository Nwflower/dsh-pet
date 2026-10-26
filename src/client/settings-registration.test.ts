import { describe, expect, it } from 'vitest'
import { installPetSettingsRegistration } from './settings-registration.ts'

function makeCtx() {
  let service: object | undefined
  let changed: (() => void) | undefined
  const registered: Array<Record<string, unknown>> = []
  const ctx = {
    get: (name: string) => name === 'webUiExtensions' ? service : undefined,
    on: (event: string, listener: () => void) => {
      if (event === 'slots/changed') changed = listener
      return () => { changed = undefined }
    },
    slots: {
      register: (options: Record<string, unknown>) => {
        const entry = { options }
        registered.push(entry)
        changed?.()
        return () => {
          const index = registered.indexOf(entry)
          if (index >= 0) registered.splice(index, 1)
          changed?.()
        }
      },
    },
  }
  return {
    ctx,
    registered,
    setService(value: object | undefined) { service = value; changed?.() },
  }
}

const controller = { inject: () => ({ hooks: {} }) } as never

describe('pet settings registration', () => {
  it('moves one entry between the standalone section and Web Extensions', () => {
    const { ctx, registered, setService } = makeCtx()
    const dispose = installPetSettingsRegistration(ctx as never, controller)
    expect(registered.map(entry => entry.options)).toEqual([
      expect.objectContaining({ name: 'settings.section', id: 'pet', order: 130 }),
    ])

    setService({ sectionId: 'web-ui-plugins', label: () => 'Web Extensions', open: () => true })
    expect(registered).toHaveLength(1)
    expect(registered[0]?.options).toMatchObject({ name: 'web-ui.extension', key: 'pet' })
    expect(registered[0]?.options).not.toHaveProperty('id')
    expect(registered[0]?.options).not.toHaveProperty('order')
    expect(registered[0]?.options).not.toHaveProperty('label')

    setService(undefined)
    expect(registered).toHaveLength(1)
    expect(registered[0]?.options).toMatchObject({ name: 'settings.section', id: 'pet' })
    dispose()
    expect(registered).toHaveLength(0)
  })
})
