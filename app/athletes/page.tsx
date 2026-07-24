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

  // ==================== FUNGSI HITUNG UMUR OTOMATIS ====================
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

  // Load data Supabase
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

  // ==================== DOWNLOAD PDF ====================
  const downloadPDF = async () => {
    if (!selectedAtlet) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 45;

    doc.setFillColor(10, 20, 40);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('CICAPORA SPORT CLIMBING', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('LAPORAN LENGKAP PROGRES ATLET', pageWidth / 2, 23, { align: 'center' });

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('BIODATA ATLET', 20, y);
    y += 6;
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    if (selectedAtlet.Foto) {
      try { doc.addImage(selectedAtlet.Foto, 'JPEG', pageWidth - 70, y - 3, 50, 50); } catch (e) {}
    }

    doc.setFontSize(11);

    const addWrappedText = (text: string, x: number, maxWidth: number, lineHeight: number = 6) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 30; }
        doc.text(line, x, y);
        y += lineHeight;
      });
      return lines.length * lineHeight;
    };

    const addLine = (label: string, value: any) => {
      if (y > 280) { doc.addPage(); y = 30; }
      doc.text(label, 20, y);
      const valueText = ': ' + (value || '-');
      addWrappedText(valueText, 80, pageWidth - 100, 6);
      y += 1;
    };

    addLine("Nama Lengkap", selectedAtlet.Nama);
    addLine("Usia", calculateAge(selectedAtlet.TanggalLahir));
    addLine("Jenis Kelamin", selectedAtlet.JenisKelamin);
    addLine("Level", selectedAtlet.Level);
    addLine("Tempat Lahir", selectedAtlet.TempatLahir);
    addLine("Tanggal Lahir", selectedAtlet.TanggalLahir);
    addLine("Golongan Darah", selectedAtlet.GolonganDarah);
    addLine("Alamat", selectedAtlet.Alamat);
    addLine("Riwayat Penyakit", selectedAtlet.RiwayatPenyakit || "Tidak ada");
    y += 8;

    if (atletPrestasi.length > 0) {
      if (y > 220) { doc.addPage(); y = 30; }
      doc.setFontSize(14);
      doc.text('PRESTASI ATLET', 20, y);
      y += 6;
      doc.line(20, y, pageWidth - 20, y);
      y += 8;

      let col = 0;
      for (let i = 0; i < atletPrestasi.length; i++) {
        const p = atletPrestasi[i];
        const xPos = 20 + (col * 58);
        if (y > 250) { doc.addPage(); y = 30; }

        doc.setFontSize(10);
        doc.text(`• ${p.JenisKejuaraan}`, xPos, y);
        y += 5;
        doc.text(`  ${p.Tanggal}`, xPos, y);
        y += 5;
        addWrappedText(`  ${p.Lokasi} - ${p.Medali}`, xPos, 55, 5);

        col++;
        if (col >= 3) { col = 0; y += 8; }
      }
      y += 8;
    }

    if (y > 220) { doc.addPage(); y = 30; }
    doc.setFontSize(14);
    doc.text('RINGKASAN PERFORMA', 20, y);
    y += 6;
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Total Sesi Latihan : ${totalSessions}`, 20, y); y += 6;
    doc.text(`Rata-rata Energy   : ${avgEnergy} / 10`, 20, y); y += 6;
    doc.text(`Rata-rata Fatigue  : ${avgFatigue} / 10`, 20, y); y += 10;

    if (lineRef.current && atletSessions.length > 0) {
      if (y > 180) { doc.addPage(); y = 30; }
      const canvas = await captureWithDelay(lineRef);
      if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 75); y += 82; }
    }

    if (radarRef.current && totalSessions > 0) {
      if (y > 180) { doc.addPage(); y = 30; }
      const canvas = await captureWithDelay(radarRef);
      if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 75); y += 82; }
    }

    if (atletClimbing.length > 0) {
      if (y > 200) { doc.addPage(); y = 30; }
      doc.setFontSize(14);
      doc.text('PROGRES LATIHAN PANJAT TEBING', 20, y);
      y += 6;
      doc.line(20, y, pageWidth - 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.text(`Total Minggu Data: ${atletClimbing.length}`, 20, y); y += 6;
      doc.text(`Grade Awal → Akhir: ${atletClimbing[0].grade} → ${atletClimbing[atletClimbing.length - 1].grade}`, 20, y); y += 6;
      doc.text(`Total Volume: ${atletClimbing.reduce((sum, c) => sum + c.volumeClimbing, 0)}`, 20, y); y += 10;

      atletClimbing.forEach((c, i) => {
        if (y > 255) { doc.addPage(); y = 30; }
        doc.setFontSize(10);
        doc.text(`${i + 1}. Minggu ${c.minggu} | Grade: ${c.grade} | Volume: ${c.volumeClimbing} | Sends: ${c.sends}`, 20, y);
        y += 6;
      });
      y += 8;

      if (climbingRef.current) {
        if (y > 170) { doc.addPage(); y = 30; }
        const canvas = await captureWithDelay(climbingRef);
        if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 75); y += 82; }
      }

      if (strengthChartRef.current) {
        if (y > 170) { doc.addPage(); y = 30; }
        const canvas = await captureWithDelay(strengthChartRef);
        if (canvas) { doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, y, 165, 75); y += 82; }
      }
    }

    if (y > 200) { doc.addPage(); y = 30; }
    doc.setFontSize(14);
    doc.text('RIWAYAT LATIHAN', 20, y);
    y += 6;
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    atletSessions.forEach((s, i) => {
      if (y > 255) { doc.addPage(); y = 30; }
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${s.Tanggal} - ${s.JenisSesi} | Grade: ${s.Grade || '-'}`, 20, y);
      doc.text(`   Energy: ${s.EnergyLevel || '-'} | Fatigue: ${s.Fatigue || '-'}`, 25, y + 5);
      y += 14;
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a1428] via-[#1e2937] to-[#0f172a] text-white pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">🏔️</div>
            <div>
              <h1 className="text-3xl font-bold">CICAPORA</h1>
              <p className="text-orange-400 text-sm -mt-1">SPORT CLIMBING</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-3 border border-orange-400 text-orange-400 rounded-2xl hover:bg-orange-400 hover:text-white transition-all"
          >
            Kembali ke Home
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-4xl font-bold text-center mb-10">Area Atlet</h1>

        {!selectedAtlet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {atlets.map((atlet, index) => (
              <div 
                key={index} 
                onClick={() => setSelectedAtlet(atlet)} 
                className="bg-white/5 border border-white/10 hover:border-orange-400 rounded-3xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all h-full flex flex-col"
              >
                {atlet.Foto ? (
                  <img src={atlet.Foto} alt={atlet.Nama} className="w-full h-60 object-cover" />
                ) : (
                  <div className="h-60 bg-white/5 flex items-center justify-center text-6xl">🏔️</div>
                )}
                <div className="p-6 flex-1">
                  <h3 className="text-2xl font-semibold mb-2">{atlet.Nama}</h3>
                  <p className="text-slate-400">
                    {calculateAge(atlet.TanggalLahir)} • {atlet.GolonganDarah}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedAtlet && (
          <div className="space-y-10">
            <button 
              onClick={() => setSelectedAtlet(null)} 
              className="flex items-center gap-2 text-orange-400 hover:text-white transition font-medium"
            >
              ← Kembali ke Daftar Atlet
            </button>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
                {selectedAtlet.Foto && (
                  <img src={selectedAtlet.Foto} alt="" className="w-40 h-40 rounded-2xl object-cover border-4 border-orange-400/30" />
                )}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-bold">{selectedAtlet.Nama}</h1>
                  <p className="text-xl text-slate-400 mt-3">
                    {calculateAge(selectedAtlet.TanggalLahir)} • {selectedAtlet.GolonganDarah}
                  </p>
                </div>
                <button 
                  onClick={downloadPDF}
                  className="mt-6 md:mt-0 px-10 py-4 bg-sky-500 hover:bg-sky-600 rounded-2xl font-bold text-lg w-full md:w-auto transition"
                >
                  Unduh Laporan PDF
                </button>
              </div>

              {/* Data Lengkap Atlet */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-semibold mb-6 text-orange-400">Data Lengkap Atlet</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-lg">
                  <p><strong>Nama:</strong> {selectedAtlet.Nama}</p>
                  <p><strong>Usia:</strong> {calculateAge(selectedAtlet.TanggalLahir)}</p>
                  <p><strong>Jenis Kelamin:</strong> {selectedAtlet.JenisKelamin || '-'}</p>
                  <p><strong>Level:</strong> {selectedAtlet.Level || '-'}</p>
                  <p><strong>Tempat Lahir:</strong> {selectedAtlet.TempatLahir || '-'}</p>
                  <p><strong>Tanggal Lahir:</strong> {selectedAtlet.TanggalLahir || '-'}</p>
                  <p><strong>Golongan Darah:</strong> {selectedAtlet.GolonganDarah}</p>
                  <p><strong>Alamat:</strong> {selectedAtlet.Alamat || '-'}</p>
                  <p className="sm:col-span-2"><strong>Riwayat Penyakit:</strong> {selectedAtlet.RiwayatPenyakit || 'Tidak ada'}</p>
                </div>
              </div>

              {/* Prestasi */}
              {atletPrestasi.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-2xl font-semibold mb-6 text-emerald-400">🏆 Prestasi Atlet</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {atletPrestasi.map(p => (
                      <div key={p.id} className="bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-6">
                        <strong className="text-lg">{p.JenisKejuaraan}</strong><br />
                        <small className="text-slate-400">{p.Tanggal} • {p.Lokasi}</small><br />
                        <span className="text-emerald-400 font-bold mt-4 block text-xl">{p.Medali}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                <div ref={lineRef} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Tren Energy & Fatigue</h3>
                  <div className="h-80">
                    {atletSessions.length > 0 ? <Line data={lineData} options={lineOptions} /> : <p>Belum ada data</p>}
                  </div>
                </div>
                <div ref={radarRef} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-xl font-semibold mb-4">8 Unsur Kebugaran Jasmani</h3>
                  <div className="h-80">
                    {totalSessions > 0 ? <Radar data={radarData} options={radarOptions} /> : <p>Belum ada data</p>}
                  </div>
                </div>
              </div>

              {/* Riwayat Latihan */}
              <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-6">Riwayat Latihan</h3>
                {atletSessions.length === 0 ? (
                  <p>Belum ada data latihan.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {atletSessions.map(s => (
                      <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm">
                        <strong className="text-orange-400">{s.Tanggal}</strong><br />
                        <span className="text-slate-300">{s.JenisSesi}</span><br />
                        Grade: {s.Grade || '-'} | Energy: {s.EnergyLevel || '-'}<br />
                        Fatigue: {s.Fatigue || '-'}
                        {s.Catatan && <p className="text-slate-400 mt-3 text-xs">{s.Catatan}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progres Panjat Tebing */}
              <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-6 text-blue-400">🧗 Progres Latihan Panjat Tebing Detail</h3>
                {atletClimbing.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                    Belum ada data progres panjat tebing.
                  </div>
                ) : (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-x-auto mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-blue-900/30">
                            <th className="p-3 text-left">Minggu</th>
                            <th className="p-3 text-left">Grade</th>
                            <th className="p-3 text-left">Volume</th>
                            <th className="p-3 text-left">Sends</th>
                            <th className="p-3 text-left">Finger (s)</th>
                            <th className="p-3 text-left">Pull-up (kg)</th>
                            <th className="p-3 text-left">Core (s)</th>
                            <th className="p-3 text-left">Endurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atletClimbing.map((c, i) => (
                            <tr key={i} className="border-b border-white/10">
                              <td className="p-3 font-bold">{c.minggu}</td>
                              <td className="p-3"><strong className="text-blue-400">{c.grade}</strong></td>
                              <td className="p-3">{c.volumeClimbing}</td>
                              <td className="p-3">{c.sends}</td>
                              <td className="p-3">{c.fingerHang20mm}</td>
                              <td className="p-3">{c.weightedPullupKg}</td>
                              <td className="p-3">{c.corePlankSec}</td>
                              <td className="p-3">{c.enduranceArcMin} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div ref={climbingRef} className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
                      <h4 className="font-semibold mb-4">Progres Grade Maksimal</h4>
                      <div className="h-80"><Line data={gradeChartData} options={gradeOptions} /></div>
                    </div>

                    <div ref={strengthChartRef} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                      <h4 className="font-semibold mb-4">Kekuatan Jari & Pulling Strength</h4>
                      <div className="h-80"><Line data={strengthChartData} options={strengthOptions} /></div>
                    </div>
                  </>
                )}
              </div>

              {/* Evaluasi & Jadwal */}
              <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-6 text-yellow-400">📊 Evaluasi & Jadwal Latihan Mendatang</h3>

                {atletClimbing.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
                    <h4 className="font-semibold mb-4">Progress Climbing (Recharts)</h4>
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

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h4 className="font-semibold mb-4">Jadwal Latihan Mendatang</h4>
                  {upcomingTrainings.length === 0 ? (
                    <p>Belum ada jadwal mendatang untuk atlet ini.</p>
                  ) : (
                    <div className="space-y-4">
                      {upcomingTrainings.map((u, i) => (
                        <div key={i} className="bg-yellow-900/30 border border-yellow-500/30 rounded-2xl p-5">
                          <strong>{u.tanggal}</strong> — {u.jenis_sesi}<br />
                          Lokasi: {u.lokasi || '-'}<br />
                          {u.catatan && <small className="text-slate-400">{u.catatan}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sertifikat */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-emerald-400">📜 Sertifikat Atlet</h3>
                {certificates.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
                    Belum ada sertifikat.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="bg-emerald-900/30 border border-emerald-500/30 rounded-3xl p-6">
                        <h4 className="text-lg font-semibold text-emerald-300">{cert.certificate_name}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                          Di-upload: {new Date(cert.uploaded_at).toLocaleDateString('id-ID')}
                        </p>
                        <button 
                          onClick={() => downloadCertificate(cert.file_url, cert.certificate_name)} 
                          className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold transition"
                        >
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