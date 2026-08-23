param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [Parameter(Mandatory = $true)]
    [string]$MetadataPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class InkForgeNativeCapture
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out Rect rect);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr destination, uint flags);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetDpiForWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int command);

    public static IntPtr FindMainWindow(uint targetProcessId)
    {
        var found = IntPtr.Zero;

        EnumWindows((window, state) =>
        {
            uint processId;
            GetWindowThreadProcessId(window, out processId);
            if (processId != targetProcessId)
            {
                return true;
            }

            var length = GetWindowTextLength(window);
            var title = new StringBuilder(length + 1);
            GetWindowText(window, title, title.Capacity);
            if (title.ToString() != "InkForge")
            {
                return true;
            }

            found = window;
            return false;
        }, IntPtr.Zero);

        return found;
    }
}
'@

[void][InkForgeNativeCapture]::SetProcessDpiAwarenessContext([IntPtr](-4))

$process = Get-Process -Name InkForge | Select-Object -First 1
$window = [InkForgeNativeCapture]::FindMainWindow([uint32]$process.Id)
if ($window -eq [IntPtr]::Zero) {
    throw 'InkForge native main window not found.'
}

if ([InkForgeNativeCapture]::IsIconic($window)) {
    [void][InkForgeNativeCapture]::ShowWindowAsync($window, 9)
    Start-Sleep -Milliseconds 900
}

$rect = New-Object InkForgeNativeCapture+Rect
if (-not [InkForgeNativeCapture]::GetWindowRect($window, [ref]$rect)) {
    throw 'GetWindowRect failed.'
}

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) {
    throw "Invalid native window geometry: ${width}x${height}."
}

$bitmap = New-Object System.Drawing.Bitmap(
    $width,
    $height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$deviceContext = $graphics.GetHdc()

try {
    $captured = [InkForgeNativeCapture]::PrintWindow($window, $deviceContext, 2)
}
finally {
    $graphics.ReleaseHdc($deviceContext)
    $graphics.Dispose()
}

if (-not $captured) {
    $bitmap.Dispose()
    throw 'PrintWindow failed.'
}

$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

@(
    'InkForge native Tauri window capture'
    "pid=$($process.Id)"
    "hwnd=$($window.ToInt64())"
    'title=InkForge'
    "responding=$($process.Responding)"
    "visible=$([InkForgeNativeCapture]::IsWindowVisible($window))"
    "minimized=$([InkForgeNativeCapture]::IsIconic($window))"
    "dpi=$([InkForgeNativeCapture]::GetDpiForWindow($window))"
    "rect=$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
    "pixels=${width}x${height}"
    "capture=$OutputPath"
) | Set-Content -LiteralPath $MetadataPath -Encoding UTF8

Get-Content -LiteralPath $MetadataPath
