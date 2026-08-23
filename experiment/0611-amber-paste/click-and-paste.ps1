param(
  [Parameter(Mandatory=$true)][double]$ElemX,
  [Parameter(Mandatory=$true)][double]$ElemY,
  [double]$InnerW = 1400,
  [double]$InnerH = 900,
  [double]$Dpr = 1
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
public struct POINT { public int X; public int Y; }
public class Win32C {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT pt);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
$null = [Win32C]::SetProcessDPIAware()

$browser = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and $_.ProcessName -match 'chrom'
} | Sort-Object StartTime -Descending | Select-Object -First 1
if (-not $browser) { throw 'no chromium window found' }
$h = $browser.MainWindowHandle

$null = [Win32C]::ShowWindow($h, 9)
Start-Sleep -Milliseconds 300
$null = [Win32C]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 500
$fg = [Win32C]::GetForegroundWindow()
Write-Output ("foreground_ok=" + ($fg -eq $h))

$rect = New-Object RECT
$null = [Win32C]::GetClientRect($h, [ref]$rect)
$cw = $rect.Right - $rect.Left
$ch = $rect.Bottom - $rect.Top
$pt = New-Object POINT
$pt.X = 0; $pt.Y = 0
$null = [Win32C]::ClientToScreen($h, [ref]$pt)

$contentW = [math]::Round($InnerW * $Dpr)
$contentH = [math]::Round($InnerH * $Dpr)
$originX = $pt.X + [math]::Round(($cw - $contentW) / 2)
$originY = $pt.Y + ($ch - $contentH)

$clickX = $originX + [math]::Round($ElemX * $Dpr)
$clickY = $originY + [math]::Round($ElemY * $Dpr)
Write-Output ("client=" + $cw + "x" + $ch + " clientOrigin=" + $pt.X + "," + $pt.Y)
Write-Output ("contentOrigin=" + $originX + "," + $originY + " click=" + $clickX + "," + $clickY)

$null = [Win32C]::SetCursorPos($clickX, $clickY)
Start-Sleep -Milliseconds 200
[Win32C]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # LEFTDOWN
Start-Sleep -Milliseconds 60
[Win32C]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # LEFTUP
Start-Sleep -Milliseconds 400

[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 800
Write-Output "clicked_and_pasted"
