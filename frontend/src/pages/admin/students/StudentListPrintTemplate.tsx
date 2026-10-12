import React from 'react';
import { Student } from './types';
import { formatPhoneNumber } from '../../../utils/formatters';

interface StudentListPrintTemplateProps {
  students: Student[];
  activeClass?: string;
  searchQuery?: string;
  settings?: any;
}

export default function StudentListPrintTemplate({
  students,
  activeClass,
  searchQuery,
  settings
}: StudentListPrintTemplateProps) {
  const schoolName = settings?.schoolName || 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ';
  const academicYear = settings?.academicYear || '2025-2026';
  const principalName = settings?.principalName || 'Okul Müdürü';
  const today = new Date().toLocaleDateString('tr-TR');

  const title = activeClass
    ? `${activeClass} SINIFI ÖĞRENCİ VE VELİ İLETİŞİM LİSTESİ`
    : searchQuery
    ? `ÖĞRENCİ ARAMA SONUÇLARI VE VELİ LİSTESİ ("${searchQuery}")`
    : 'ÖĞRENCİ VE VELİ İLETİŞİM BİLGİ LİSTESİ';

  return (
    <div className="w-[210mm] min-h-[297mm] p-6 mx-auto bg-white text-black font-sans text-[10px]" style={{ boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Resmi Antet */}
      <div className="text-center font-bold mb-3 border-b-2 border-black pb-2.5">
        <div className="text-[11px] tracking-wider">T.C.</div>
        <div className="text-[11px] tracking-wider">MİLLÎ EĞİTİM BAKANLIĞI</div>
        <div className="text-xs font-black uppercase mt-0.5 tracking-wide">{schoolName}</div>
        <div className="text-[13px] font-black underline mt-1.5 text-slate-900 tracking-wide uppercase">{title}</div>
        <div className="flex justify-between items-center text-[9.5px] text-gray-700 font-normal mt-2 px-1">
          <span><strong>Öğretim Yılı:</strong> {academicYear}</span>
          <span><strong>Toplam Öğrenci:</strong> {students.length}</span>
          <span><strong>Rapor Tarihi:</strong> {today}</span>
        </div>
      </div>

      {/* Tablo */}
      <table className="w-full border-collapse border border-slate-800 text-[9.5px]">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-900 font-bold">
            <th className="border border-slate-400 py-1 px-1 text-center w-6">#</th>
            <th className="border border-slate-400 py-1 px-1 text-center w-14 whitespace-nowrap">Okul No</th>
            <th className="border border-slate-400 py-1 px-1 text-center w-12 whitespace-nowrap">Sınıf</th>
            <th className="border border-slate-400 py-1 px-2 text-left">Öğrenci Adı Soyadı</th>
            <th className="border border-slate-400 py-1 px-2 text-left">1. Veli Adı Soyadı</th>
            <th className="border border-slate-400 py-1 px-1 text-center w-28 whitespace-nowrap">1. Veli Tel</th>
            <th className="border border-slate-400 py-1 px-2 text-left">2. Veli Adı Soyadı</th>
            <th className="border border-slate-400 py-1 px-1 text-center w-28 whitespace-nowrap">2. Veli Tel</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const p1 = student.parents && student.parents.length > 0 ? student.parents[0] : null;
            const p2 = student.parents && student.parents.length > 1 ? student.parents[1] : null;

            return (
              <tr 
                key={student.id || idx} 
                className={`break-inside-avoid ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
              >
                <td className="border border-slate-300 py-1 px-1 text-center text-slate-600 font-medium">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 py-1 px-1 text-center font-mono font-bold text-slate-900">
                  {student.schoolNumber}
                </td>
                <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-800">
                  {student.className}
                </td>
                <td className="border border-slate-300 py-1 px-2 font-bold text-slate-900">
                  {student.fullName}
                </td>
                <td className="border border-slate-300 py-1 px-2 text-slate-800 font-medium">
                  {p1 ? p1.fullName : <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[9px] text-slate-800 font-medium whitespace-nowrap tracking-tight">
                  {p1 && p1.phone ? formatPhoneNumber(p1.phone) : <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="border border-slate-300 py-1 px-2 text-slate-800">
                  {p2 ? p2.fullName : <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[9px] text-slate-800 font-medium whitespace-nowrap tracking-tight">
                  {p2 && p2.phone ? formatPhoneNumber(p2.phone) : <span className="text-slate-400 italic">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Alt Bilgi & İmza Alanı */}
      <div className="flex justify-between items-end mt-6 pt-3 border-t border-slate-300 break-inside-avoid">
        <div className="text-[9px] text-slate-600 space-y-0.5">
          <p>• Bu liste Millî Eğitim Bakanlığı mevzuatına uygun olarak okul idaresi bilgilendirme amacıyla düzenlenmiştir.</p>
          <p>• Kişisel veriler 6698 sayılı KVKK kapsamında gizli tutulmalı ve 3. şahıslarla paylaşılmamalıdır.</p>
        </div>
        <div className="text-center min-w-[160px]">
          <div className="text-[9.5px] text-slate-500 mb-0.5">{today}</div>
          <div className="font-bold text-[11px] text-slate-900 uppercase">{principalName}</div>
          <div className="text-[10px] text-slate-700 font-medium">Okul Müdürü</div>
          <div className="text-slate-400 text-[9px] mt-5">İmza / Mühür</div>
        </div>
      </div>
    </div>
  );
}
