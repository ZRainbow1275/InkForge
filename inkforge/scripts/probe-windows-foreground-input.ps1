param(
  [string]$WindowTitlePattern = 'Chromium',
  [int]$WindowX = 100,
  [int]$WindowY = 80,
  [int]$WindowWidth = 1450,
  [int]$WindowHeight = 980,
  [int]$ViewportWidth = 1400,
  [int]$ViewportHeight = 900,
  [int]$ClickViewportX = 144,
  [int]$ClickViewportY = 126,
  [int]$ClickScreenX = -1,
  [int]$ClickScreenY = -1,
  [ValidateSet('KeyA', 'CtrlV')]
  [string]$Action = 'CtrlV',
  [ValidateSet('KeybdEvent', 'SendInput')]
  [string]$InputMethod = 'KeybdEvent',
  [string]$ClipboardText = 'INKFORGE_OS_PASTE_SENTINEL_20260618',
  [switch]$PreserveClipboard,
  [switch]$NoMove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class InkForgeForegroundInputProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint SendInput(uint count, INPUT[] inputs, int size);

  [DllImport("user32.dll")]
  public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, UIntPtr extraInfo);

  [DllImport("user32.dll")]
  public static extern uint MapVirtualKey(uint code, uint mapType);

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT {
    public uint type;
    public InputUnion U;
  }

  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion {
    [FieldOffset(0)]
    public KEYBDINPUT ki;
    [FieldOffset(0)]
    public MOUSEINPUT mi;
    [FieldOffset(0)]
    public HARDWAREINPUT hi;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT {
    public ushort wVk;
    public ushort wScan;
    public uint dwFlags;
    public uint time;
    public UIntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT {
    public int dx;
    public int dy;
    public uint mouseData;
    public uint dwFlags;
    public uint time;
    public UIntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct HARDWAREINPUT {
    public uint uMsg;
    public ushort wParamL;
    public ushort wParamH;
  }
}
'@

function Convert-Rect {
  param([InkForgeForegroundInputProbe+RECT]$Rect)

  return [pscustomobject]@{
    left = $Rect.Left
    top = $Rect.Top
    width = $Rect.Right - $Rect.Left
    height = $Rect.Bottom - $Rect.Top
  }
}

function New-KeyInput {
  param(
    [UInt16]$VirtualKey,
    [UInt32]$Flags
  )

  $input = New-Object InkForgeForegroundInputProbe+INPUT
  $input.type = 1
  $input.U.ki.wVk = $VirtualKey
  $input.U.ki.wScan = 0
  $input.U.ki.dwFlags = $Flags
  $input.U.ki.time = 0
  $input.U.ki.dwExtraInfo = [UIntPtr]::Zero
  return $input
}

function Invoke-KeybdEvent {
  param(
    [UInt16]$VirtualKey,
    [UInt32]$Flags
  )

  $scanCode = [byte][InkForgeForegroundInputProbe]::MapVirtualKey([uint32]$VirtualKey, 0)
  [InkForgeForegroundInputProbe]::keybd_event([byte]$VirtualKey, $scanCode, $Flags, [UIntPtr]::Zero)
}

$matchedWindows = New-Object System.Collections.Generic.List[object]
$target = [IntPtr]::Zero

[InkForgeForegroundInputProbe]::EnumWindows({
  param($hWnd, $lParam)

  if (-not [InkForgeForegroundInputProbe]::IsWindowVisible($hWnd)) {
    return $true
  }

  $titleBuilder = New-Object System.Text.StringBuilder 512
  $classBuilder = New-Object System.Text.StringBuilder 256
  [void][InkForgeForegroundInputProbe]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  [void][InkForgeForegroundInputProbe]::GetClassName($hWnd, $classBuilder, $classBuilder.Capacity)

  $title = $titleBuilder.ToString()
  $className = $classBuilder.ToString()
  if ($className -eq 'Chrome_WidgetWin_1' -and $title -match $WindowTitlePattern) {
    $script:target = $hWnd
    $matchedWindows.Add([pscustomobject]@{
      hwnd = ('0x{0:X}' -f $hWnd.ToInt64())
      class = $className
      titleMatched = $true
    })
  }

  return $true
}, [IntPtr]::Zero) | Out-Null

if ($target -eq [IntPtr]::Zero) {
  throw "No visible Chrome_WidgetWin_1 window matched pattern: $WindowTitlePattern"
}

$beforeRect = New-Object InkForgeForegroundInputProbe+RECT
[void][InkForgeForegroundInputProbe]::GetWindowRect($target, [ref]$beforeRect)
$foregroundBefore = [InkForgeForegroundInputProbe]::GetForegroundWindow()

$showWindow = [InkForgeForegroundInputProbe]::ShowWindow($target, 9)
$moveWindow = $false
if (-not $NoMove) {
  $moveWindow = [InkForgeForegroundInputProbe]::MoveWindow(
    $target,
    $WindowX,
    $WindowY,
    $WindowWidth,
    $WindowHeight,
    $true
  )
}

$setForeground = [InkForgeForegroundInputProbe]::SetForegroundWindow($target)
Start-Sleep -Milliseconds 350

$afterRect = New-Object InkForgeForegroundInputProbe+RECT
[void][InkForgeForegroundInputProbe]::GetWindowRect($target, [ref]$afterRect)

$windowWidth = $afterRect.Right - $afterRect.Left
$windowHeight = $afterRect.Bottom - $afterRect.Top
$contentLeft = $afterRect.Left + [Math]::Max(0, [int](($windowWidth - $ViewportWidth) / 2))
$contentTop = $afterRect.Top + [Math]::Max(0, $windowHeight - $ViewportHeight)
$usesAbsoluteClick = $ClickScreenX -ge 0 -and $ClickScreenY -ge 0
$clickX = if ($usesAbsoluteClick) { $ClickScreenX } else { $contentLeft + $ClickViewportX }
$clickY = if ($usesAbsoluteClick) { $ClickScreenY } else { $contentTop + $ClickViewportY }

[void][InkForgeForegroundInputProbe]::SetCursorPos($clickX, $clickY)
Start-Sleep -Milliseconds 100
[InkForgeForegroundInputProbe]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 80
[InkForgeForegroundInputProbe]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 250

if ($Action -eq 'CtrlV' -and -not $PreserveClipboard) {
  Set-Clipboard -Value $ClipboardText
}

$keyUp = [UInt32]0x0002
$inputs = if ($Action -eq 'CtrlV') {
  @(
    (New-KeyInput ([UInt16]0x11) 0),
    (New-KeyInput ([UInt16]0x56) 0),
    (New-KeyInput ([UInt16]0x56) $keyUp),
    (New-KeyInput ([UInt16]0x11) $keyUp)
  )
} else {
  @(
    (New-KeyInput ([UInt16]0x41) 0),
    (New-KeyInput ([UInt16]0x41) $keyUp)
  )
}

$inputSize = [Runtime.InteropServices.Marshal]::SizeOf([type][InkForgeForegroundInputProbe+INPUT])
$sentInputCount = 0
$keybdEventCount = 0

if ($InputMethod -eq 'SendInput') {
  $sentInputCount = [InkForgeForegroundInputProbe]::SendInput([uint32]$inputs.Length, $inputs, $inputSize)
} else {
  if ($Action -eq 'CtrlV') {
    Invoke-KeybdEvent ([UInt16]0x11) 0
    Start-Sleep -Milliseconds 50
    Invoke-KeybdEvent ([UInt16]0x56) 0
    Start-Sleep -Milliseconds 80
    Invoke-KeybdEvent ([UInt16]0x56) $keyUp
    Start-Sleep -Milliseconds 50
    Invoke-KeybdEvent ([UInt16]0x11) $keyUp
    $keybdEventCount = 4
  } else {
    Invoke-KeybdEvent ([UInt16]0x41) 0
    Start-Sleep -Milliseconds 80
    Invoke-KeybdEvent ([UInt16]0x41) $keyUp
    $keybdEventCount = 2
  }
}
Start-Sleep -Milliseconds 650

[pscustomobject]@{
  action = $Action
  inputMethod = $InputMethod
  windowMatched = $matchedWindows.Count -gt 0
  matchedWindowCount = $matchedWindows.Count
  targetHwnd = ('0x{0:X}' -f $target.ToInt64())
  foregroundBefore = ('0x{0:X}' -f $foregroundBefore.ToInt64())
  foregroundAfter = ('0x{0:X}' -f ([InkForgeForegroundInputProbe]::GetForegroundWindow()).ToInt64())
  beforeRect = Convert-Rect $beforeRect
  afterRect = Convert-Rect $afterRect
  showWindow = $showWindow
  moveWindow = $moveWindow
  setForeground = $setForeground
  click = [pscustomobject]@{
    x = $clickX
    y = $clickY
    absolute = $usesAbsoluteClick
    viewportX = $ClickViewportX
    viewportY = $ClickViewportY
  }
  inputSize = $inputSize
  requestedInputCount = $inputs.Length
  sentInputCount = $sentInputCount
  keybdEventCount = $keybdEventCount
  lastWin32Error = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  clipboardTextLength = if ($Action -eq 'CtrlV' -and -not $PreserveClipboard) { $ClipboardText.Length } else { 0 }
  preserveClipboard = [bool]$PreserveClipboard
} | ConvertTo-Json -Depth 5
