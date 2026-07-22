'use client';

import { useState, useEffect, useRef } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadarController,
  RadialLinearScale,
} from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';
import { 
  LineChart, 
  Line as RechartsLine, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer 
} from 'recharts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, RadarController, RadialLinearScale);

// ==================== TIPE DATA LENGKAP ====================
type Atlet = {
  id: number;
  Nama: string;
  TempatLahir?: string;
  TanggalLahir?: string;
  Usia: number;
  Alamat?: string;
  RiwayatPenyakit?: string;
  GolonganDarah: string;
  Foto?: string;
  JenisKelamin?: string;
  Level?: string;
};

type TrainingSession = {
  id: number;
  NamaAtlet: string;
  Tanggal: string;
  JenisSesi: string;
  Grade?: string;
  EnergyLevel?: string;
  Fatigue?: string;
  Catatan?: string;
  Kekuatan?: string;
  DayaTahan?: string;
  DayaLedak?: string;
  Kecepatan?: string;
  Kelentukan?: string;
  Keseimbangan?: string;
  Koordinasi?: string;
  Ketepatan?: string;
};

type PrestasiAtlet = {
  id: number;
  NamaAtlet: string;
  JenisKejuaraan: string;
  Tanggal: string;
  Lokasi: string;
  Medali: string;
};

type AthleteCertificate = {
  id: string;
  athlete_name: string;
  certificate_name: string;
  file_url: string;
  uploaded_at: string;
};

type ClimbingTrainingWeek = {
  minggu: number;
  grade: string;
  gradeNumeric: number;
  sesiTotal: number;
  sesiClimbing: number;
  sesiStrength: number;
  sesiEnduranceMobility: number;
  volumeClimbing: number;
  sends: number;
  fingerHang20mm: number;
  weightedPullupKg: number;
  corePlankSec: number;
  enduranceArcMin: number;
};

type UpcomingTraining = {
  id: number;
  athlete_name: string;
  tanggal: string;
  jenis_sesi: string;
  lokasi?: string;
  catatan?: string;
};

