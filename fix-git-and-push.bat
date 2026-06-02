@echo off
title Fix Git + Push SportBar
echo Eliminando locks de git...
del /f /q "C:\laragon\www\sportbar\.git\HEAD.lock" 2>nul
del /f /q "C:\laragon\www\sportbar\.git\config.lock" 2>nul
del /f /q "C:\laragon\www\sportbar\.git\index.lock" 2>nul
echo Locks eliminados.
echo.
cd /d C:\laragon\www\sportbar
echo Enmendando commit (removiendo credential)...
git rm --cached .claude/settings.local.json 2>nul
git add .gitignore
git -c user.name="Carlos Bolivar" -c user.email="carbolivar@gmail.com" commit --amend --no-edit
echo.
echo Forzando push...
git push --force-with-lease
echo.
echo === Resultado ===
git log --oneline -1
pause
