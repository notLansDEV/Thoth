import { useState } from 'react'
import { Globe } from 'lucide-react'
import './auth.css'
import { setCurrentWorkspace, getWorkspaces } from '../features/workspaces/workspaces.service.js'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Signup() {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
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
          full_name: fullName.trim()
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

      // Auto-select the first workspace if this account already has one;
      // brand-new accounts go to the workspace picker to create one.
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
                    placeholder="Create a password"
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