export default function AthletesPage() {
  const [atlets, setAtlets] = useState<Atlet[]>([]);
  const [allSessions, setAllSessions] = useState<TrainingSession[]>([]);
  const [prestasiList, setPrestasiList] = useState<PrestasiAtlet[]>([]);
  const [certificates, setCertificates] = useState<AthleteCertificate[]>([]);
  const [selectedAtlet, setSelectedAtlet] = useState<Atlet | null>(null);
  const [climbingData, setClimbingData] = useState<Record<string, ClimbingTrainingWeek[]>>({});
  const [upcomingTrainings, setUpcomingTrainings] = useState<UpcomingTraining[]>([]);

  const lineRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);
  const climbingRef = useRef<HTMLDivElement>(null);
  const strengthChartRef = useRef<HTMLDivElement>(null);

  // ==================== FUNGSI HITUNG UMUR OTOMATIS (TAHUN + BULAN) ====================
  const calculateAge = (tanggalLahir?: string): string => {
    if (!tanggalLahir) return '-';

    const birthDate = new Date(tanggalLahir);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (months < 0) months = 0;

    return `${years} tahun ${months} bulan`;
  };
  // ===================================================================================

  // Load data dari Supabase
  useEffect(() => {
    const fetchAtlets = async () => {
      const { data } = await supabase.from('atlets').select('*').order('id');
      if (data) setAtlets(data);
    };

    const fetchSessions = async () => {
      const { data } = await supabase.from('coach_sessions').select('*');
      if (data) setAllSessions(data);
    };

    const fetchPrestasi = async () => {
      const { data } = await supabase.from('prestasi_atlet').select('*');
      if (data) setPrestasiList(data);
    };

    const fetchClimbing = async () => {
      const { data } = await supabase.from('climbing_progress').select('*');
      if (data) {
        const grouped: Record<string, ClimbingTrainingWeek[]> = {};
        data.forEach((item: any) => {
          if (!grouped[item.athlete_name]) grouped[item.athlete_name] = [];
          grouped[item.athlete_name].push(item);
        });
        setClimbingData(grouped);
      }
    };

    fetchAtlets();
    fetchSessions();
    fetchPrestasi();
    fetchClimbing();
  }, []);

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!selectedAtlet) return;
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('athlete_name', selectedAtlet.Nama)
        .order('uploaded_at', { ascending: false });
      if (!error) setCertificates(data || []);
    };

    const fetchUpcoming = async () => {
      if (!selectedAtlet) return;
      const { data } = await supabase
        .from('upcoming_training')
        .select('*')
        .eq('athlete_name', selectedAtlet.Nama)
        .order('tanggal', { ascending: true });
      if (data) setUpcomingTrainings(data);
    };

    fetchCertificates();
    fetchUpcoming();
  }, [selectedAtlet]);

  // ==================== DATA FILTER ====================
  const atletSessions = allSessions
    .filter(s => selectedAtlet && s.NamaAtlet === selectedAtlet.Nama)
    .sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());

  const atletPrestasi = prestasiList.filter(p => selectedAtlet && p.NamaAtlet === selectedAtlet.Nama);

  const totalSessions = atletSessions.length;
  const avgEnergy = totalSessions > 0 
    ? (atletSessions.reduce((sum, s) => sum + parseInt(s.EnergyLevel || '0'), 0) / totalSessions).toFixed(1) 
    : '0';
  const avgFatigue = totalSessions > 0 
    ? (atletSessions.reduce((sum, s) => sum + parseInt(s.Fatigue || '0'), 0) / totalSessions).toFixed(1) 
    : '0';

  const fitnessKeys = ['Kekuatan','DayaTahan','DayaLedak','Kecepatan','Kelentukan','Keseimbangan','Koordinasi','Ketepatan'];

  const fitnessAverages = fitnessKeys.map(key => {
    const values = atletSessions.map(s => parseInt((s as any)[key] || '0')).filter(v => v > 0);
    return values.length > 0 ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;
  });

  // ==================== CHART ASLI ====================
  const lineData = {
    labels: atletSessions.map(s => new Date(s.Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
    datasets: [
      { label: 'Energy Level', data: atletSessions.map(s => parseInt(s.EnergyLevel || '0')), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.15)', tension: 0.4, fill: true },
      { label: 'Fatigue Level', data: atletSessions.map(s => parseInt(s.Fatigue || '0')), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.15)', tension: 0.4, fill: true },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#cbd5e1' } } },
    scales: {
      y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
    },
  };

  const radarData = {
    labels: fitnessKeys,
    datasets: [{ 
      label: 'Rata-rata Performa', 
      data: fitnessAverages, 
      borderColor: '#fb923c', 
      backgroundColor: 'rgba(251,146,60,0.25)', 
      borderWidth: 2 
    }],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      r: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#cbd5e1' }, ticks: { color: '#94a3b8' } } 
    },
    plugins: { legend: { labels: { color: '#cbd5e1' } } },
  };

  // ==================== DATA CLIMBING PER ATLET ====================
  const atletClimbing = selectedAtlet ? (climbingData[selectedAtlet.Nama] || []) : [];

  const gradeChartData = {
    labels: atletClimbing.map(c => `Minggu ${c.minggu}`),
    datasets: [{
      label: 'Grade Maksimal',
      data: atletClimbing.map(c => c.gradeNumeric),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      tension: 0.3,
      fill: true,
    }],
  };

  const strengthChartData = {
    labels: atletClimbing.map(c => `Minggu ${c.minggu}`),
    datasets: [
      { label: 'Finger Hang (detik)', data: atletClimbing.map(c => c.fingerHang20mm), borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.2)', tension: 0.3 },
      { label: 'Weighted Pull-up (kg)', data: atletClimbing.map(c => c.weightedPullupKg), borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.2)', tension: 0.3 },
    ],
  };

  const gradeOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } } };
  const strengthOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } } };

  const captureWithDelay = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return null;
    await new Promise(resolve => setTimeout(resolve, 400));
    return await html2canvas(ref.current, { scale: 3, backgroundColor: '#1e2937' });
  };

  // ==================== DOWNLOAD PDF (SUDAH DENGAN WRAP + UMUR OTOMATIS) ====================
  const downloadPDF = async () => {
    if (!selectedAtlet) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 52;

    // Helper untuk text wrapping otomatis
    const addWrappedText = (text: string, x: number, maxWidth: number, lineHeight: number = 7) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage();
          y = 30;
        }
        doc.text(line, x, y);
        y += lineHeight;
      });
      return lines.length * lineHeight;
    };

    const addLine = (label: string, value: any) => {
      if (y > 280) {
        doc.addPage();
        y = 30;
      }
      doc.text(label, 20, y);
      const valueText = ': ' + (value || '-');
      const maxWidth = pageWidth - 100;
      addWrappedText(valueText, 80, maxWidth, 7);
      y += 2;
    };

    // Header PDF
    doc.setFillColor(10, 20, 40);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('CICAPORA SPORT CLIMBING', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(13);
    doc.text('LAPORAN LENGKAP PROGRES ATLET', pageWidth / 2, 26, { align: 'center' });

    doc.setTextColor(0);
    doc.setFontSize(15);
    doc.text('BIODATA ATLET', 20, y);
    y += 8;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    if (selectedAtlet.Foto) {
      try { doc.addImage(selectedAtlet.Foto, 'JPEG', pageWidth - 75, y - 5, 55, 55); } catch (e) {}
    }

    doc.setFontSize(11);

    // ==================== BIODATA DENGAN UMUR OTOMATIS ====================
    addLine("Nama Lengkap", selectedAtlet.Nama);
    addLine("Usia", calculateAge(selectedAtlet.TanggalLahir)); // ← UMUR OTOMATIS
    addLine("Jenis Kelamin", selectedAtlet.JenisKelamin);
    addLine("Level", selectedAtlet.Level);
    addLine("Tempat Lahir", selectedAtlet.TempatLahir);
    addLine("Tanggal Lahir", selectedAtlet.TanggalLahir);
    addLine("Golongan Darah", selectedAtlet.GolonganDarah);
    addLine("Alamat", selectedAtlet.Alamat);
    addLine("Riwayat Penyakit", selectedAtlet.RiwayatPenyakit || "Tidak ada");
    y += 15;

    // ==================== PRESTASI ====================
    if (atletPrestasi.length > 0) {
      if (y > 220) { doc.addPage(); y = 30; }
      doc.setFontSize(15);
      doc.text('PRESTASI ATLET', 20, y);
      y += 8;
      doc.line(20, y, pageWidth - 20, y);
      y += 12;

      let col = 0;
      for (let i = 0; i < atletPrestasi.length; i++) {
        const p = atletPrestasi[i];
        const xPos = 20 + (col * 58);
        if (y > 250) { doc.addPage(); y = 30; }

        doc.setFontSize(10);
        doc.text(`• ${p.JenisKejuaraan}`, xPos, y);
        y += 6;
        doc.text(`  ${p.Tanggal}`, xPos, y);
        y += 6;
        addWrappedText(`  ${p.Lokasi} - ${p.Medali}`, xPos, 55, 6);

        col++;
        if (col >= 3) { col = 0; y += 10; }
      }
      if (col !== 0) y += 15;
      y += 8;
    }

    // ==================== RINGKASAN PERFORMA ====================
    if (y > 220) { doc.addPage(); y = 30; }
    doc.setFontSize(15);
    doc.text('RINGKASAN PERFORMA', 20, y);
    y += 8;
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    doc.setFontSize(11);
    doc.text(`Total Sesi Latihan : ${totalSessions}`, 20, y); y += 8;
    doc.text(`Rata-rata Energy   : ${avgEnergy} / 10`, 20, y); y += 8;
    doc.text(`Rata-rata Fatigue  : ${avgFatigue} / 10`, 20, y); y += 15;

    // Chart Energy & Fatigue
    if (lineRef.current && atletSessions.length > 0) {
      if (y > 170) { doc.addPage(); y = 30; }
      const canvas = await captureWithDelay(lineRef);
      if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 88); y += 98; }
    }

    // Radar Chart
    if (radarRef.current && totalSessions > 0) {
      if (y > 170) { doc.addPage(); y = 30; }
      const canvas = await captureWithDelay(radarRef);
      if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 88); y += 98; }
    }

    // ==================== PROGRES PANJAT TEBING ====================
    if (atletClimbing.length > 0) {
      if (y > 200) { doc.addPage(); y = 30; }
      doc.setFontSize(15);
      doc.text('PROGRES LATIHAN PANJAT TEBING', 20, y);
      y += 8;
      doc.line(20, y, pageWidth - 20, y);
      y += 12;

      doc.setFontSize(11);
      doc.text(`Total Minggu Data: ${atletClimbing.length}`, 20, y); y += 7;
      doc.text(`Grade Awal → Akhir: ${atletClimbing[0].grade} → ${atletClimbing[atletClimbing.length - 1].grade}`, 20, y); y += 7;
      doc.text(`Total Volume: ${atletClimbing.reduce((sum, c) => sum + c.volumeClimbing, 0)} problem/rute`, 20, y); y += 12;

      atletClimbing.forEach((c, i) => {
        if (y > 255) { doc.addPage(); y = 30; }
        doc.setFontSize(10);
        doc.text(`${i + 1}. Minggu ${c.minggu} | Grade: ${c.grade} | Volume: ${c.volumeClimbing} | Sends: ${c.sends}`, 20, y);
        y += 7;
      });
      y += 10;

      if (climbingRef.current) {
        if (y > 170) { doc.addPage(); y = 30; }
        const canvas = await captureWithDelay(climbingRef);
        if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 85); y += 95; }
      }

      if (strengthChartRef.current) {
        if (y > 170) { doc.addPage(); y = 30; }
        const canvas = await captureWithDelay(strengthChartRef);
        if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 85); y += 95; }
      }
    }

    // ==================== RIWAYAT LATIHAN ====================
    if (y > 200) { doc.addPage(); y = 30; }
    doc.setFontSize(15);
    doc.text('RIWAYAT LATIHAN', 20, y);
    y += 8;
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    atletSessions.forEach((s, i) => {
      if (y > 255) { doc.addPage(); y = 30; }
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${s.Tanggal} - ${s.JenisSesi} | Grade: ${s.Grade || '-'}`, 20, y);
      doc.text(`   Energy: ${s.EnergyLevel || '-'} | Fatigue: ${s.Fatigue || '-'}`, 25, y + 6);
      y += 18;
    });

    doc.save(`Laporan_Progres_${selectedAtlet.Nama.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadCertificate = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'sertifikat.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert('Gagal mendownload file.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1428 0%, #1e2937 100%)', color: 'white' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', background: '#f97316', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏔️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>CICAPORA</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#fb923c' }}>SPORT CLIMBING</p>
          </div>
        </div>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #fb923c', color: '#fb923c', borderRadius: '10px' }}>Kembali ke Home</button>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px' }}>Area Atlet</h1>

        {!selectedAtlet && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {atlets.map((atlet, index) => (
              <div key={index} onClick={() => setSelectedAtlet(atlet)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', height: '340px', display: 'flex', flexDirection: 'column' }}>
                {atlet.Foto ? <img src={atlet.Foto} alt={atlet.Nama} style={{ width: '100%', height: '200px', objectFit: 'cover' }} /> : <div style={{ height: '200px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Photo</div>}
                <div style={{ padding: '20px', flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{atlet.Nama}</h3>
                  {/* ==================== UMUR OTOMATIS ==================== */}
                  <p style={{ color: '#94a3b8', margin: 0 }}>
                    {calculateAge(atlet.TanggalLahir)} • {atlet.GolonganDarah}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedAtlet && (
          <div>
            <button onClick={() => setSelectedAtlet(null)} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #fb923c', color: '#fb923c', borderRadius: '12px', marginBottom: '30px' }}>
              ← Kembali ke Daftar Atlet
            </button>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px' }}>
              {/* Header Atlet + Tombol PDF */}
              <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px' }}>
                {selectedAtlet.Foto && <img src={selectedAtlet.Foto} alt="" style={{ width: '160px', borderRadius: '20px' }} />}
                <div>
                  <h1 style={{ fontSize: '36px', margin: 0 }}>{selectedAtlet.Nama}</h1>
                  {/* ==================== UMUR OTOMATIS ==================== */}
                  <p style={{ color: '#94a3b8', fontSize: '18px' }}>
                    {calculateAge(selectedAtlet.TanggalLahir)} • {selectedAtlet.GolonganDarah}
                  </p>
                </div>
                <button onClick={downloadPDF} style={{ marginLeft: 'auto', padding: '14px 28px', background: '#38bdf8', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold' }}>
                  Unduh Laporan PDF
                </button>
              </div>

              {/* Biodata */}
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '28px', borderRadius: '16px', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '16px', color: '#fb923c' }}>Data Lengkap Atlet</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <p><strong>Nama:</strong> {selectedAtlet.Nama}</p>
                  {/* ==================== UMUR OTOMATIS ==================== */}
                  <p><strong>Usia:</strong> {calculateAge(selectedAtlet.TanggalLahir)}</p>
                  <p><strong>Jenis Kelamin:</strong> {selectedAtlet.JenisKelamin || '-'}</p>
                  <p><strong>Level:</strong> {selectedAtlet.Level || '-'}</p>
                  <p><strong>Tempat Lahir:</strong> {selectedAtlet.TempatLahir || '-'}</p>
                  <p><strong>Tanggal Lahir:</strong> {selectedAtlet.TanggalLahir || '-'}</p>
                  <p><strong>Golongan Darah:</strong> {selectedAtlet.GolonganDarah}</p>
                  <p><strong>Alamat:</strong> {selectedAtlet.Alamat || '-'}</p>
                  <p style={{ gridColumn: '1 / -1' }}><strong>Riwayat Penyakit:</strong> {selectedAtlet.RiwayatPenyakit || 'Tidak ada'}</p>
                </div>
              </div>

              {/* Prestasi */}
              {atletPrestasi.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ marginBottom: '16px', color: '#22c55e' }}>🏆 Prestasi Atlet</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {atletPrestasi.map(p => (
                      <div key={p.id} style={{ background: 'rgba(34,197,94,0.1)', padding: '14px 16px', borderRadius: '12px', border: '1px solid #22c55e', fontSize: '14px' }}>
                        <strong>{p.JenisKejuaraan}</strong><br />
                        <small>{p.Tanggal} • {p.Lokasi}</small><br />
                        <span style={{ color: '#86efac', fontWeight: 'bold' }}>{p.Medali}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                <div ref={lineRef} style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px' }}>
                  <h3>Tren Energy & Fatigue</h3>
                  <div style={{ height: '320px' }}>
                    {atletSessions.length > 0 ? <Line data={lineData} options={lineOptions} /> : <p>Belum ada data</p>}
                  </div>
                </div>
                <div ref={radarRef} style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px' }}>
                  <h3>8 Unsur Kebugaran Jasmani</h3>
                  <div style={{ height: '320px' }}>
                    {totalSessions > 0 ? <Radar data={radarData} options={radarOptions} /> : <p>Belum ada data</p>}
                  </div>
                </div>
              </div>

              {/* Riwayat Latihan */}
              <div style={{ marginBottom: '40px' }}>
                <h3>Riwayat Latihan</h3>
                {atletSessions.length === 0 ? (
                  <p>Belum ada data latihan.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {atletSessions.map(s => (
                      <div key={s.id} style={{ background: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.4' }}>
                        <strong style={{ color: '#fb923c' }}>{s.Tanggal}</strong><br />
                        <span style={{ color: '#e2e8f0' }}>{s.JenisSesi}</span><br />
                        Grade: {s.Grade || '-'} | Energy: {s.EnergyLevel || '-'}<br />
                        Fatigue: {s.Fatigue || '-'}
                        {s.Catatan && <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '12px' }}>{s.Catatan.length > 60 ? s.Catatan.substring(0, 60) + '...' : s.Catatan}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progres Panjat Tebing */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ color: '#3b82f6', marginBottom: '16px' }}>🧗 Progres Latihan Panjat Tebing Detail</h3>

                {atletClimbing.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
                    <p>Belum ada data progres panjat tebing.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '20px', borderRadius: '16px', marginBottom: '24px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(59,130,246,0.2)' }}>
                            <th style={{ padding: '8px' }}>Minggu</th>
                            <th>Grade</th>
                            <th>Volume</th>
                            <th>Sends</th>
                            <th>Finger (s)</th>
                            <th>Pull-up (kg)</th>
                            <th>Core (s)</th>
                            <th>Endurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atletClimbing.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.minggu}</td>
                              <td><strong style={{ color: '#3b82f6' }}>{c.grade}</strong></td>
                              <td>{c.volumeClimbing}</td>
                              <td>{c.sends}</td>
                              <td>{c.fingerHang20mm}</td>
                              <td>{c.weightedPullupKg}</td>
                              <td>{c.corePlankSec}</td>
                              <td>{c.enduranceArcMin} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div ref={climbingRef} style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
                      <h4>Progres Grade Maksimal</h4>
                      <div style={{ height: '320px' }}>
                        <Line data={gradeChartData} options={gradeOptions} />
                      </div>
                    </div>

                    <div ref={strengthChartRef} style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px' }}>
                      <h4>Kekuatan Jari & Pulling Strength</h4>
                      <div style={{ height: '320px' }}>
                        <Line data={strengthChartData} options={strengthOptions} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Evaluasi & Jadwal */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ color: '#eab308' }}>📊 Evaluasi & Jadwal Latihan Mendatang</h3>

                {atletClimbing.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
                    <h4>Progress Climbing (Recharts)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={atletClimbing}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="minggu" />
                        <YAxis />
                        <RechartsTooltip />
                        <RechartsLegend />
                        <RechartsLine type="monotone" dataKey="gradeNumeric" stroke="#3b82f6" name="Grade" />
                        <RechartsLine type="monotone" dataKey="volumeClimbing" stroke="#22c55e" name="Volume" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px' }}>
                  <h4>Jadwal Latihan Mendatang</h4>
                  {upcomingTrainings.length === 0 ? (
                    <p>Belum ada jadwal mendatang untuk atlet ini.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {upcomingTrainings.map((u, i) => (
                        <div key={i} style={{ background: 'rgba(234,179,8,0.1)', padding: '14px', borderRadius: '10px', border: '1px solid #eab308' }}>
                          <strong>{u.tanggal}</strong> — {u.jenis_sesi}<br />
                          Lokasi: {u.lokasi || '-'}<br />
                          {u.catatan && <small style={{ color: '#94a3b8' }}>{u.catatan}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sertifikat */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>📜 Sertifikat Atlet</h3>
                {certificates.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8' }}>Belum ada sertifikat.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {certificates.map((cert) => (
                      <div key={cert.id} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '16px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#86efac' }}>{cert.certificate_name}</h4>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                          Di-upload: {new Date(cert.uploaded_at).toLocaleDateString('id-ID')}
                        </p>
                        <button onClick={() => downloadCertificate(cert.file_url, cert.certificate_name)} style={{ width: '100%', padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
                          📥 Download Sertifikat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}