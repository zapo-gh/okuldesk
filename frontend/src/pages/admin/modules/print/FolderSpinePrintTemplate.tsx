import React from 'react';

export type SpineType = 'wide' | 'narrow' | 'slim';

export interface FolderSpineItem {
  id: string;
  code?: string; // SDP Kodu (örn. 188.02)
  title: string; // Klasör Ana Başlığı (örn. ÖĞRETMEN NÖBETİ)
  subtitle?: string; // Alt Başlık / Açıklama (örn. 1. ve 2. Dönem)
  year?: string; // Yıl / Öğretim Yılı (örn. 2025-2026)
  folderNo?: string | number; // Klasör No (örn. 1, 01, Cilt: 1)
  colorTag?: string; // Opsiyonel renkli şerit / kategori rengi
}

export interface FolderSpinePrintTemplateProps {
  items: FolderSpineItem[];
  schoolName: string;
  topHeaderLine1?: string; // T.C.
  topHeaderLine2?: string; // VALİLİK / KAYMAKAMLIĞI
  topHeaderLine3?: string; // İLÇE MİLLÎ EĞİTİM MÜDÜRLÜĞÜ
  showLogo?: boolean;
  logoSize?: 'normal' | 'large' | 'xlarge';
  textOrientation?: 'horizontal' | 'vertical';
  titleFontSize?: number; // Sayısal punto değeri (+ - birim birim artırma/azaltma)
  fontFamily?: 'serif' | 'sans';
  spineType: SpineType;
  customWidth?: number; // mm cinsinden milimetrik hassas genişlik (örn: 50, 48, 30, 20)
  customHeight?: number; // mm cinsinden milimetrik hassas yükseklik (örn: 190)
  academicYear: string;
}

export const FolderSpinePrintTemplate = React.forwardRef<
  HTMLDivElement,
  FolderSpinePrintTemplateProps
