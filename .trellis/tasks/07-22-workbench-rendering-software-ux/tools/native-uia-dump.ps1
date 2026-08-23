param(
    [string]$OutputPath = '',
    [int]$Limit = 500
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class InkForgeNativeUiaDump
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
    public static extern bool SetForegroundWindow(IntPtr hWnd);

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

$process = Get-Process -Name InkForge | Select-Object -First 1
$window = [InkForgeNativeUiaDump]::FindMainWindow([uint32]$process.Id)
if ($window -eq [IntPtr]::Zero) {
    throw 'InkForge native main window not found.'
}

[void][InkForgeNativeUiaDump]::ShowWindowAsync($window, 9)
[void][InkForgeNativeUiaDump]::SetForegroundWindow($window)
Start-Sleep -Milliseconds 900

$root = [System.Windows.Automation.AutomationElement]::FromHandle($window)
$nodes = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
)

$rows = [System.Collections.Generic.List[object]]::new()
foreach ($node in $nodes) {
    if ($rows.Count -ge $Limit) {
        break
    }

    try {
        $name = $node.Current.Name
        $controlType = $node.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''
        $automationId = $node.Current.AutomationId
        if (
            [string]::IsNullOrWhiteSpace($name) -and
            [string]::IsNullOrWhiteSpace($automationId) -and
            $controlType -in @('Text', 'Group', 'Pane', 'Custom')
        ) {
            continue
        }

        $rect = $node.Current.BoundingRectangle
        $patterns = [System.Collections.Generic.List[string]]::new()
        foreach ($candidate in @(
            @('Invoke', [System.Windows.Automation.InvokePattern]::Pattern),
            @('Toggle', [System.Windows.Automation.TogglePattern]::Pattern),
            @('SelectionItem', [System.Windows.Automation.SelectionItemPattern]::Pattern),
            @('Value', [System.Windows.Automation.ValuePattern]::Pattern),
            @('ExpandCollapse', [System.Windows.Automation.ExpandCollapsePattern]::Pattern),
            @('RangeValue', [System.Windows.Automation.RangeValuePattern]::Pattern)
        )) {
            $pattern = $null
            if ($node.TryGetCurrentPattern($candidate[1], [ref]$pattern)) {
                $patterns.Add($candidate[0])
            }
        }

        $rows.Add([pscustomobject]@{
            Index = $rows.Count
            Type = $controlType
            Name = $name
            AutomationId = $automationId
            Enabled = $node.Current.IsEnabled
            Offscreen = $node.Current.IsOffscreen
            Rect = "$([math]::Round($rect.X)),$([math]::Round($rect.Y)),$([math]::Round($rect.Width)),$([math]::Round($rect.Height))"
            Patterns = $patterns -join ','
        })
    }
    catch {
    }
}

$lines = @(
    "pid=$($process.Id) hwnd=$($window.ToInt64()) count=$($nodes.Count) title=InkForge"
    $rows | ForEach-Object { $_ | ConvertTo-Json -Compress }
)

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $lines
}
else {
    $lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
    Get-Content -LiteralPath $OutputPath
}
