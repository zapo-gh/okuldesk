@echo off
chcp 65001 > nul
echo ====================================================
echo  Alize MTAL - Firebase Web Onay Portalı Yayınlama
echo ====================================================
echo.
echo 1. Adım: Google hesabınızla giriş yapılıyor...
echo (Açılan tarayıcı penceresinde Firebase projesini açtığınız Google hesabınızı seçiniz)
echo.
call npx --yes firebase-tools deploy --only hosting,firestore:rules
echo.
echo ====================================================
echo  Tebrikler! Yayınlama tamamlandı.
echo  Resmi Web Adresiniz: https://alizmtal-wp-onay.web.app
echo ====================================================
pause
