export interface PrintPdfOptions {
  title?: string;
  subtitle?: string;
  fileName?: string;
  autoPrint?: boolean;
}

/**
 * OkulDesk Evrensel PDF Yazdırma ve Önizleme Modülü
 * Chromium (Chrome, Edge) ve Tauri (WebView2) ortamlarında gizli iframe kısıtlamalarını
 * aşarak kullanıcıya zengin, etkileşimli ve güvenilir bir yazdırma/önizleme ekranı sunar.
 */
export const printPdfBlob = (
  blob: Blob,
  optionsOrTitle?: string | PrintPdfOptions
) => {
  const options: PrintPdfOptions =
    typeof optionsOrTitle === 'string'
      ? { title: optionsOrTitle }
      : optionsOrTitle || {};

  const title = options.title || 'Belge Yazdırma ve Önizleme';
  const subtitle =
    options.subtitle ||
    'Belgeyi inceleyebilir, doğrudan yazdırabilir veya PDF olarak indirebilirsiniz.';
  const fileName = options.fileName || 'belge.pdf';
  const autoPrint = options.autoPrint !== false;

  const pdfBlob =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);

  // Varsa önceki modalı temizle
  const existingModal = document.getElementById('okuldesk-pdf-preview-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Modal konteyneri
  const modalContainer = document.createElement('div');
  modalContainer.id = 'okuldesk-pdf-preview-modal';
  modalContainer.className =
    'fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200';

  modalContainer.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col h-[92vh] max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200" id="okuldesk-modal-card">
      <!-- Modal Başlığı -->
      <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/90 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-slate-900 truncate" id="okuldesk-pdf-title"></h3>
            <p class="text-xs text-slate-500 truncate" id="okuldesk-pdf-subtitle"></p>
          </div>
        </div>

        <!-- Butonlar -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            id="okuldesk-btn-print"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition shadow-xs cursor-pointer"
            title="Yazdırma ekranını aç"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <span>Yazdır</span>
          </button>

          <button
            type="button"
            id="okuldesk-btn-newtab"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Yeni tarayıcı sekmesinde aç"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            <span class="hidden sm:inline">Yeni Sekme</span>
          </button>

          <button
            type="button"
            id="okuldesk-btn-download"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="PDF dosyasını bilgisayara indir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span class="hidden sm:inline">İndir</span>
          </button>

          <button
            type="button"
            id="okuldesk-btn-close"
            class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
            title="Kapat (ESC)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Modal Gövdesi: PDF Iframe -->
      <div class="flex-1 p-2 bg-slate-100 flex items-center justify-center overflow-hidden min-h-0">
        <iframe
          id="okuldesk-pdf-iframe"
          src="${url}"
          class="w-full h-full rounded-xl border border-slate-300 bg-white shadow-inner"
          title="${title}"
        ></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  // Metinleri güvenli bir şekilde ata
  const titleEl = document.getElementById('okuldesk-pdf-title');
  if (titleEl) titleEl.textContent = title;
  const subtitleEl = document.getElementById('okuldesk-pdf-subtitle');
  if (subtitleEl) subtitleEl.textContent = subtitle;

  const iframe = document.getElementById('okuldesk-pdf-iframe') as HTMLIFrameElement;
  const btnPrint = document.getElementById('okuldesk-btn-print');
  const btnNewTab = document.getElementById('okuldesk-btn-newtab');
  const btnDownload = document.getElementById('okuldesk-btn-download');
  const btnClose = document.getElementById('okuldesk-btn-close');

  // Kapatma fonksiyonu
  const cleanupAndClose = () => {
    window.removeEventListener('keydown', handleKeyDown);
    if (document.body.contains(modalContainer)) {
      document.body.removeChild(modalContainer);
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanupAndClose();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // Kart dışına (backdrop) tıklayınca kapat
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      cleanupAndClose();
    }
  });

  if (btnClose) {
    btnClose.addEventListener('click', cleanupAndClose);
  }

  // Yazdırma eylemi
  const triggerPrint = () => {
    try {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.open(url, '_blank');
      }
    } catch {
      window.open(url, '_blank');
    }
  };

  if (btnPrint) {
    btnPrint.addEventListener('click', triggerPrint);
  }

  // Yeni sekmede aç eylemi
  if (btnNewTab) {
    btnNewTab.addEventListener('click', () => {
      window.open(url, '_blank');
    });
  }

  // İndirme eylemi
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Otomatik yazdırma isteği varsa iframe yüklendiğinde tetikle
  if (autoPrint && iframe) {
    iframe.onload = () => {
      setTimeout(() => {
        triggerPrint();
      }, 700);
    };
  }
};

