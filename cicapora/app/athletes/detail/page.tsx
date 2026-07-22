'use client';
import { useState, useEffect } from 'react';

type TrainingSession = {
  id: number;
  Tanggal: string;
  JenisSesi: string;
  Lokasi: string;
  Durasi: string;
  Grade: string;
  AttemptsSends: string;
  FokusTeknik: string;
  StrengthTraining: string;
  EnergyLevel: string;
  Fatigue: string;
  Catatan: string;
  Kekuatan: string;
  DayaTahan: string;
  DayaLedak: string;
  Kecepatan: string;
  Kelentukan: string;
  Keseimbangan: string;
  Koordinasi: string;
  Ketepatan: string;
};

export default function AtletDetail() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('coachSessions');
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  return (
    <div style={{ padding: '40px', background: '#0f172a', color: 'white', minHeight: '100vh' }}>
      <h1>Grafik & Riwayat Latihan Atlet</h1>
      
      {sessions.length === 0 ? (
        <p>Belum ada data latihan.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {sessions.slice(0, 8).map((s) => (
            <div key={s.id} style={{ background: '#1e2937', padding: '20px', borderRadius: '12px' }}>
              <h3>{s.Tanggal} - {s.JenisSesi}</h3>
              <p>Grade: {s.Grade}</p>
              <p>Energy: {s.EnergyLevel} | Fatigue: {s.Fatigue}</p>
              <p>Fokus: {s.FokusTeknik}</p>
              <div style={{ background: '#334155', height: '20px', borderRadius: '9999px', marginTop: '10px' }}>
                <div style={{ width: `${Math.min(100, parseInt(s.EnergyLevel || '50'))}%`, height: '100%', background: '#22c55e' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}