/**
 * Character Guidebook CTA — opens Services checkout prefilled with app data.
 */
import { useAppState } from '../../context/AppContext'
import { buildCharacterGuidebookUrl } from '../../lib/guidebookLink'

export default function CharacterGuidebookCta({ compact = false }) {
  const { playerData, currentUser } = useAppState()

  if (!playerData) return null

  const href = buildCharacterGuidebookUrl(playerData, currentUser?.email || '')

  return (
    <a
      className={`char-guidebook-cta${compact ? ' char-guidebook-cta--compact' : ''}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="char-guidebook-cta-icon" aria-hidden="true">◈</div>
      <div className="char-guidebook-cta-body">
        <div className="char-guidebook-cta-title">Character Guidebook</div>
        <div className="char-guidebook-cta-desc">
          Written decoding of your seven frequencies — uses your character data. $22 PDF.
        </div>
      </div>
      <span className="char-guidebook-cta-arrow" aria-hidden="true">→</span>
    </a>
  )
}
