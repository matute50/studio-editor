# script to update daily outfit (subfolders version)
# Path: f:\GEMINI-CLI\SALADILLOVIVO_NEXT\editor saladillovivo\studio-editor\scripts\update_daily_outfit.ps1

$sourceDir = "f:\GEMINI-CLI\SALADILLOVIVO_NEXT\editor saladillovivo\studio-editor\vestuario\"
$targetDir = "f:\GEMINI-CLI\SALADILLOVIVO_NEXT\editor saladillovivo\studio-editor\vestuario_de_hoy\"

# 1. Determine the outfit of the day (1-30)
$day = (Get-Date).Day
$outfitNum = (($day - 1) % 30) + 1
$outfitFile = "outfit_$(($outfitNum).ToString('00')).png"
$sourcePath = Join-Path $sourceDir $outfitFile

Write-Host "Hoy es día $day. Seleccionando outfit: $outfitFile"

if (-not (Test-Path $sourcePath)) {
    Write-Error "El archivo fuente no existe: $sourcePath"
    exit 1
}

# 2. Prepare target directory (FORCE OVERWRITE)
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force
}
else {
    # Remove old subfolders to ensure a clean start with fresh images every day
    Remove-Item -Path "$targetDir\*" -Recurse -Force
}

# 3. Create 25 numbered subfolders, each with REFERENCE_IMAGE.PNG
Write-Host "Generando 25 subcarpetas en $targetDir..."
for ($i = 1; $i -le 25; $i++) {
    $folderName = $(($i).ToString('00'))
    $folderPath = Join-Path $targetDir $folderName
    
    # Create subfolder
    New-Item -ItemType Directory -Path $folderPath -Force
    
    # Copy and rename to REFERENCE_IMAGE.PNG
    $destPath = Join-Path $folderPath "REFERENCE_IMAGE.PNG"
    Copy-Item -Path $sourcePath -Destination $destPath
}

Write-Host "¡Vestuario del día actualizado con éxito en subcarpetas!"
