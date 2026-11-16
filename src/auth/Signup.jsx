import { useState } from 'react'
import { Check, Globe, X } from 'lucide-react'
import './auth.css'
import { setCurrentWorkspace, getWorkspaces } from '../features/workspaces/workspaces.service.js'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function passwordChecks(password) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  }
}

export default function Signup() {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountHint, setAccountHint] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const checks = passwordChecks(password)
  const passwordStrong = checks.length && checks.letter && checks.number

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }
    if (!passwordStrong) {
      setError('Password must be at least 8 characters and include letters and numbers.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          account_hint: accountHint.trim() || null,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Signup failed')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('thoth_user', JSON.stringify(data.user))
      setCurrentWorkspace(null)

      try {
        const workspaces = await getWorkspaces()
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          const first = workspaces[0]
          setCurrentWorkspace(first)
          navigate(`/Thoth/${first.slug}/dashboard`)
          return
        }
      } catch { /* fall through to the picker */ }
      navigate('/workspaces')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function EyeIcon({ hidden }) {
    return (
      <svg
        className="eye-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {hidden ? (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a2.5 2.5 0 1 1-3.54-3.54" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        ) : (
          <>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
            <circle cx="12" cy="12" r="2.5" />
          </>
        )}
      </svg>
    )
  }

  function Rule({ ok, label }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: ok ? '#34d399' : 'var(--muted2, #9aa0aa)' }}>
        <span style={{ display: 'inline-flex' }}>{ok ? <Check size={12} /> : <X size={12} />}</span>
        <span>{label}</span>
      </div>
    )
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
              <h1>Create your account</h1>
              <p>Sign up to start managing your workspaces</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="auth-error" role="alert">{error}</div>
              )}

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-username">Username</label>
                </div>
                <input
                  id="signup-username"
                  name="username"
                  type="text"
                  className="auth-input"
                  autoComplete="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-fullname">Full name</label>
                </div>
                <input
                  id="signup-fullname"
                  name="full_name"
                  type="text"
                  className="auth-input"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-email">Email address</label>
                </div>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  className="auth-input"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-password">Password</label>
                </div>
                <div className="input-wrapper">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input password-input"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
                <div style={{ marginTop: '8px', display: 'grid', gap: '4px' }}>
                  <Rule ok={checks.length} label="At least 8 characters" />
                  <Rule ok={checks.letter} label="Contains a letter" />
                  <Rule ok={checks.number} label="Contains a number" />
                </div>
              </div>

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-confirm-password">Confirm password</label>
                </div>
                <div className="input-wrapper">
                  <input
                    id="signup-confirm-password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input password-input"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                  >
                    <EyeIcon hidden={showConfirmPassword} />
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: password === confirmPassword ? '#34d399' : '#f87171' }}>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="signup-hint">Account hint <span style={{ fontWeight: 500, color: 'var(--muted2, #9aa0aa)', textTransform: 'none' }}>(for backup purposes)</span></label>
                </div>
                <input
                  id="signup-hint"
                  name="account_hint"
                  type="text"
                  className="auth-input"
                  autoComplete="off"
                  placeholder="e.g. Favorite project name or a personal reminder"
                  value={accountHint}
                  onChange={(e) => setAccountHint(e.target.value)}
                  maxLength={255}
                />
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted2, #9aa0aa)', lineHeight: 1.5 }}>
                  Optional. This hint can help you remember/verify your account later. Don’t use your password.
                </div>
              </div>

              <button
                type="submit"
                className="auth-button"
                style={{ marginTop: '2px' }}
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="auth-switch">
              Already have an account?{' '}
              <a
                href="/login"
                className="auth-link"
                onClick={(e) => { e.preventDefault(); navigate('/login') }}
              >
                Log in
              </a>
            </div>
          </section>
        </div>

        <div className="auth-footer">© 2026 Thoth • v1.0.0</div>
      </main>
    </div>
  )
}
