# daily_vestuario_estudio.ps1
# Selecciona una imagen aleatoria de cada carpeta fuente y la copia
# a la carpeta destino como REFERENCE_IMAGE.PNG + 30 copias numeradas.
# Lock por carpeta destino — se ejecuta una sola vez por día.
#
# Uso:
#   .\scripts\daily_vestuario_estudio.ps1

$root = "f:\GEMINI-CLI\SALADILLOVIVO_NEXT\editor saladillovivo\studio-editor"
$today = (Get-Date).ToString("yyyy-MM-dd")

# Pares fuente → destino
$pares = @(
    @{ source = "vestuario_estudio"; target = "vestuario_de_hoy_estudio" },
    @{ source = "vestuario_exteriores"; target = "vestuario_de_hoy_exteriores" }
)

function Procesar-Par($sourceDir, $targetDir) {
    $label = "[$sourceDir → $targetDir]"
    $lockFile = Join-Path $targetDir ".last_update"

    # 1. Verificar si ya se ejecutó hoy
    if (Test-Path $lockFile) {
        $lastRun = (Get-Content $lockFile -Raw).Trim()
        if ($lastRun -eq $today) {
            $files = Get-ChildItem $targetDir -File | Where-Object { $_.Name -ne '.last_update' }
            $actual = if ($files.Count -gt 0) { $files[0].Name } else { 'ninguno' }
            Write-Host "$label Ya actualizado hoy ($today). Actual: $actual"
            return
        }
    }

    # 2. Obtener imágenes disponibles
    $imagenes = Get-ChildItem $sourceDir -File | Where-Object {
        $_.Extension -match '^\.(png|jpg|jpeg|webp)$'
    }
    if ($imagenes.Count -eq 0) {
        Write-Error "$label [ERROR] No hay imágenes en: $sourceDir"
        return
    }

    # 3. Selección aleatoria
    $elegida = $imagenes | Get-Random
    Write-Host "$label Imagen elegida: $($elegida.Name)"

    # 4. Limpiar destino (excepto lock) y copiar
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    else {
        Get-ChildItem $targetDir -File | Where-Object { $_.Name -ne '.last_update' } | Remove-Item -Force
    }

    # REFERENCE_IMAGE.PNG
    $dest = Join-Path $targetDir "REFERENCE_IMAGE.PNG"
    Copy-Item -Path $elegida.FullName -Destination $dest -Force

    # 30 copias numeradas: 01.png … 30.png
    for ($i = 1; $i -le 30; $i++) {
        $num = $i.ToString('00')
        $destNum = Join-Path $targetDir "$num.png"
        Copy-Item -Path $elegida.FullName -Destination $destNum -Force
    }

    # 5. Guardar fecha de ejecución
    $today | Out-File $lockFile -Encoding utf8

    Write-Host "$label [OK] Destino: $dest | Fecha: $today"
}

# Procesar todos los pares
foreach ($par in $pares) {
    Procesar-Par (Join-Path $root $par.source) (Join-Path $root $par.target)
}
