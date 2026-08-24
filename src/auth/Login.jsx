import { useState } from 'react'
import { Globe } from 'lucide-react'
import './auth.css'
import { getWorkspaces, setCurrentWorkspace } from '../features/workspaces/workspaces.service.js'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('thoth_user', JSON.stringify(data.user))

      // Auto-select the first workspace so the router guard lets us through;
      // users with no workspaces land on the workspace picker instead.
      try {
        const workspaces = await getWorkspaces()
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          const first = workspaces[0]
          setCurrentWorkspace(first)
          navigate(`/Thoth/${first.slug}/dashboard`)
          return
        }
      } catch { /* fall through to the picker */ }
      // Always route through the workspace module after login when none exist yet
      navigate('/workspaces')
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
              <h1>Log in to your account</h1>
              <p>Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="auth-error" role="alert">{error}</div>
              )}

              <div className="auth-group">
                <div className="label-row">
                  <label htmlFor="login-email">Email address</label>
                </div>
                <input
                  id="login-email"
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
                  <label htmlFor="login-password">Password</label>
                  <a
                    href="#"
                    className="auth-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>

                <div className="input-wrapper">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input password-input"
                    autoComplete="current-password"
                    placeholder="Enter your password"
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
                      {showPassword ? (
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
                  </button>
                </div>
              </div>

              <div className="remember-row">
                <input
                  id="login-remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label htmlFor="login-remember">Remember me</label>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <div className="auth-switch">
              Don&apos;t have an account?{' '}
              <a
                href="/signup"
                className="auth-link"
                onClick={(e) => { e.preventDefault(); navigate('/signup') }}
              >
                Sign up
              </a>
            </div>
          </section>
        </div>

        <div className="auth-footer">© 2026 Thoth • v1.0.0</div>
      </main>
    </div>
  )
}
