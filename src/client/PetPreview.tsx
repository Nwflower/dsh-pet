/** Lightweight, static pet thumbnails built from the registry's existing assets. */

import type { PetDefinition } from '../registry.ts'
import sectionCss from './settings-section.module.css'

/** Registry data needed by a thumbnail; older hosts may serve only id/name. */
export type PetPreviewDefinition = Pick<PetDefinition, 'id' | 'displayName'>
  & Partial<Pick<PetDefinition, 'renderer' | 'cell' | 'columns' | 'atlasRows' | 'atlasUrl' | 'frames2d'>>

const PREVIEW_LIMIT = 72
const DEFAULT_CELL = { width: 192, height: 208 }

/**
 * Render the atlas's first sprite cell or a frames2d idle frame. Live2d and
 * incomplete legacy responses degrade to a text mark instead of a broken image.
 */
export function PetPreview(props: { pet: PetPreviewDefinition }) {
  const { pet } = props
  const renderer = pet.renderer ?? 'sprite2d'
  if (renderer === 'sprite2d' && pet.atlasUrl !== undefined) {
    const cell = pet.cell ?? DEFAULT_CELL
    const scale = Math.min(PREVIEW_LIMIT / cell.width, PREVIEW_LIMIT / cell.height)
    const width = Math.max(1, Math.round(cell.width * scale))
    const height = Math.max(1, Math.round(cell.height * scale))
    const columns = pet.columns ?? 8
    const rows = pet.atlasRows ?? 9
    return (
      <span className={sectionCss.previewFrame} aria-hidden="true">
        <span
          className={sectionCss.previewAtlas}
          style={{
            width,
            height,
            backgroundImage: `url("${pet.atlasUrl}")`,
            backgroundSize: `${columns * width}px ${rows * height}px`,
          }}
        />
      </span>
    )
  }
  const frame = renderer === 'frames2d'
    ? pet.frames2d?.tracks.idle?.frames[0] ?? pet.atlasUrl
    : undefined
  return (
    <span className={sectionCss.previewFrame} aria-hidden="true">
      {frame === undefined
        ? <span className={sectionCss.previewFallback}>{pet.displayName.slice(0, 1)}</span>
        : <img className={sectionCss.previewImage} src={frame} alt="" draggable={false} />}
    </span>
  )
}
