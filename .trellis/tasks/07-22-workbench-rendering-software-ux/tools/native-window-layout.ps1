param(
    [int]$Width = 1920,
    [int]$Height = 1080,
    [int]$X = 0,
    [int]$Y = 0
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class InkForgeNativeWindowLayout
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int command);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int command);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int x,
        int y,
        int width,
        int height,
        uint flags
    );

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

if ($Width -lt 800 -or $Height -lt 600) {
    throw 'InkForge acceptance window must be at least 800x600 physical pixels.'
}

$process = Get-Process -Name InkForge | Select-Object -First 1
$window = [InkForgeNativeWindowLayout]::FindMainWindow([uint32]$process.Id)
if ($window -eq [IntPtr]::Zero) {
    throw 'InkForge native main window not found.'
}

[void][InkForgeNativeWindowLayout]::ShowWindow($window, 9)
[void][InkForgeNativeWindowLayout]::ShowWindowAsync($window, 9)
Start-Sleep -Milliseconds 250

$SWP_NOZORDER = 0x0004
$SWP_FRAMECHANGED = 0x0020
$SWP_SHOWWINDOW = 0x0040
$flags = $SWP_NOZORDER -bor $SWP_FRAMECHANGED -bor $SWP_SHOWWINDOW

if (-not [InkForgeNativeWindowLayout]::SetWindowPos($window, [IntPtr]::Zero, $X, $Y, $Width, $Height, $flags)) {
    throw 'SetWindowPos failed.'
}

[void][InkForgeNativeWindowLayout]::ShowWindow($window, 5)
[void][InkForgeNativeWindowLayout]::SetForegroundWindow($window)
Start-Sleep -Milliseconds 900

if ([InkForgeNativeWindowLayout]::IsIconic($window)) {
    throw 'InkForge native main window remained minimized after restore.'
}

@(
    "pid=$($process.Id)"
    "hwnd=$($window.ToInt64())"
    "x=$X"
    "y=$Y"
    "width=$Width"
    "height=$Height"
)
