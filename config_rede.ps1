# Arquivo: config_rede.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO DE REDE - CRONORACING MANAGERKIT" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Busca adaptadores de rede (aceitando dongles USB) e remove ativamente Wi-Fi e Virtuais
$adaptadores = Get-NetAdapter | Where-Object { 
    $_.Name -notmatch "Wi-Fi|Bluetooth|vEthernet|Loopback" -and 
    $_.InterfaceDescription -notmatch "Wireless|802.11|Bluetooth|Virtual|VMware|Hyper-V|TAP-Windows|VPN"
}

# 2. Tratamento se não achar nada
if ($adaptadores.Count -eq 0) {
    Write-Host " Nenhuma placa de rede Ethernet a cabo foi encontrada neste computador!" -ForegroundColor Red
    Write-Host " Verifique se o cabo esta conectado ou se os drivers estao instalados." -ForegroundColor Yellow
    Write-Host ""
    Write-Host " Fechando em 5 segundos..."
    Start-Sleep -Seconds 5
    exit
}

# 3. Mostra as opções para o cliente
Write-Host " Placas Ethernet disponiveis encontradas:" -ForegroundColor Green
Write-Host ""

for ($i = 0; $i -lt $adaptadores.Count; $i++) {
    Write-Host " [$($i + 1)] $($adaptadores[$i].Name) - $($adaptadores[$i].InterfaceDescription)" -ForegroundColor White
}

Write-Host ""
$escolha = Read-Host " Digite o numero da placa que deseja configurar (ou pressione ENTER para pular)"

if ([string]::IsNullOrWhiteSpace($escolha)) {
    Write-Host " Configuracao de rede ignorada pelo usuario." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    exit
}

$indice = [int]$escolha - 1

# 4. Aplica a configuração na placa escolhida
if ($indice -ge 0 -and $indice -lt $adaptadores.Count) {
    $adaptadorEscolhido = $adaptadores[$indice]
    Write-Host ""
    Write-Host " Aplicando configuracoes na placa: $($adaptadorEscolhido.Name)..." -ForegroundColor Yellow
    
    # Remove IP Fixo antigo (se houver) para evitar conflitos
    Remove-NetIPAddress -InterfaceAlias $adaptadorEscolhido.Name -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    
    # Desativa o DHCP e seta o IP, Máscara (PrefixLength 24 = 255.255.255.0) e Gateway
    New-NetIPAddress -InterfaceAlias $adaptadorEscolhido.Name -IPAddress "192.168.0.20" -PrefixLength 24 -DefaultGateway "192.168.0.1" -ErrorAction SilentlyContinue | Out-Null
    
    # Opcional: Define o DNS do Google para evitar perda de navegação caso a rede tenha internet
    Set-DnsClientServerAddress -InterfaceAlias $adaptadorEscolhido.Name -ServerAddresses "8.8.8.8","8.8.4.4" -ErrorAction SilentlyContinue | Out-Null

    Write-Host ""
    Write-Host " SUCESSO! Rede configurada para o IP 192.168.0.20" -ForegroundColor Green
    Write-Host ""
    Write-Host " O Servidor CronoRacing podera ser acessado nos outros computadores por:" -ForegroundColor Cyan
    Write-Host " http://192.168.0.20:3000" -ForegroundColor White
    
} else {
    Write-Host " Numero invalido. Nenhuma alteracao foi feita." -ForegroundColor Red
}

Write-Host ""
Write-Host " Fechando em 5 segundos..."
Start-Sleep -Seconds 5