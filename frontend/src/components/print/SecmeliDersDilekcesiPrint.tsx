import React, { useEffect, useState } from 'react';

interface SecmeliDersDilekcesiProps {
  schoolName: string;
  student?: {
    fullName: string;
    schoolNumber: string;
    tcNo?: string;
    className?: string;
    parents?: Array<{ fullName: string }>;
  } | null;
  principalName?: string;
  assistantPrincipalName?: string;
}

export const SecmeliDersDilekcesiPrint: React.FC<SecmeliDersDilekcesiProps> = ({ schoolName, student }) => {
  const [electiveGroups, setElectiveGroups] = useState<{name: string, courses: string[]}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('okuldesk_elective_courses_v1');
    if (saved) {
      try {
        setElectiveGroups(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setElectiveGroups([
      { name: 'İNSAN, TOPLUM VE BİLİM', courses: ['ASTRONOMİ VE UZAY BİLİMLERİ', 'SOSYAL BİLİM ÇALIŞMALARI', 'BİLİŞİM TEKNOLOJİLERİ VE YAZILIM', 'PROJE TASARIMI VE UYGULAMALARI', 'DÜŞÜNME EĞİTİMİ', 'DEMOKRASİ VE İNSAN HAKLARI', 'METİN TAHLİLLERİ', 'SEÇMELİ İKİNCİ YABANCI DİL'] },
      { name: 'DİN, AHLÂK VE DEĞER', courses: ['KUR’AN-I KERİM', 'PEYGAMBERİMİZİN HAYATI', 'TEMEL DİNÎ BİLGİLER'] },
      { name: 'KÜLTÜR, SANAT VE SPOR', courses: ['TÜRK SOSYAL HAYATINDA AİLE', 'İSLAM BİLİM TARİHİ', 'SPOR EĞİTİMİ', 'SANAT EĞİTİMİ'] }
    ]);
  }, []);

  return (
    <div className="print-document" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.5', color: 'black', padding: '10px 20px' }}>
      
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '25px', fontSize: '16px' }}>
        {(schoolName || '').toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </h3>
      
      <p style={{ textAlign: 'justify', marginBottom: '20px', textIndent: '40px' }}>
        Velisi bulunduğum okulunuz <strong>{student?.className || '......'}</strong> sınıfı <strong>{student?.schoolNumber || '......'}</strong> numaralı öğrencisi <strong>{student ? student.fullName : '...................................................'}</strong>'nin 2026-2027 eğitim öğretim yılında aşağıda seçtiğim seçmeli dersleri almasını istiyorum.
      </p>

      <p style={{ textAlign: 'left', marginBottom: '20px', textIndent: '40px' }}>
        Gereğini arz ederim.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', minWidth: '200px' }}>
          <p style={{ margin: '0 0 20px 0' }}>İmza</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {student?.parents?.[0] ? student.parents[0].fullName : 'Velinin Adı Soyadı'}
          </p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ padding: '4px', width: '30%', border: '1px solid black' }}>GRUP</th>
            <th style={{ padding: '4px', width: '50%', border: '1px solid black' }}>DERS ADI</th>
            <th style={{ padding: '4px', width: '20%', border: '1px solid black' }}>TERCİH EDİLEN DERS</th>
          </tr>
        </thead>
        <tbody>
          {electiveGroups.map((group, gIdx) => {
            const rowCount = group.courses.length || 1;
            const bgColor = gIdx % 2 === 1 ? '#e5e7eb' : 'transparent';
            
            return (
              <React.Fragment key={gIdx}>
                {group.courses.length === 0 ? (
                  <tr style={{ backgroundColor: bgColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <td style={{ padding: '4px', border: '1px solid black', fontWeight: 'bold' }}>{group.name}</td>
                    <td style={{ padding: '4px', border: '1px solid black' }}>-</td>
                    <td style={{ padding: '4px', border: '1px solid black' }}></td>
                  </tr>
                ) : (
                  group.courses.map((course, cIdx) => (
                    <tr key={cIdx} style={{ backgroundColor: bgColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      {cIdx === 0 && (
                        <td rowSpan={rowCount} style={{ padding: '4px', border: '1px solid black', fontWeight: 'bold' }}>{group.name}</td>
                      )}
                      <td style={{ padding: '4px', border: '1px solid black' }}>{course}</td>
                      <td style={{ padding: '4px', border: '1px solid black' }}></td>
                    </tr>
                  ))
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '10px', padding: '10px', border: '1px solid black' }}>
        <strong>NOTLAR:</strong>
        <ul style={{ paddingLeft: '20px', margin: '5px 0 0 0' }}>
          <li>3 Ders seçilmelidir.</li>
          <li>3 gruptan da en az bir ders seçilmek zorundadır.</li>
        </ul>
      </div>
    </div>
  );
};
