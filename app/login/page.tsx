'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPelatih() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Cek dari data Admin
    const savedCoaches = localStorage.getItem('adminCoaches');
    if (!savedCoaches) {
      setError('Belum ada data pelatih di Admin!');
      setLoading(false);
      return;
    }

    const coaches = JSON.parse(savedCoaches);
    const coach = coaches.find((c: any) => c.username === username && c.password === password);

    if (coach) {
      localStorage.setItem('coachLoggedIn', 'true');
      router.push('/coach');
    } else {
      setError('Username atau password salah!');
    }

    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a1428 0%, #1e2937 100%)', 
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        background: '#1e2937', 
        padding: '50px', 
        borderRadius: '24px', 
        width: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '30px' }}>Login Pelatih</h1>

        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ width: '100%', padding: '14px', margin: '10px 0', borderRadius: '8px' }} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '14px', margin: '10px 0', borderRadius: '8px' }} 
            required 
          />

          {error && <p style={{ color: 'red', margin: '10px 0' }}>{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '18px', 
              marginTop: '15px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '30px' }}>
          <Link href="/" style={{ color: '#fb923c', textDecoration: 'none' }}>
            ← Kembali ke Halaman Utama
          </Link>
        </div>

        <div style={{ marginTop: '40px', color: '#64748b', fontSize: '14px' }}>
          © 2026 CICAPORA SPORT CLIMBING
        </div>
      </div>
    </div>
  );
}