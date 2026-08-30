import React from 'react';

interface OgleArasiDilekcesiProps {
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

export const OgleArasiDilekcesiPrint: React.FC<OgleArasiDilekcesiProps> = ({ schoolName, student }) => {
  
  // Öğle arası dilekçesinde 2 adet dilekçe kısmı var (üst ve alt) kesilip verilmek için muhtemelen
  const DilekceKismi = () => (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '10px 20px'
    }}>
      <div style={{ padding: '30px', border: '1px dashed #ccc', width: '100%' }}>
        <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '30px', fontSize: '15px' }}>
          {(schoolName || '').toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
        </h3>
        
        <p style={{ textAlign: 'justify', marginBottom: '20px', textIndent: '40px', lineHeight: '1.5' }}>
          Velisi bulunduğum okulunuz <strong>{student?.className || <span style={{ display: 'inline-block', width: '60px', borderBottom: '1px dotted black' }}></span>}</strong> sınıfı, <strong>{student?.schoolNumber || <span style={{ display: 'inline-block', width: '60px', borderBottom: '1px dotted black' }}></span>}</strong> numaralı öğrencisi <strong>{student ? student.fullName : <span style={{ display: 'inline-block', width: '180px', borderBottom: '1px dotted black' }}></span>}</strong>'nin öğle arası dinlenme tatilinde okul dışına çıkmasına ve öğle yemeğini okul dışında yemesine izin veriyorum. Öğle arası tatilinde okul dışında bulunduğu saatlerde öğrencimin karşılaşabileceği her türlü olumsuzlukta sorumluluğun tarafıma ait olduğunu kabul ve taahhüt ediyorum.
        </p>

        <p style={{ textAlign: 'left', marginBottom: '30px', textIndent: '40px' }}>
          Gereğini arz ederim.
        </p>

        <table style={{ width: '100%', marginTop: '20px', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ width: '60%', verticalAlign: 'top', paddingRight: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                  <strong style={{ marginRight: '10px' }}>Telefon:</strong>
                  <div style={{ flex: 1, borderBottom: '1px solid black' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                  <strong style={{ marginRight: '10px' }}>Adres:</strong>
                  <div style={{ flex: 1, borderBottom: '1px solid black' }}></div>
                </div>
                <div style={{ width: '100%', borderBottom: '1px solid black', height: '15px' }}></div>
              </td>
              <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'top' }}>
                <p style={{ margin: '0 0 40px 0' }}>
                  <strong>Veli Adı Soyadı:</strong><br /><br />
                  {student?.parents?.[0] ? student.parents[0].fullName : <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px solid black' }}></span>}
                </p>
                <p style={{ margin: 0 }}>İmza</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: A4 portrait;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100vh !important;
              overflow: hidden !important;
              background-color: white !important;
            }
            /* Tüm dış etkenleri (Tailwind space-y vb.) yok saymak için absolute konumlandırma */
            #print-root {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .print-document {
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}
      </style>
      <div className="print-document" style={{ 
        fontFamily: '"Times New Roman", Times, serif', 
        fontSize: '14px', 
        color: 'black', 
        height: '296mm', /* Sayfanın tam boyutu. */
        overflow: 'hidden', 
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        justifyContent: 'space-between'
      }}>
        <DilekceKismi />
        <DilekceKismi />
      </div>
    </>
  );
};
