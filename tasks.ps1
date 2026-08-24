# Wrapper PowerShell dos alvos padronizados. Logica em tasks.py (fonte unica).
# Uso: .\tasks.ps1 <alvo>   (setup | clean | test | run-pipeline | lint | format | map | help)
# Compativel com Windows PowerShell 5.1 e PowerShell 7+.
param([Parameter(Position = 0)][string]$Target = "help")

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $py) { Write-Error "Python nao encontrado no PATH."; exit 1 }

& $py.Source (Join-Path $PSScriptRoot "tasks.py") $Target
exit $LASTEXITCODE
