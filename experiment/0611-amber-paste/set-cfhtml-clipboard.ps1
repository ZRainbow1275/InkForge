param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$m = [regex]::Match($raw, '(?s)<body[^>]*>(.*)</body>')
if (-not $m.Success) { throw 'no <body> found in artifact' }
$fragment = $m.Groups[1].Value.Trim()

$pre = "Version:0.9`r`nStartHTML:AAAAAAAAAA`r`nEndHTML:BBBBBBBBBB`r`nStartFragment:CCCCCCCCCC`r`nEndFragment:DDDDDDDDDD`r`n"
$docPrefix = '<html><body><!--StartFragment-->'
$docSuffix = '<!--EndFragment--></body></html>'
$htmlDoc = $docPrefix + $fragment + $docSuffix

$enc = [System.Text.Encoding]::UTF8
$startHtml = $enc.GetByteCount($pre)
$startFrag = $startHtml + $enc.GetByteCount($docPrefix)
$endFrag = $startFrag + $enc.GetByteCount($fragment)
$endHtml = $startHtml + $enc.GetByteCount($htmlDoc)

$header = $pre.Replace('AAAAAAAAAA', $startHtml.ToString('D10'))
$header = $header.Replace('BBBBBBBBBB', $endHtml.ToString('D10'))
$header = $header.Replace('CCCCCCCCCC', $startFrag.ToString('D10'))
$header = $header.Replace('DDDDDDDDDD', $endFrag.ToString('D10'))

$bytes = $enc.GetBytes($header + $htmlDoc)
$ms = New-Object System.IO.MemoryStream(,$bytes)

$plain = [regex]::Replace($fragment, '<[^>]+>', ' ')
$plain = [System.Net.WebUtility]::HtmlDecode($plain)
$plain = [regex]::Replace($plain, '\s+', ' ').Trim()

$dataObj = New-Object System.Windows.Forms.DataObject
$dataObj.SetData('HTML Format', $ms)
$dataObj.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plain)
[System.Windows.Forms.Clipboard]::SetDataObject($dataObj, $true)

Write-Output ("cfhtml_bytes=" + $bytes.Length)
Write-Output ("fragment_chars=" + $fragment.Length)
Write-Output ("plain_chars=" + $plain.Length)
