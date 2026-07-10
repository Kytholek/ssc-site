/**
 * FlowDetailPanel — shared portal bottom sheet for all blueprint flows.
 * Slides up from the bottom (mobile) matching SkillTree style.
 * Used by PurposeFlow, LessonsFlow, IdentityFlow, LifeQuestFlow, TimeFlow.
 */
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFocusTrap } from '../../hooks/useFocusTrap'

export default function FlowDetailPanel({ open, onClose, color = '#c9a84c', title, subtitle, icon, children }) {
  const panelRef = useFocusTrap({ open, onClose })

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Panel - bottom sheet on mobile */}
          <motion.div
            key="panel"
            ref={panelRef}
            className="flow-side-panel flow-side-panel--mobile"
            style={{
              '--flow-color':          color,
              '--flow-color-dim':      color + '33',
              '--flow-color-faded':    color + '18',
              '--flow-color-border':   color + '44',
              '--flow-color-border-dim': color + '22',
              '--lf-color':            color,
              '--lf-color-faded':      color + '11',
              zIndex: 9999,
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label={title + ' details'}
          >
            {/* Header */}
            <div className="flow-panel-header flow-panel-header--mobile">
              <div className="flow-panel-header-row">
                <span className="flow-panel-icon">{icon}</span>
                <div className="flow-panel-meta">
                  <div className="flow-panel-title flow-panel-title--mobile">{title}</div>
                  {subtitle && (
                    <div className="flow-panel-subtitle flow-panel-subtitle--mobile">{subtitle}</div>
                  )}
                </div>
                <button className="lqt-panel-close" onClick={onClose} aria-label="Close">✕</button>
              </div>
            </div>

            {/* Body */}
            <div className="flow-panel-body flow-panel-body--mobile">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
