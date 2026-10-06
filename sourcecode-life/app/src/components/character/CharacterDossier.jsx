/**
 * Shared seeker dossier: portrait, name, calling, class, and reputation.
 * Home wraps this with XP and navigation. Allies and invites use the compact shell.
 */
import { fmt } from '../../lib/numerology'
import { CALLING } from '../../lib/data'
import { AURA_COLORS } from '../../lib/avatarParts'
import { formatDisplayName } from '../../lib/formatters'
import { parseFreq } from '../../lib/publicProfile'
import { RPGCharacterCanvas } from '../charCreate/AvatarCreator.jsx'
import PremiumBadge from '../ui/PremiumBadge'

function AvatarPreview({ config }) {
  const auraColor = AURA_COLORS[config.aura]?.color || 'transparent'
  const bg = auraColor !== 'transparent' ? auraColor : '#0a1520'
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '10px' }}>
      <RPGCharacterCanvas config={config} size={80} auraColor={auraColor} />
    </div>
  )
}

function repStats(rep) {
  if (!rep || !rep.ratingCount) return null
  const avg = (rep.totalRating / rep.ratingCount).toFixed(1)
  const total = (rep.completions || 0) + (rep.noShows || 0)
  const pct = total > 0 ? Math.round((rep.completions || 0) / total * 100) : null
  return { avg, pct, count: rep.ratingCount }
}

function PortraitFace({ profile, compact }) {
  if (profile?.avatarLoading) {
    return <span className="char-card-portrait-skeleton" aria-hidden="true" />
  }
  if (profile?.avatarConfig) {
    return <AvatarPreview config={profile.avatarConfig} />
  }
  if (compact) {
    const initials = formatDisplayName(profile?.name || '').slice(0, 2).toUpperCase() || '✦'
    return (
      <span className="char-card-portrait-placeholder">
        <span className="char-card-portrait-placeholder-label">{initials}</span>
      </span>
    )
  }
  return (
    <span className="char-card-portrait-placeholder">
      <span className="char-card-portrait-placeholder-icon" aria-hidden="true">+</span>
      <span className="char-card-portrait-placeholder-label">Customize</span>
    </span>
  )
}

export default function CharacterDossier({
  profile,
  compact = false,
  shell = false,
  nameNode = null,
  onPortraitClick = null,
  portraitLabel = 'Character portrait',
  classNode = null,
  actions = null,
  onClick = null,
}) {
  const calling = parseFreq(profile?.cl)
  const callingMeta = calling.root != null ? CALLING[calling.root] : null
  const callingName = (callingMeta?.name || 'Unknown').toUpperCase()
  const callingTitle = callingMeta?.essence || callingMeta?.summary || 'Life calling'
  const callingNum = calling.label && calling.label !== '?'
    ? calling.label
    : (calling.root != null ? fmt(calling.root, calling.root) : '?')
  const displayName = formatDisplayName(profile?.name || '').toUpperCase()
  const classTitle = profile?.classTitle || ''
  const maker = repStats(profile?.reputation)
  const seeker = repStats(profile?.takerReputation)
  const showRep = Boolean(maker || seeker)

  const identity = (
    <>
      <div className="char-card-identity">
        {onPortraitClick ? (
          <button
            type="button"
            className="char-card-portrait char-card-portrait--opens-card"
            onClick={(e) => { e.stopPropagation(); onPortraitClick() }}
            aria-label={portraitLabel}
          >
            <PortraitFace profile={profile} compact={compact} />
            <span className="char-card-portrait-shimmer" />
          </button>
        ) : (
          <div className="char-card-portrait char-dossier-portrait" aria-hidden="true">
            <PortraitFace profile={profile} compact={compact} />
          </div>
        )}

        <div className="char-card-id-text">
          <div className="char-card-name-row">
            {nameNode || (
              <span className="char-card-name" id={compact ? undefined : 'char-display-name'}>
                {displayName || 'SEEKER'}
              </span>
            )}
            {profile?.isPremium && <PremiumBadge size="sm" />}
            <span className="char-card-calling" title={callingTitle} aria-label={callingTitle}>
              <span className="char-card-calling-num">{callingNum}</span>
            </span>
          </div>

          <div className="char-card-calling-archetype" title={callingTitle}>
            <span className="char-card-calling-archetype-name">{callingName}</span>
          </div>

          {compact && (
            <div className="char-dossier-freqs" aria-label="Frequencies">
              <span>LP {parseFreq(profile?.lp).label}</span>
              <span>CL {parseFreq(profile?.cl).label}</span>
              <span>EX {parseFreq(profile?.ex).label}</span>
            </div>
          )}

          {(classNode || classTitle) && (
            <div className="char-card-class" aria-label="Class">
              <span className="char-card-class-kicker">CLASS</span>
              {classNode || <span className="char-card-class-title">{classTitle}</span>}
            </div>
          )}
        </div>
      </div>

      {showRep && (
        <div className="char-card-rep-section" aria-label="Maker and seeker reputation">
          <div className={`char-card-rep${maker ? '' : ' char-card-rep--empty'}`}>
            <span className="char-card-rep-label">MAKER</span>
            {maker ? (
              <div className="char-card-rep-body">
                <span className="char-card-rep-stars">⭐ {maker.avg}</span>
                <span className="char-card-rep-sub">
                  {maker.pct != null ? `${maker.pct}% · ` : ''}{maker.count} quests
                </span>
              </div>
            ) : (
              <span className="char-card-rep-none">No ratings yet</span>
            )}
          </div>
          <div className={`char-card-rep${seeker ? '' : ' char-card-rep--empty'}`}>
            <span className="char-card-rep-label">SEEKER</span>
            {seeker ? (
              <div className="char-card-rep-body">
                <span className="char-card-rep-stars">⭐ {seeker.avg}</span>
                <span className="char-card-rep-sub">{seeker.count} rated</span>
              </div>
            ) : (
              <span className="char-card-rep-none">No ratings yet</span>
            )}
          </div>
        </div>
      )}

      {actions && (
        <div className="char-dossier-actions" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </>
  )

  if (!shell) return <div className="char-dossier">{identity}</div>

  return (
    <div
      className="char-card char-dossier char-dossier--compact"
      onClick={onClick || undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="char-card-spine" aria-hidden="true" />
      <span className="char-card-grain" aria-hidden="true" />
      {identity}
    </div>
  )
}
