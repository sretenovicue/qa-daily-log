import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh',
          background: 'var(--bg)', color: 'var(--text)', gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>💥</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Nešto je pošlo naopako</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message}
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Pokušaj ponovo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
