import { useState, useEffect } from 'react'
import PremiumBadge from './PremiumBadge'
import Modal from './Modal'

const FEATURES = [
  { glyph: '📜', title: 'Full Blueprint', desc: 'Complete shadow + integration reading for every number in your chart' },
  { glyph: '🌀', title: 'Spiral of Time', desc: 'Visual map of the cyclical seasons in your life; monthly, yearly, 9-year cycles and pinnacles' },
  { glyph: '📊', title: 'Insights & Analytics', desc: 'Stat growth manager, polarity balance charts, and your Life Quest roadmap' },
  { glyph: '⚔', title: 'Ally Badge', desc: 'A ✦ emblem on your name — visible to allies in the Realm' },
  { glyph: '☁', title: 'Cloud Gear Sync', desc: 'Your character equipment synced across devices when gear launches' },
  { glyph: '🎁', title: 'Premium Gift Codes', desc: 'Earn gift tokens by completing quests and share 3–7 day premium with allies' },
]

const PRODUCTS = [
  {
    id: 'premium_monthly',
    label: 'Monthly',
    price: '$4.99/mo',
    badge: null,
    stripeLink: 'https://buy.stripe.com/9B600j0qC5df1zEakm53O03',
    days: 30,
  },
  {
    id: 'premium_annual',
    label: 'Annual',
    price: '$49.99/yr',
    badge: 'BEST VALUE',
    stripeLink: 'https://buy.stripe.com/9B66oH1uG2135PUdwy53O04',
    days: 365,
  },
]

export default function PremiumModal({ open, onClose }) {
  const [selectedProductId, setSelectedProductId] = useState('premium_annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      setLoading(false)
      setError(e.detail || 'Purchase failed.')
    }
    window.addEventListener('scl:purchase_error', handler)
    return () => window.removeEventListener('scl:purchase_error', handler)
  }, [])

  function handlePurchase() {
    const product = PRODUCTS.find(p => p.id === selectedProductId)
    if (!product) return

    if (window.__SCL_WEB) {
      window.location.href = product.stripeLink
    } else {
      setLoading(true)
      setError(null)
      window.NativePurchase?.startPurchase(selectedProductId)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unlock Premium"
      backdropClassName="premium-modal-backdrop"
      className="premium-modal"
    >
      <div className="premium-modal-header">
        <div className="premium-modal-icon">
          <PremiumBadge size="lg" />
        </div>
        <h2 className="premium-modal-title" aria-hidden="true">UNLOCK PREMIUM</h2>
        <p className="premium-modal-subtitle">Full decode of your numerology</p>
      </div>

      <div className="premium-modal-features">
        {FEATURES.map((f, i) => (
          <div key={i} className="premium-feature-item">
            <div className="premium-feature-glyph" aria-hidden="true">{f.glyph}</div>
            <div className="premium-feature-text">
              <div className="premium-feature-title">{f.title}</div>
              <div className="premium-feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-modal-products" role="radiogroup" aria-label="Premium plan">
        {PRODUCTS.map(p => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selectedProductId === p.id}
            className={`premium-product-btn${selectedProductId === p.id ? ' selected' : ''}`}
            onClick={() => setSelectedProductId(p.id)}
          >
            <div className="premium-product-label">{p.label}</div>
            <div className="premium-product-price">{p.price}</div>
            {p.badge && <div className="premium-product-badge">{p.badge}</div>}
          </button>
        ))}
      </div>

      {error && <p className="premium-modal-error" role="alert">{error}</p>}

      <button
        type="button"
        className="premium-modal-cta"
        onClick={handlePurchase}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'PROCESSING…' : window.__SCL_WEB ? 'PAY WITH STRIPE' : 'PURCHASE'}
      </button>

      <p className="premium-modal-note">Secure payment. Cancel anytime.</p>
    </Modal>
  )
}
