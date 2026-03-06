import { useState } from 'react';
import { getAIRecommendation } from '../../api';

export default function AIPreporuka() {
  const [result,  setResult]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await getAIRecommendation();
      setResult(data.recommendation || 'Nema odgovora.');
    } catch (e) {
      let msg = e.message;
      try { msg = JSON.parse(msg).error || msg; } catch (_) {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{
        background: 'rgba(124,111,247,0.06)',
        border: '1px solid rgba(124,111,247,0.2)',
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          AI analizira tvoje aktivnosti zadnjih 30 dana i najnovije QA trendove,
          pa daje personalnu preporuku za sledeći korak.
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8, opacity: 0.6 }}>
          Powered by Gemini 1.5 Flash · Zahtijeva GEMINI_API_KEY u .env
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        style={{
          padding: '12px 28px',
          background: loading
            ? 'rgba(124,111,247,0.3)'
            : 'linear-gradient(135deg, #9d93ff 0%, #5548cc 100%)',
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 2px 16px rgba(124,111,247,0.4)',
        }}
      >
        {loading ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
            Generišem preporuku...
          </>
        ) : (
          <>✨ Generiši preporuku</>
        )}
      </button>

      {error && (
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: 'rgba(240,108,108,0.08)',
          border: '1px solid rgba(240,108,108,0.25)',
          borderRadius: 10,
          color: 'var(--red, #f06c6c)',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 20,
          padding: '20px',
          background: 'var(--surface2, rgba(255,255,255,0.04))',
          border: '1px solid rgba(124,111,247,0.2)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
        }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🤖 AI preporuka
          </div>
          {result}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
