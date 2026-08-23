param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Name,

    [ValidateSet('Invoke', 'Toggle', 'SelectionItem', 'Expand', 'Collapse', 'Value', 'RangeValue', 'Focus')]
    [string]$Action = 'Invoke',

    [string]$Value = '',
    [string]$ControlType = '',
    [int]$MatchIndex = 0,
    [int]$TimeoutMs = 8000
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class InkForgeNativeUia
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
$window = [InkForgeNativeUia]::FindMainWindow([uint32]$process.Id)
if ($window -eq [IntPtr]::Zero) {
    throw 'InkForge native main window not found.'
}

[void][InkForgeNativeUia]::ShowWindowAsync($window, 9)
[void][InkForgeNativeUia]::SetForegroundWindow($window)
Start-Sleep -Milliseconds 900

$deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
$matches = @()

while ([DateTime]::UtcNow -lt $deadline) {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle($window)
    $nodes = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
    )
    $matches = @(
        $nodes | Where-Object {
            try {
                $_.Current.Name -eq $Name -and (
                    [string]::IsNullOrWhiteSpace($ControlType) -or
                    $_.Current.ControlType.ProgrammaticName -eq "ControlType.$ControlType"
                )
            }
            catch {
                $false
            }
        }
    )
    if ($matches.Count -gt $MatchIndex) {
        break
    }
    Start-Sleep -Milliseconds 250
}

if ($matches.Count -le $MatchIndex) {
    throw "UIA element not found: $Name (matches=$($matches.Count))."
}

$element = $matches[$MatchIndex]
$controlType = $element.Current.ControlType.ProgrammaticName
$rect = $element.Current.BoundingRectangle

switch ($Action) {
    'Invoke' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $pattern.Invoke()
    }
    'Toggle' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
        $before = $pattern.Current.ToggleState
        $pattern.Toggle()
        Start-Sleep -Milliseconds 200
        "toggleBefore=$before toggleAfter=$($pattern.Current.ToggleState)"
    }
    'SelectionItem' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $pattern.Select()
    }
    'Expand' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
        $pattern.Expand()
    }
    'Collapse' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
        $pattern.Collapse()
    }
    'Value' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        if ($pattern.Current.IsReadOnly) {
            throw "UIA value is read-only: $Name."
        }
        $pattern.SetValue($Value)
    }
    'RangeValue' {
        $pattern = $element.GetCurrentPattern([System.Windows.Automation.RangeValuePattern]::Pattern)
        if ($pattern.Current.IsReadOnly) {
            throw "UIA range value is read-only: $Name."
        }
        $numericValue = 0.0
        if (-not [double]::TryParse(
            $Value,
            [System.Globalization.NumberStyles]::Float,
            [System.Globalization.CultureInfo]::InvariantCulture,
            [ref]$numericValue
        )) {
            throw "UIA range value is not numeric: $Value."
        }
        $pattern.SetValue($numericValue)
    }
    'Focus' {
        $element.SetFocus()
    }
}

@(
    "pid=$($process.Id)"
    "hwnd=$($window.ToInt64())"
    "action=$Action"
    "type=$controlType"
    "name=$Name"
    "matchIndex=$MatchIndex"
    "rect=$([math]::Round($rect.X)),$([math]::Round($rect.Y)),$([math]::Round($rect.Width)),$([math]::Round($rect.Height))"
)
