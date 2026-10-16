import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Sem isso, qualquer erro de renderização derruba a árvore inteira e o
// usuário fica com a tela branca, sem saber o que houve. Mostra o erro, manda
// pro diagnóstico de carregamento (index.html) e oferece recarregar.
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    window.__reportClient?.('render-error', `${error?.stack || error}
${info?.componentStack || ''}`.slice(0, 1500))
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Ops, algo deu errado ao abrir esta tela.</h2>
        <p style={{ color: '#555', marginBottom: 16 }}>Tente recarregar. Se continuar, envie um print desta tela pro suporte.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 0 }}
        >
          Recarregar
        </button>
        <pre style={{ marginTop: 16, fontSize: 11, color: '#900', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
)

// Sinaliza pro diagnóstico de carregamento em index.html que o React subiu.
window.__appMounted = true
window.__reportClient?.('mounted', null)
