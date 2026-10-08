; Kurulum/kaldirma oncesi OkulDesk arka plan servisini (node.exe sidecar) kapatir.
; Aksi halde Prisma query engine DLL'i kilitli kalir ve "Error opening file for writing" hatasi olusur.

!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec `powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like '$INSTDIR\*' } | Stop-Process -Force"`
  Sleep 1500
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec `powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like '$INSTDIR\*' } | Stop-Process -Force"`
  Sleep 1500
!macroend
