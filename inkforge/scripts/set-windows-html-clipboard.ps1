param(
  [Parameter(Mandatory = $true)]
  [string]$HtmlPath,

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Utf8ByteCount {
  param([string]$Value)
  return [System.Text.Encoding]::UTF8.GetByteCount($Value)
}

function Format-CfHtmlOffset {
  param([int]$Value)
  if ($Value -gt 9999999999) {
    throw "CF_HTML offset exceeds 10 digits: $Value"
  }
  return $Value.ToString('D10')
}

function ConvertTo-PlainText {
  param([string]$Html)
  $withoutScripts = [regex]::Replace($Html, '<(script|style)[\s\S]*?</\1>', ' ', 'IgnoreCase')
  $withoutTags = [regex]::Replace($withoutScripts, '<[^>]+>', ' ')
  $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
  return [regex]::Replace($decoded, '\s+', ' ').Trim()
}

$resolvedPath = (Resolve-Path -LiteralPath $HtmlPath).Path
$utf8Strict = [System.Text.UTF8Encoding]::new($false, $true)
$html = [System.IO.File]::ReadAllText($resolvedPath, $utf8Strict).TrimStart([char]0xFEFF)
if ([string]::IsNullOrWhiteSpace($html)) {
  throw "HTML file is empty: $HtmlPath"
}

$prefix = "<html><body><!--StartFragment-->"
$suffix = "<!--EndFragment--></body></html>"
$headerTemplate = "Version:0.9`r`nStartHTML:{0}`r`nEndHTML:{1}`r`nStartFragment:{2}`r`nEndFragment:{3}`r`n"
$placeholderHeader = $headerTemplate -f '0000000000', '0000000000', '0000000000', '0000000000'

$startHtml = Get-Utf8ByteCount $placeholderHeader
$startFragment = $startHtml + (Get-Utf8ByteCount $prefix)
$endFragment = $startFragment + (Get-Utf8ByteCount $html)
$endHtml = $endFragment + (Get-Utf8ByteCount $suffix)

$header = $headerTemplate -f `
  (Format-CfHtmlOffset $startHtml), `
  (Format-CfHtmlOffset $endHtml), `
  (Format-CfHtmlOffset $startFragment), `
  (Format-CfHtmlOffset $endFragment)
$cfHtml = $header + $prefix + $html + $suffix
$plainText = ConvertTo-PlainText $html

$sha = [System.Security.Cryptography.SHA256]::Create()
try {
  $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($html))
  $hash = -join ($hashBytes | ForEach-Object { $_.ToString('x2') })
} finally {
  $sha.Dispose()
}

if (-not $DryRun) {
  if ([System.Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw "Run this script with powershell.exe -STA so System.Windows.Forms.Clipboard can access the clipboard."
  }

  Add-Type -AssemblyName System.Windows.Forms
  $dataObject = New-Object System.Windows.Forms.DataObject
  $dataObject.SetData([System.Windows.Forms.DataFormats]::Html, $cfHtml)
  $dataObject.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plainText)
  [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
}

[pscustomobject]@{
  file = Split-Path -Leaf $resolvedPath
  dryRun = [bool]$DryRun
  htmlBytes = Get-Utf8ByteCount $html
  cfHtmlBytes = Get-Utf8ByteCount $cfHtml
  startHtml = $startHtml
  endHtml = $endHtml
  startFragment = $startFragment
  endFragment = $endFragment
  sha256 = $hash
  svgCount = ([regex]::Matches($html, '<svg[\s>]', 'IgnoreCase')).Count
  dataInkSvgCount = ([regex]::Matches($html, 'data-ink-svg\s*=', 'IgnoreCase')).Count
  plainTextChars = $plainText.Length
  clipboardFormats = @('HTML Format', 'UnicodeText')
} | ConvertTo-Json -Depth 3
