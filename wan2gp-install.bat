@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo   Wan2GP Standalone Installer ^& Launcher (NVIDIA)
echo ====================================================
echo.

:: Path to Miniforge Conda from Pinokio
set CONDA_BAT=C:\AI-Diary\Wan2GP\miniforge\condabin\conda.bat

if not exist "%CONDA_BAT%" (
    echo [ERROR] No se pudo encontrar Conda en la ruta: C:\PinokioSource\bin\miniforge\condabin\conda.bat
    echo Por favor verifica que Miniforge se haya instalado correctamente en ese directorio.
    pause
    exit /b
)

echo [1/5] Inicializando entorno Conda...
call "%CONDA_BAT%" activate base
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo activar el entorno base de Conda.
    pause
    exit /b
)

:: Install Git in the base conda environment if it doesn't exist
echo [2/5] Buscando/Instalando Git en Conda...
call conda list git | findstr /i "git" >nul
if %errorlevel% neq 0 (
    echo Git no esta instalado en Conda. Instalando Git...
    call conda install -y -c conda-forge git
) else (
    echo Git ya esta instalado en Conda.
)

:: Clone the Wan2GP repository if it doesn't exist
echo [3/5] Descargando el codigo de Wan2GP...
if not exist "Wan2GP" (
    call git clone https://github.com/deepbeepmeep/Wan2GP.git
    cd Wan2GP
) else (
    echo La carpeta Wan2GP ya existe. Verificando archivos...
    cd Wan2GP
    if not exist "wgp.py" (
        echo Descargando codigo de Wan2GP en la carpeta existente...
        call git init
        call git remote add origin https://github.com/deepbeepmeep/Wan2GP.git
        call git fetch
        call git checkout -f main
    )
)

:: Create the conda environment if it doesn't exist
echo [4/5] Creando entorno de Python (wan2gp)...
call conda env list | findstr /b /i /c:"wan2gp " >nul
if %errorlevel% neq 0 (
    echo Creando entorno wan2gp con Python 3.10...
    call conda create -n wan2gp python=3.10 -y
) else (
    echo El entorno wan2gp ya existe.
)

:: Activate the wan2gp environment
echo Activando entorno wan2gp...
call conda activate wan2gp

:: Install PyTorch and Dependencies
echo [5/5] Instalando PyTorch (CUDA 12.1) y librerias necesarias...
:: Check if torch is installed
python -c "import torch" 2>nul
if %errorlevel% neq 0 (
    echo Instalando PyTorch...
    call pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    echo Instalando requisitos de Wan2GP...
    call pip install -r requirements.txt
) else (
    echo PyTorch ya esta instalado. Instalando/Actualizando dependencias restantes...
    call pip install -r requirements.txt
)

echo.
echo ====================================================
echo   Instalacion completada con exito.
echo   Iniciando Wan2GP...
echo ====================================================
echo.

call python wgp.py

pause
