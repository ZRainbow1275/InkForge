$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$candidates = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and $_.ProcessName -match 'chrom|msedge'
} | Sort-Object StartTime -Descending

foreach ($c in $candidates) {
  Write-Output ("candidate pid=" + $c.Id + " proc=" + $c.ProcessName + " titleLen=" + $c.MainWindowTitle.Length + " started=" + $c.StartTime.ToString('HH:mm:ss'))
}

$browser = $candidates | Select-Object -First 1
if (-not $browser) { throw 'no browser window found' }

$h = $browser.MainWindowHandle
$null = [Win32]::ShowWindow($h, 9)  # SW_RESTORE
Start-Sleep -Milliseconds 300
$null = [Win32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 600

$fg = [Win32]::GetForegroundWindow()
Write-Output ("target_hwnd=" + $h)
Write-Output ("foreground_hwnd=" + $fg)
Write-Output ("foreground_ok=" + ($fg -eq $h))

[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 800
Write-Output ("sent_pid=" + $browser.Id)
