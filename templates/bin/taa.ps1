<#
.SYNOPSIS
    Taz Architectural Agent (taa) - Windows PowerShell Sürümü
#>

$CONFIG_DIR = Join-Path $HOME ".taa"
$CONFIG_FILE = Join-Path $CONFIG_DIR "config.json"
$PROXY_PORT = 4000

# Bağımlılık Kontrolü
if (-not (Get-Command litellm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Hata: 'litellm' komutu bulunamadı. (pip install 'litellm[proxy]')" -ForegroundColor Red
    exit 1
}

function Init-Config {
    if (-not (Test-Path $CONFIG_DIR)) {
        New-Item -ItemType Directory -Path $CONFIG_DIR | Out-Null
    }
    if (-not (Test-Path $CONFIG_FILE)) {
        '{"suppliers":{}}' | Out-File -FilePath $CONFIG_FILE -Encoding utf8
    }
}
Init-Config

function Show-Usage {
    Write-Host "Taz Architectural Agent (taa)"
    Write-Host ""
    Write-Host "Kullanım:"
    Write-Host "  .\taa.ps1 launch <claude|codex> --supplier <isim> --model <model_adı>"
    Write-Host "  .\taa.ps1 list"
    Write-Host "  .\taa.ps1 config add --supplier <isim> --api <url> [--apikey <key>]"
    Write-Host "  .\taa.ps1 config update --supplier <isim> [--api <url>] [--apikey <key>]"
    Write-Host "  .\taa.ps1 config delete --supplier <isim>"
    exit 1
}

if ($args.Count -lt 1) { Show-Usage }

$COMMAND = $args[0]

switch ($COMMAND) {
    "launch" {
        if ($args.Count -lt 2) { Show-Usage }
        $AGENT_TYPE = $args[1]
        
        $SUPPLIER = ""
        $MODEL = ""

        for ($i = 2; $i -lt $args.Count; $i++) {
            if ($args[$i] -eq "--supplier" -and ($i + 1) -lt $args.Count) {
                $SUPPLIER = $args[$i + 1]
                $i++
            }
            elseif ($args[$i] -eq "--model" -and ($i + 1) -lt $args.Count) {
                $MODEL = $args[$i + 1]
                $i++
            }
        }

        if ([string]::IsNullOrWhiteSpace($AGENT_TYPE) -or [string]::IsNullOrWhiteSpace($SUPPLIER) -or [string]::IsNullOrWhiteSpace($MODEL)) {
            Show-Usage
        }

        $jsonContent = Get-Content -Path $CONFIG_FILE -Raw -Encoding utf8 | ConvertFrom-Json
        $supplierData = $jsonContent.suppliers.$SUPPLIER

        if ($null -eq $supplierData -or [string]::IsNullOrWhiteSpace($supplierData.api_base)) {
            Write-Host "❌ Hata: '$SUPPLIER' adında bir sağlayıcı config'de tanımlı değil!" -ForegroundColor Red
            exit 1
        }

        $API_BASE = $supplierData.api_base
        $API_KEY = if ([string]::IsNullOrWhiteSpace($supplierData.api_key)) { "dummy-key" } else { $supplierData.api_key }

        # Endpoint temizleme
        $CLEAN_API_BASE = $API_BASE -replace '/chat/completions/*$', '' -replace '/*$', ''

        Write-Host "🚀 [$SUPPLIER] sağlayıcısına bağlanılıyor..." -ForegroundColor Cyan
        Write-Host "📍 Endpoint: $CLEAN_API_BASE"
        Write-Host "🧠 Model: $MODEL"

        if ($AGENT_TYPE -eq "claude") {
            Write-Host "🔄 LiteLLM Proxy hazırlanıyor (Port: $PROXY_PORT)..." -ForegroundColor Yellow

            # Provider Tespiti
            $LITELLM_MODEL = $MODEL
            if ($CLEAN_API_BASE -like "*openrouter.ai*") {
                $LITELLM_MODEL = "openrouter/$MODEL"
            }
            elseif ($CLEAN_API_BASE -like "*11434*" -or $SUPPLIER -eq "ollama") {
                $LITELLM_MODEL = "ollama_chat/$MODEL"
                $CLEAN_API_BASE = $CLEAN_API_BASE -replace '/v1/*$', ''
            }
            elseif ($CLEAN_API_BASE -like "*nvidia.com*" -or $SUPPLIER -eq "nvidia") {
                $LITELLM_MODEL = "nvidia_nim/$MODEL"
                $CLEAN_API_BASE = "https://integrate.api.nvidia.com/v1"
            }
            else {
                $LITELLM_MODEL = "openai/$MODEL"
                if ($CLEAN_API_BASE -notlike "*/v1*") {
                    $CLEAN_API_BASE = "$CLEAN_API_BASE/v1"
                }
            }

            # Dinamik LiteLLM YAML Config Oluşturma
            $TMP_YAML = [System.IO.Path]::GetTempFileName() + ".yaml"
            $yamlContent = @"
model_list:
  - model_name: "$MODEL"
    litellm_params:
      model: "$LITELLM_MODEL"
      api_base: "$CLEAN_API_BASE"
      api_key: "$API_KEY"
      drop_params: true
    model_info:
      id: "$MODEL"
      mode: "chat"
  - model_name: "openai/$MODEL"
    litellm_params:
      model: "$LITELLM_MODEL"
      api_base: "$CLEAN_API_BASE"
      api_key: "$API_KEY"
      drop_params: true
litellm_settings:
  drop_params: true
  set_verbose: false
"@
            Set-Content -Path $TMP_YAML -Value $yamlContent -Encoding utf8

            # Portu kullanan eski süreci temizle
            $occupiedPort = Get-NetTCPConnection -LocalPort $PROXY_PORT -ErrorAction SilentlyContinue
            if ($occupiedPort) {
                Stop-Process -Id $occupiedPort.OwningProcess -Force -ErrorAction SilentlyContinue
            }

            $LOG_FILE = "$env:TEMP\litellm.log"
            if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE -Force }

            # LiteLLM Proxy'yi arka planda başlat
            $proxyProcess = Start-Process litellm -ArgumentList "--config `"$TMP_YAML`" --port $PROXY_PORT" -RedirectStandardOutput $LOG_FILE -RedirectStandardError $LOG_FILE -PassThru -NoNewWindow

            try {
                # Port Dinleme Kontrolü (Max 12 sn)
                $READY = $false
                for ($i = 1; $i -le 12; $i++) {
                    if ($proxyProcess.HasExited) { break }
                    
                    try {
                        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$PROXY_PORT/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
                        if ($res.StatusCode -eq 200) { $READY = $true; break }
                    } catch {
                        # Henüz hazır değil
                    }
                    Start-Sleep -Seconds 1
                }

                if (-not $READY) {
                    Write-Host "❌ Hata: LiteLLM Proxy başlatılamadı!" -ForegroundColor Red
                    Write-Host "📄 Hata Logu ($LOG_FILE):" -ForegroundColor Red
                    Write-Host "----------------------------------------"
                    if (Test-Path $LOG_FILE) { Get-Content $LOG_FILE -Tail 15 }
                    Write-Host "----------------------------------------"
                    exit 1
                }

                Write-Host "⚡ Claude Code başlatılıyor..." -ForegroundColor Green

                # Çevre değişkenlerini ayarla ve Claude Code çalıştır
                $env:ANTHROPIC_BASE_URL = "http://127.0.0.1:$PROXY_PORT"
                $env:ANTHROPIC_API_KEY = "sk-dummy"
                $env:ANTHROPIC_MODEL = $MODEL
                $env:CLAUDE_AUTO_TRIM_CONTEXT = "true"
                $env:MAX_CONTEXT_TOKENS = "131072"

                claude
            }
            finally {
                # Kapanışta arka plan sürecini ve geçici YAML dosyasını temizle
                if ($proxyProcess -and -not $proxyProcess.HasExited) {
                    Stop-Process -Id $proxyProcess.Id -Force -ErrorAction SilentlyContinue
                }
                if (Test-Path $TMP_YAML) { Remove-Item $TMP_YAML -Force -ErrorAction SilentlyContinue }
            }
        }
        elseif ($AGENT_TYPE -eq "codex") {
            Write-Host "⚡ Codex başlatılıyor..." -ForegroundColor Green
            $env:OPENAI_API_BASE = $CLEAN_API_BASE
            $env:OPENAI_API_KEY = $API_KEY
            $env:OPENAI_MODEL_NAME = $MODEL
            codex
        }
    }

    "list" {
        Write-Host "📋 Kayıtlı Sağlayıcılar (Config: $CONFIG_FILE):" -ForegroundColor Cyan
        Write-Host "------------------------------------------------------------"
        $jsonContent = Get-Content -Path $CONFIG_FILE -Raw -Encoding utf8 | ConvertFrom-Json
        
        foreach ($prop in $jsonContent.suppliers.PSObject.Properties) {
            $name = $prop.Name
            $val = $prop.Value
            $keyMask = if (-not [string]::IsNullOrWhiteSpace($val.api_key)) {
                "*****" + $val.api_key.Substring([Math]::Max(0, $val.api_key.Length - 4))
            } else {
                "(Yok/Local)"
            }
            Write-Host "• $name" -ForegroundColor Yellow
            Write-Host "  API:    $($val.api_base)"
            Write-Host "  KEY:    $keyMask"
            Write-Host ""
        }
    }

    "config" {
        if ($args.Count -lt 2) { Show-Usage }
        $ACTION = $args[1]
        
        $SUPPLIER = ""; $API_URL = ""; $API_KEY = ""

        for ($i = 2; $i -lt $args.Count; $i++) {
            if ($args[$i] -eq "--supplier" -and ($i + 1) -lt $args.Count) { $SUPPLIER = $args[$i + 1]; $i++ }
            elseif ($args[$i] -eq "--api" -and ($i + 1) -lt $args.Count) { $API_URL = $args[$i + 1]; $i++ }
            elseif ($args[$i] -eq "--apikey" -and ($i + 1) -lt $args.Count) { $API_KEY = $args[$i + 1]; $i++ }
        }

        if ([string]::IsNullOrWhiteSpace($SUPPLIER)) {
            Write-Host "❌ Hata: --supplier zorunludur." -ForegroundColor Red
            Show-Usage
        }

        $jsonContent = Get-Content -Path $CONFIG_FILE -Raw -Encoding utf8 | ConvertFrom-Json

        switch ($ACTION) {
            "add" {
                if ([string]::IsNullOrWhiteSpace($API_URL)) {
                    Write-Host "❌ Hata: --api URL zorunludur." -ForegroundColor Red
                    exit 1
                }
                
                if (-not $jsonContent.suppliers) {
                    $jsonContent | Add-Member -MemberType NoteProperty -Name "suppliers" -Value (New-Object PSObject)
                }

                $newObj = [PSCustomObject]@{
                    api_base = $API_URL
                    api_key  = $API_KEY
                }

                if ($jsonContent.suppliers.PSObject.Properties[$SUPPLIER]) {
                    $jsonContent.suppliers.$SUPPLIER = $newObj
                } else {
                    $jsonContent.suppliers | Add-Member -MemberType NoteProperty -Name $SUPPLIER -Value $newObj
                }

                $jsonContent | ConvertTo-Json -Depth 5 | Out-File -FilePath $CONFIG_FILE -Encoding utf8
                Write-Host "✅ '$SUPPLIER' başarıyla eklendi." -ForegroundColor Green
            }

            "update" {
                if ($jsonContent.suppliers.PSObject.Properties[$SUPPLIER]) {
                    if (-not [string]::IsNullOrWhiteSpace($API_URL)) {
                        $jsonContent.suppliers.$SUPPLIER.api_base = $API_URL
                    }
                    if (-not [string]::IsNullOrWhiteSpace($API_KEY)) {
                        $jsonContent.suppliers.$SUPPLIER.api_key = $API_KEY
                    }
                    $jsonContent | ConvertTo-Json -Depth 5 | Out-File -FilePath $CONFIG_FILE -Encoding utf8
                    Write-Host "✅ '$SUPPLIER' güncellendi." -ForegroundColor Green
                } else {
                    Write-Host "❌ Hata: '$SUPPLIER' adında bir sağlayıcı bulunamadı." -ForegroundColor Red
                }
            }

            "delete" {
                if ($jsonContent.suppliers.PSObject.Properties[$SUPPLIER]) {
                    $jsonContent.suppliers.PSObject.Properties.Remove($SUPPLIER)
                    $jsonContent | ConvertTo-Json -Depth 5 | Out-File -FilePath $CONFIG_FILE -Encoding utf8
                    Write-Host "🗑️  '$SUPPLIER' silindi." -ForegroundColor Green
                } else {
                    Write-Host "❌ Hata: '$SUPPLIER' adında bir sağlayıcı bulunamadı." -ForegroundColor Red
                }
            }

            default { Show-Usage }
        }
    }

    default { Show-Usage }
}