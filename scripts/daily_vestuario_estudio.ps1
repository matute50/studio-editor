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

    Write-Host "$label [Script desactivado] Ya no procesamos el par $targetDir"
}

# Procesar todos los pares
foreach ($par in $pares) {
    Procesar-Par (Join-Path $root $par.source) (Join-Path $root $par.target)
}
Write-Host "Desactivada la rotación diaria de vestuario por petición."
