import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff6b6b' }}>
            Something went wrong
          </div>
          <pre style={{
            maxWidth: '640px', whiteSpace: 'pre-wrap', fontSize: '11px',
            color: '#999', background: '#121212', border: '1px solid #2a2a2a',
            borderRadius: '4px', padding: '12px',
          }}>
            {String(this.state.error && this.state.error.message)}
          </pre>
          <button className="btn primary" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
