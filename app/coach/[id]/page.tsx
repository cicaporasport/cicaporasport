'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

type Coach = {
  id: number;
  Nama: string;
  Foto: string;
  Certificate: string;
  spesialis: string;
  username: string;
  password: string;
};

export default function CoachDetail() {
  const params = useParams();
  const router = useRouter();
  const coachId = Number(params?.id);

  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoach = async () => {
      if (!coachId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('coach')
        .select('*')
        .eq('id', coachId)
        .single();

      if (error) console.error(error);
      setCoach(data || null);
      setLoading(false);
    };

    fetchCoach();
  }, [coachId]);

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '100px' }}>Loading...</div>;
  if (!coach) return <div style={{ color: 'white', textAlign: 'center', padding: '100px' }}>Pelatih tidak ditemukan</div>;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a1428 0%, #1e2937 100%)', 
      color: 'white', 
      padding: '40px 20px' 
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button 
          onClick={() => router.back()} 
          style={{ 
            padding: '12px 24px', 
            background: 'transparent', 
            border: '1px solid #fb923c', 
            color: '#fb923c', 
            borderRadius: '12px', 
            marginBottom: '30px',
            cursor: 'pointer'
          }}
        >
          ← Kembali
        </button>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden' }}>
          <div style={{ height: '500px', position: 'relative', overflow: 'hidden' }}>
            <img 
              src={coach.Foto} 
              alt={coach.Nama} 
              style={{ width: '70%', height: '100%', objectFit: 'cover' }} 
            />
          </div>

          <div style={{ padding: '50px' }}>
            <h1 style={{ fontSize: '48px', margin: '0 0 10px 0' }}>{coach.Nama}</h1>
            <p style={{ color: '#fb923c', fontSize: '26px', marginBottom: '30px' }}>{coach.Certificate}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', fontSize: '18px', lineHeight: '1.8' }}>
              <div>
                <strong>Spesialisasi</strong><br />
                {coach.spesialis}
              </div>
            </div>

            <div style={{ marginTop: '50px' }}>
              <Link href="/coach">
                <button style={{ 
                  padding: '16px 32px', 
                  background: '#22c55e', 
                  color: 'black', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  Kembali ke Halaman Pelatih
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== SOLUSI SAAT INI ==================
export const dynamic = 'force-dynamic';