import { useId } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../../hooks/useFocusTrap'

/**
 * Shared accessible modal wrapper.
 * Provides portal, backdrop, focus trap, Escape to close, and dialog semantics.
 */
export default function Modal({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  describedById,
  className = '',
  backdropClassName = 'modal-backdrop',
  children,
}) {
  const autoId = useId()
  const titleId = titleIdProp || (title ? `modal-title-${autoId}` : undefined)
  const ref = useFocusTrap({ open, onClose })

  if (!open) return null

  return createPortal(
    <div className={backdropClassName} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        className={className}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {title && (
          <h2 id={titleId} className="sr-only">{title}</h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
