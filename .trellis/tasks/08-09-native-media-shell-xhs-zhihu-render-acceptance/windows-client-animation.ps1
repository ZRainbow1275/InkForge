param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('get', 'enable', 'disable')]
  [string] $Action
)

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class InkForgeClientAnimation
{
    [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfoW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool Get(
        uint action,
        uint parameter,
        [MarshalAs(UnmanagedType.Bool)] ref bool value,
        uint flags);

    [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfoW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool Set(
        uint action,
        uint parameter,
        IntPtr value,
        uint flags);

    public static bool Read(uint action)
    {
        bool value = false;
        if (!Get(action, 0, ref value, 0))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        return value;
    }

    public static bool Write(uint action, bool value, uint flags)
    {
        return Set(action, 0, value ? new IntPtr(1) : IntPtr.Zero, flags);
    }
}
'@

$GetClientAreaAnimation = 0x1042
$SetClientAreaAnimation = 0x1043

if ($Action -eq 'get') {
  [InkForgeClientAnimation]::Read($GetClientAreaAnimation)
  exit 0
}

$desired = $Action -eq 'enable'
if (-not [InkForgeClientAnimation]::Write($SetClientAreaAnimation, $desired, 3)) {
  throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
}

$actual = [InkForgeClientAnimation]::Read($GetClientAreaAnimation)
if ($actual -ne $desired) {
  throw "Client-area animation readback mismatch: expected $desired, got $actual"
}
$actual
