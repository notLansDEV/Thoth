import { useState } from 'react'
import { Globe } from 'lucide-react'
import './auth.css'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [hint, setHint] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setHint(null)
    setNotFound(false)

    const value = email.trim().toLowerCase()
    if (!value) {
      setError('Please enter your registered email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setHint(data.hint || null)
        setNotFound(false)
        return
      }
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      setError(data.error || 'Could not retrieve password hint.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-language" aria-label="Language selector">
        <span className="globe" aria-hidden="true"><Globe size={13} /></span>
        <span>English</span>
        <span className="flag" aria-hidden="true"><Globe size={13} /></span>
      </div>

      <main className="auth-wrapper">
        <div className="auth-logo" aria-label="Thoth">
          <span>th</span><span className="accent">o</span><span>th</span>
        </div>

        <div className="auth-card-container">
          <div className="auth-corner top-left" aria-hidden="true" />
          <div className="auth-corner bottom-right" aria-hidden="true" />

          <section className="auth-card">
            <div className="auth-header">
              <h1>Forgot password?</h1>
              <p>Enter your registered email address to view the password hint you set during registration.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="auth-error" role="alert">{error}</div>}

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="forgot-email">Registered email address</label>
                </div>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className="auth-input"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-button" style={{ marginTop: '2px' }} disabled={loading}>
                {loading ? 'Checking…' : 'Show Password Hint'}
              </button>
            </form>

            {(hint !== null || notFound) && (
              <div
                role={notFound ? 'alert' : 'status'}
                style={notFound ? {
                  marginTop: '16px',
                  padding: '12px 13px',
                  borderRadius: '7px',
                  border: '1px solid rgba(220, 76, 76, 0.35)',
                  background: 'rgba(220, 76, 76, 0.08)',
                  color: '#ff8a8a',
                  fontSize: '12px',
                  lineHeight: 1.55,
                } : {
                  marginTop: '16px',
                  padding: '12px 13px',
                  borderRadius: '7px',
                  border: '1px solid rgba(34, 151, 155, 0.35)',
                  background: 'rgba(34, 151, 155, 0.10)',
                  color: 'var(--text-soft)',
                  fontSize: '12px',
                  lineHeight: 1.55,
                }}
              >
                {notFound ? (
                  <>No account found with that email address. Please check for typos or register a new account.</>
                ) : hint ? (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7fd7d9', marginBottom: '6px' }}>
                      Registered Password Hint
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f7f7', wordBreak: 'break-word' }}>
                      {hint}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7fd7d9', marginBottom: '6px' }}>
                      Registered Password Hint
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#d5dbdc' }}>
                      No password hint was set for this account.
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="auth-switch">
              <a
                href="/login"
                className="auth-link"
                onClick={(e) => { e.preventDefault(); navigate('/login') }}
              >
                ← Back to Sign In
              </a>
            </div>
          </section>
        </div>

        <div className="auth-footer">© 2026 Thoth • v1.0.0</div>
      </main>
    </div>
  )
}
