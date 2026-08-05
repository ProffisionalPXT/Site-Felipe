@echo off
title CorreCronos - Servidor Local
color 0A

echo ========================================================
echo               CORRECRONOS - MODO LOCAL
echo ========================================================
echo.
echo Iniciando o sistema de demonstracao...
echo.

IF NOT EXIST "node_modules\" (
    echo [1/2] Instalando dependencias do projeto...
    echo Isso pode demorar alguns minutos na primeira vez.
    call npm install
) ELSE (
    echo [1/2] Dependencias ja instaladas (node_modules encontrado).
)

echo.
echo [2/2] Iniciando o servidor web local...
echo.
echo ========================================================
echo DICA: Assim que o servidor iniciar, abra no navegador:
echo            http://localhost:3000
echo ========================================================
echo.
call npm run dev

pause
