; Kurulum/kaldirma oncesi OkulDesk arka plan servisini (node.exe sidecar) kapatir.
; Aksi halde Prisma query engine DLL'i kilitli kalir ve "Error opening file for writing" hatasi olusur.

!macro NSIS_HOOK_PREINSTALL
  ; Uygulamanin ve node sidecar'in tamamen kapandigindan emin olmak icin taskkill kullanilir
  nsExec::Exec `taskkill /F /IM okuldesk.exe /T`
  nsExec::Exec `taskkill /F /IM node.exe /T`
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec `taskkill /F /IM okuldesk.exe /T`
  nsExec::Exec `taskkill /F /IM node.exe /T`
  Sleep 2000
!macroend
