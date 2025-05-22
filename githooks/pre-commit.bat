@echo off
for /f "delims=" %%i in ('git log -1 --pretty=%%s') do echo window.GIT_COMMIT_MSG = '%%i'; > version.js
git add version.js