>(({
  items,
  schoolName,
  topHeaderLine1 = 'T.C.',
  topHeaderLine2 = '',
  topHeaderLine3 = '',
  showLogo = true,
  logoSize = 'large',
  textOrientation = 'horizontal',
  titleFontSize,
  fontFamily = 'sans',
  spineType = 'wide',
  customWidth,
  customHeight,
  academicYear = '2025-2026'
}, ref) => {
  // Standart genişlik değerleri (Türkiye okulları standart büro klasör cepleri: Geniş=50mm, Dar=30mm, İnce=20mm)
  const labelWidthMm = typeof customWidth === 'number' && customWidth > 0
    ? customWidth
    : (spineType === 'wide' ? 50 : spineType === 'narrow' ? 30 : 20);

  const labelHeightMm = typeof customHeight === 'number' && customHeight > 0
    ? customHeight
    : 190;

  // Sayfa başına sığacak etiket sayısını A4 yatay ölçüsüne (280mm basılabilir alan) göre dinamik hesapla
  const gapMm = labelWidthMm <= 25 ? 1.5 : 2;
  const itemsPerPage = Math.max(1, Math.min(14, Math.floor((276 + gapMm) / (labelWidthMm + gapMm))));

  // Sayfalara böl
  const pages: FolderSpineItem[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  // Ölçü kategorisi
  const isWide = labelWidthMm >= 45;
  const isNarrow = labelWidthMm >= 28 && labelWidthMm < 45;
  const isSlim = labelWidthMm < 28;

  // Logo boyutları (Genişliğe orantılı: normal->50px, büyük->64px, çok büyük->80px)
  const getLogoSize = () => {
    if (isWide) {
      if (logoSize === 'normal') return { width: '50px', height: '50px' };
      if (logoSize === 'xlarge') return { width: '80px', height: '80px' };
      return { width: '64px', height: '64px' };
    }
    if (isNarrow) {
      if (logoSize === 'normal') return { width: '34px', height: '34px' };
      if (logoSize === 'xlarge') return { width: '52px', height: '52px' };
      return { width: '42px', height: '42px' };
    }
    // İnce / Slim (< 28mm)
    if (logoSize === 'normal') return { width: '22px', height: '22px' };
    if (logoSize === 'xlarge') return { width: '32px', height: '32px' };
    return { width: '26px', height: '26px' };
  };
  const logoDims = getLogoSize();

  // Aktif punto (Kullanıcının +/- ile belirlediği değer veya genişliğe uygun akıllı varsayılan)
  const defaultFontSize = isWide ? 13 : isNarrow ? 10 : 8.5;
  const activeFontSize = typeof titleFontSize === 'number' && titleFontSize > 0
    ? titleFontSize
    : defaultFontSize;
  const activeSubtitleSize = Math.max(6.5, Math.round(activeFontSize * 0.7));

  return (
    <div ref={ref} className="folder-spine-print-root bg-slate-100 p-4 print:p-0 print:bg-white text-slate-900 font-sans">
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .folder-spine-page {
            page-break-after: always;
            break-after: page;
            height: 198mm !important;
            margin: 0 auto !important;
          }
          .folder-spine-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        `}
      </style>

      {pages.map((pageItems, pageIdx) => (
        <div
          key={pageIdx}
          className="folder-spine-page bg-white shadow-md print:shadow-none mx-auto mb-8 print:mb-0 border border-slate-300 print:border-none rounded-lg print:rounded-none overflow-hidden"
          style={{
            width: '280mm',
            minHeight: '198mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2mm 4mm'
          }}
        >
          {/* Sayfa Üstü Kesim Kılavuz Açıklaması (Sadece ekranda görünür, çıktıda gizlenir) */}
          <div className="text-[10px] text-slate-400 mb-1 w-full flex justify-between px-2 print:hidden select-none">
            <span>✂️ Sayfa {pageIdx + 1} / {pages.length} — Kesik çizgilerden makasla keserek klasör şeffaf sırtlığına yerleştiriniz.</span>
            <span>Ölçü: {labelWidthMm}mm × {labelHeightMm}mm ({isWide ? 'Geniş' : isNarrow ? 'Dar' : 'İnce'}) • Düzen: {textOrientation === 'vertical' ? 'Dikey (90°)' : 'Yatay'}</span>
          </div>

          {/* Etiketler Konteyneri */}
          <div
            className="flex items-center justify-center w-full h-full"
            style={{
              minHeight: `${labelHeightMm}mm`,
              gap: `${gapMm}mm`
            }}
          >
            {pageItems.map((item, itemIdx) => {
              const displayYear = item.year || academicYear;
              const displayFolderNo = item.folderNo !== undefined && item.folderNo !== '' ? item.folderNo : (pageIdx * itemsPerPage + itemIdx + 1);

              return (
                <div
                  key={item.id || itemIdx}
                  className="folder-spine-item relative bg-white border-2 border-dashed border-slate-400 print:border-slate-800 flex flex-col justify-between overflow-hidden"
                  style={{
                    width: `${labelWidthMm}mm`,
                    height: `${labelHeightMm}mm`,
                    boxSizing: 'border-box',
                    padding: isWide ? '1.5mm' : isNarrow ? '1.2mm' : '0.8mm',
                    pageBreakInside: 'avoid'
                  }}
                >
                  {/* İç Düz Çizgi Çerçeve (Kesik Çizgilerin İç Kısmında Kesintisiz Düz Çerçeve) */}
                  <div className="w-full h-full border border-slate-900 flex flex-col justify-between overflow-hidden relative bg-white">
                    {/* Renkli Üst Kategori Şeridi (Varsa) */}
                    {item.colorTag && (
                      <div
                        className="w-full h-1.5 shrink-0"
                        style={{ backgroundColor: item.colorTag }}
                      />
                    )}

                    {/* ── 1. ÜST KURUMSAL BAŞLIK BLOKU ── */}
                    <div className="flex flex-col items-center text-center pt-1 px-1 border-b border-slate-800 pb-1.5 shrink-0">
                    {showLogo && (
                      <div className="flex justify-center items-center mb-1">
                        <img
                          src="/meb-logo.png"
                          alt="MEB Logo"
                          className="object-contain"
                          style={{
                            width: logoDims.width,
                            height: logoDims.height
                          }}
                        />
                      </div>
                    )}

                    <div className="leading-tight text-slate-900" style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'inherit' }}>
                      {topHeaderLine1 && (
                        <p className="font-bold tracking-wider" style={{ fontSize: isWide ? '9.5px' : isNarrow ? '7.5px' : '6.5px' }}>
                          {topHeaderLine1}
                        </p>
                      )}
                      {topHeaderLine2 && (
                        <p className="font-semibold uppercase" style={{ fontSize: isWide ? '8px' : isNarrow ? '6.5px' : '5.5px' }}>
                          {topHeaderLine2}
                        </p>
                      )}
                      {topHeaderLine3 && (
                        <p className="font-semibold uppercase" style={{ fontSize: isWide ? '8px' : isNarrow ? '6.5px' : '5.5px' }}>
                          {topHeaderLine3}
                        </p>
                      )}
                      <p
                        className="font-black uppercase text-slate-950 mt-0.5 leading-snug line-clamp-3"
                        style={{
                          fontSize: isWide ? '9px' : isNarrow ? '7.5px' : '6.5px',
                          letterSpacing: '-0.2px'
                        }}
                      >
                        {schoolName ? schoolName.toLocaleUpperCase('tr-TR') : 'OKUL ADI'}
                      </p>
                    </div>
                  </div>

                  {/* ── 2. STANDART DOSYA PLANI KODU (Üst ve alt sınır çizgileriyle tam ayrılmış) ── */}
                  {item.code && (
                    <div className="w-full flex justify-center items-center py-1.5 border-b border-slate-800 shrink-0">
                      <span
                        className="font-mono font-black text-slate-950 tracking-wider leading-none"
                        style={{
                          fontSize: isWide ? '17px' : isNarrow ? '13.5px' : '11.5px',
                          letterSpacing: isSlim ? '0.5px' : '1px'
                        }}
                      >
                        {item.code}
                      </span>
                    </div>
                  )}

                  {/* ── 3. ORTA BLOK: KLASÖR ANA BAŞLIĞI & AÇIKLAMA ── */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center my-1.5 px-0.5">
                    {/* Klasör Ana Başlığı ve Alt Açıklaması (Yatay vs Dikey Seçenekli) */}
                    {textOrientation === 'vertical' ? (
                      /* Dikey (90° Döndürülmüş) Mod: Sırt boyunca dikey akış */
                      <div
                        className="my-auto py-1 flex flex-col items-center justify-center gap-1.5"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          maxHeight: '120mm'
                        }}
                      >
                        <span
                          className="font-black text-slate-950 uppercase tracking-wider text-center"
                          style={{
                            fontSize: `${activeFontSize}px`,
                            fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'ui-sans-serif, system-ui, sans-serif',
                            lineHeight: '1.2'
                          }}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span
                            className="text-slate-600 font-medium text-center"
                            style={{
                              fontSize: `${activeSubtitleSize}px`,
                              fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'ui-sans-serif, system-ui, sans-serif',
                              opacity: 0.9
                            }}
                          >
                            ({item.subtitle})
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Yatay (Düz Satırlar) Mod — Varsayılan */
                      <div className="w-full my-auto py-1 flex flex-col items-center justify-center">
                        <h3
                          className="font-black text-slate-950 uppercase tracking-tight text-center"
                          style={{
                            fontSize: `${activeFontSize}px`,
                            lineHeight: '1.25',
                            fontFamily: fontFamily === 'serif'
                              ? 'Georgia, "Times New Roman", serif'
                              : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            wordBreak: 'normal',
                            overflowWrap: 'break-word',
                            hyphens: 'none',
                            whiteSpace: 'normal',
                            maxWidth: '100%'
                          }}
                        >
                          {item.title}
                        </h3>

                        {/* Alt Açıklama / Dönem */}
                        {item.subtitle && (
                          <p
                            className="text-slate-600 font-medium mt-1 leading-tight text-center"
                            style={{
                              fontSize: `${activeSubtitleSize}px`,
                              fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'ui-sans-serif, system-ui, sans-serif',
                              wordBreak: 'normal',
                              overflowWrap: 'break-word',
                              hyphens: 'none',
                              maxWidth: '100%'
                            }}
                          >
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── 3. ALT BLOK: YIL VE KLASÖR NO ── */}
                  <div className="border-t border-slate-800 pt-1.5 pb-1.5 px-1 text-center flex flex-col items-center shrink-0">
                    {/* Eğitim Öğretim Yılı (Daha büyük ve belirgin) */}
                    <p
                      className="font-black text-slate-950 uppercase tracking-wide leading-none mb-1"
                      style={{
                        fontSize: isWide ? '14px' : isNarrow ? '11px' : '9.5px',
                        fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'ui-sans-serif, system-ui, sans-serif'
                      }}
                    >
                      {displayYear}
                    </p>

                    {/* Klasör / Cilt Numarası Rozeti (Yılın altında daha küçük puntolarla) */}
                    <div
                      className="font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded flex items-center justify-center uppercase tracking-wider"
                      style={{
                        padding: isWide ? '1.5px 6px' : '1px 3px',
                        fontSize: isWide ? '8.5px' : isNarrow ? '7.5px' : '6.5px',
                        maxWidth: '96%'
                      }}
                    >
                      {isWide
                        ? `KLASÖR NO: ${String(displayFolderNo).padStart(2, '0')}`
                        : `NO: ${String(displayFolderNo).padStart(2, '0')}`}
                    </div>
                  </div>
                </div>

                  {/* Kesim Kılavuz Köşe Çizgileri */}
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-slate-500" />
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-slate-500" />
                  <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-slate-500" />
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-slate-500" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

FolderSpinePrintTemplate.displayName = 'FolderSpinePrintTemplate';
