/* global after */

const { expect } = require('chai');
const { Buffer } = require('buffer');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SOURCE_IMAGE = path.resolve(__dirname, '../../../src-tauri/icons/512x512.png');
const RUN_ROOT = path.join(os.tmpdir(), `inkforge-platform-release-${Date.now().toString(36)}`);
const INPUT_FILE = path.join(RUN_ROOT, 'inkforge-platform-acceptance.md');
const OUTPUT_ROOT = path.join(RUN_ROOT, 'output');
const INPUT_MARKDOWN = `# InkForge 三平台渲染验收

本稿只验证当前最终 release 的可见导入、素材、渲染与本地资产写出，不承载外部事实或发布结论。

## 结构与重点

- 标题、段落、强调与列表保持顺序。
- **重点文字**和 *斜体提示* 应保留语义。
- 图片由 InkForge 素材库真实上传后插入。

> 本地验收只证明产物 bytes 与 manifest，不替代平台编辑器读回。

| 检查项 | 预期 |
| --- | --- |
| 小红书 | 纯文本、PNG 图片页与 manifest |
| 知乎 | 清洁 Markdown、图片 fallback 与 manifest |

\`\`\`ts
const published = false
\`\`\`

$$E = mc^2$$
`;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolutePath));
    else files.push(absolutePath);
  }
  return files;
}

function normalizeRelativePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function resolveContainedFile(root, relativePath, label) {
  expect(relativePath, `${label} exposes a relative path`).to.be.a('string').and.not.equal('');
  const normalized = normalizeRelativePath(relativePath);
  expect(normalized, `${label} path is not absolute`).not.to.match(/^(?:[a-z]:[\\/]|\/\/|\/)/iu);
  expect(normalized.split('/'), `${label} path does not traverse outside the output root`).not.to.include('..');
  const absolutePath = path.resolve(root, normalized);
  const containment = path.relative(root, absolutePath);
  expect(containment, `${label} path is contained by the output root`).not.to.match(/^(?:\.\.(?:[\\/]|$)|[a-z]:[\\/]|[\\/])/iu);
  return {
    absolutePath,
    relativePath: path.relative(root, absolutePath).split(path.sep).join('/'),
  };
}

function readPngDimensions(bytes, label) {
  expect(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label} is PNG`)
    .to.equal(true);
  expect(bytes.length, `${label} has real bytes`).to.be.greaterThan(1000);
  expect(bytes.toString('ascii', 12, 16), `${label} has a PNG IHDR chunk`).to.equal('IHDR');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function readBinaryArtifact(root, relativePath, label) {
  const location = resolveContainedFile(root, relativePath, label);
  expect(fs.existsSync(location.absolutePath), `${label} exists on disk`).to.equal(true);
  const bytes = fs.readFileSync(location.absolutePath);
  return {
    ...location,
    bytes,
    byteLength: bytes.length,
    sha256: sha256(bytes),
    dimensions: readPngDimensions(bytes, label),
  };
}

function collectMarkdownImageReferences(markdown) {
  return [...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/gu)].map(match => ({
    alt: match[1],
    src: normalizeRelativePath(match[2].trim()),
  }));
}

function relativeFiles(root) {
  return walkFiles(root)
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}

function assertExactFiles(root, expected, label) {
  expect(relativeFiles(root), `${label} contains exactly the manifest-declared files`)
    .to.deep.equal([...expected].sort());
}

function readReleaseIdentity() {
  const identity = global.__INKFORGE_E2E_RELEASE_IDENTITY__;
  expect(identity, 'release WDIO exposed a verified binary identity').to.be.an('object');
  expect(identity.executableSha256, 'release receipt exposes the EXE SHA-256').to.match(/^[a-f0-9]{64}$/u);
  expect(identity.producerSha256, 'release receipt exposes the producer SHA-256').to.match(/^[a-f0-9]{64}$/u);
  expect(identity.producerLabel, 'release receipt exposes a non-absolute producer label')
    .to.be.a('string').and.not.match(/^(?:[a-z]:[\\/]|[\\/]{1,2})/iu);
  return identity;
}

async function getCurrentInkForgeProcessId() {
  const applicationProcessId = Number(browser.capabilities?.['goog:processID']);
  if (!Number.isInteger(applicationProcessId) || applicationProcessId <= 0) {
    throw new Error('The current Tauri application process id is unavailable.');
  }
  const script = `
    $ErrorActionPreference = 'Stop'
    $process = Get-Process -Id ${applicationProcessId} -ErrorAction Stop
    if ($process.ProcessName -ne 'InkForge') {
      throw "WebDriver application PID belongs to $($process.ProcessName), not InkForge."
    }
    if ($process.MainWindowHandle -eq [IntPtr]::Zero) {
      throw 'The WebDriver-owned InkForge process has no native main window.'
    }
    [Console]::Out.Write($process.Id)
  `;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      const value = Number.parseInt(stdout.trim(), 10);
      if (code === 0 && value === applicationProcessId) resolve(value);
      else reject(new Error(`Could not bind the native dialog to InkForge (exit ${code}): ${stderr.trim()}`));
    });
  });
}

function interactWithOwnedNativeDialog({ expectedProcessId, kind, pathValue, titles }) {
  if (!Number.isInteger(expectedProcessId) || expectedProcessId <= 0) {
    throw new Error('A positive WebDriver-owned InkForge process id is required.');
  }
  const encodedKind = Buffer.from(kind, 'utf8').toString('base64');
  const encodedPath = Buffer.from(pathValue, 'utf8').toString('base64');
  const encodedTitles = Buffer.from(titles.join('\n'), 'utf8').toString('base64');
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type @'
      using System;
      using System.Text;
      using System.Runtime.InteropServices;
      public static class InkForgeOwnedDialog {
        [StructLayout(LayoutKind.Sequential)]
        public struct Rect {
          public int Left;
          public int Top;
          public int Right;
          public int Bottom;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct KeyboardInput {
          public ushort VirtualKey;
          public ushort ScanCode;
          public uint Flags;
          public uint Time;
          public UIntPtr ExtraInfo;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct MouseInput {
          public int X;
          public int Y;
          public uint MouseData;
          public uint Flags;
          public uint Time;
          public UIntPtr ExtraInfo;
        }
        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion {
          [FieldOffset(0)] public KeyboardInput Keyboard;
          [FieldOffset(0)] public MouseInput Mouse;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct Input {
          public uint Type;
          public InputUnion Union;
        }
        public delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);
        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
        [DllImport("user32.dll")]
        public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr parameter);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetWindowText(IntPtr window, StringBuilder text, int maxCount);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetClassName(IntPtr window, StringBuilder className, int maxCount);
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr window);
        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr window);
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();
        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint currentThread, uint targetThread, bool attach);
        [DllImport("user32.dll")]
        public static extern IntPtr SetFocus(IntPtr window);
        [DllImport("user32.dll")]
        public static extern IntPtr GetFocus();
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr window);
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern IntPtr GetDlgItem(IntPtr dialog, int controlId);
        [DllImport("user32.dll")]
        public static extern bool IsWindowEnabled(IntPtr window);
        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint inputCount, Input[] inputs, int size);
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr window, out Rect rect);
        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")]
        public static extern void mouse_event(uint flags, uint x, uint y, uint data, UIntPtr extraInfo);
        public static bool SendShortcut(ushort modifier, ushort key) {
          var inputs = new[] {
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = modifier } } },
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = key } } },
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = key, Flags = 0x0002 } } },
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = modifier, Flags = 0x0002 } } }
          };
          return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(Input))) == inputs.Length;
        }
        public static bool SendKey(ushort key) {
          var inputs = new[] {
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = key } } },
            new Input { Type = 1, Union = new InputUnion { Keyboard = new KeyboardInput { VirtualKey = key, Flags = 0x0002 } } }
          };
          return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(Input))) == inputs.Length;
        }
      }
'@

    $expectedProcessId = [uint32]${expectedProcessId}
    $kind = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedKind}'))
    $pathValue = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}'))
    $titles = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTitles}')) -split "\n"
    $allowedProcessIds = [Collections.Generic.HashSet[uint32]]::new()
    [void]$allowedProcessIds.Add($expectedProcessId)
    $processRows = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name)
    do {
      $addedProcess = $false
      foreach ($processRow in $processRows) {
        $processId = [uint32]$processRow.ProcessId
        $parentProcessId = [uint32]$processRow.ParentProcessId
        if (-not $allowedProcessIds.Contains($processId) -and $allowedProcessIds.Contains($parentProcessId) -and $processRow.Name -in @('InkForge.exe', 'msedgewebview2.exe')) {
          [void]$allowedProcessIds.Add($processId)
          $addedProcess = $true
        }
      }
    } while ($addedProcess)

    function Get-OwnedDialog {
      $matches = [Collections.Generic.List[object]]::new()
      $callback = [InkForgeOwnedDialog+EnumWindowsProc]{
        param([IntPtr]$window, [IntPtr]$parameter)
        if (-not [InkForgeOwnedDialog]::IsWindowVisible($window)) { return $true }
        $title = [Text.StringBuilder]::new(512)
        $className = [Text.StringBuilder]::new(256)
        [void][InkForgeOwnedDialog]::GetWindowText($window, $title, $title.Capacity)
        [void][InkForgeOwnedDialog]::GetClassName($window, $className, $className.Capacity)
        [uint32]$processId = 0
        [void][InkForgeOwnedDialog]::GetWindowThreadProcessId($window, [ref]$processId)
        if ($allowedProcessIds.Contains($processId) -and $className.ToString() -eq '#32770' -and $titles -contains $title.ToString()) {
          $matches.Add([pscustomobject]@{ Handle = $window; Title = $title.ToString() })
        }
        return $true
      }
      [void][InkForgeOwnedDialog]::EnumWindows($callback, [IntPtr]::Zero)
      if ($matches.Count -gt 1) { throw 'Multiple matching dialogs belong to the exact InkForge process.' }
      return $matches | Select-Object -First 1
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(12)
    do {
      $candidate = Get-OwnedDialog
      if ($candidate) {
        [uint32]$dialogProcessId = 0
        $dialogThread = [InkForgeOwnedDialog]::GetWindowThreadProcessId($candidate.Handle, [ref]$dialogProcessId)
        $currentThread = [InkForgeOwnedDialog]::GetCurrentThreadId()
        $foregroundWindow = [InkForgeOwnedDialog]::GetForegroundWindow()
        [uint32]$foregroundProcessId = 0
        $foregroundThread = [InkForgeOwnedDialog]::GetWindowThreadProcessId($foregroundWindow, [ref]$foregroundProcessId)
        $attachedThreads = [Collections.Generic.List[uint32]]::new()
        try {
          foreach ($targetThread in @($dialogThread, $foregroundThread) | Select-Object -Unique) {
            if ($targetThread -eq 0 -or $targetThread -eq $currentThread) { continue }
            if (-not [InkForgeOwnedDialog]::AttachThreadInput($currentThread, $targetThread, $true)) {
              throw 'A native foreground input thread could not be attached.'
            }
            $attachedThreads.Add($targetThread)
          }

          $foregroundDeadline = [DateTime]::UtcNow.AddSeconds(2)
          do {
            [void][InkForgeOwnedDialog]::SetForegroundWindow($candidate.Handle)
            if ([InkForgeOwnedDialog]::GetForegroundWindow().ToInt64() -eq $candidate.Handle.ToInt64()) { break }
            Start-Sleep -Milliseconds 50
          } while ([DateTime]::UtcNow -lt $foregroundDeadline)
          if ([InkForgeOwnedDialog]::GetForegroundWindow().ToInt64() -ne $candidate.Handle.ToInt64()) {
            throw 'The exact InkForge dialog could not receive foreground input.'
          }
        if ($kind -eq 'file') {
          if (-not (Test-Path -LiteralPath $pathValue -PathType Leaf)) {
            throw 'The selected native file path does not exist.'
          }
          $fileNameCombo = [InkForgeOwnedDialog]::GetDlgItem($candidate.Handle, 1148)
          if ($fileNameCombo -eq [IntPtr]::Zero) {
            throw 'The exact native file dialog has no Win32 file-name combo.'
          }
          $fileNameEdits = [Collections.Generic.List[IntPtr]]::new()
          $editCallback = [InkForgeOwnedDialog+EnumWindowsProc]{
            param([IntPtr]$window, [IntPtr]$parameter)
            $className = [Text.StringBuilder]::new(64)
            [void][InkForgeOwnedDialog]::GetClassName($window, $className, $className.Capacity)
            if ($className.ToString() -eq 'Edit') { $fileNameEdits.Add($window) }
            return $true
          }
          [void][InkForgeOwnedDialog]::EnumChildWindows($fileNameCombo, $editCallback, [IntPtr]::Zero)
          if ($fileNameEdits.Count -ne 1) {
            throw "The native file-name combo exposed $($fileNameEdits.Count) Win32 Edit controls instead of one."
          }
          [void][InkForgeOwnedDialog]::SetFocus($fileNameEdits[0])
          if ([InkForgeOwnedDialog]::GetFocus().ToInt64() -ne $fileNameEdits[0].ToInt64()) {
            throw 'The exact native file-name Edit did not receive focus.'
          }
          $fileNameRect = [InkForgeOwnedDialog+Rect]::new()
          if (-not [InkForgeOwnedDialog]::GetWindowRect($fileNameCombo, [ref]$fileNameRect)) {
            throw 'The exact native file-name combo has no screen bounds.'
          }
          $previousCursor = [System.Windows.Forms.Cursor]::Position
          $previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
          $actualFileName = ''
          try {
            [void][InkForgeOwnedDialog]::SetCursorPos([int](($fileNameRect.Left + $fileNameRect.Right) / 2), [int](($fileNameRect.Top + $fileNameRect.Bottom) / 2))
            [InkForgeOwnedDialog]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
            [InkForgeOwnedDialog]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 100
            $focusedAfterClick = [InkForgeOwnedDialog]::GetFocus()
            if ($focusedAfterClick.ToInt64() -ne $fileNameEdits[0].ToInt64()) {
              throw "The native file-name combo click focused a different control. Expected=$($fileNameEdits[0].ToInt64()); Actual=$($focusedAfterClick.ToInt64())"
            }
            [System.Windows.Forms.Clipboard]::SetText($pathValue)
            if (-not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x56)) {
              throw 'The native file-name combo rejected a real Ctrl+V keyboard input.'
            }
            Start-Sleep -Milliseconds 200
            if (-not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x41) -or -not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x43)) {
              throw 'The native file-name combo rejected real Ctrl+A/C readback input.'
            }
            Start-Sleep -Milliseconds 200
            $actualFileName = [System.Windows.Forms.Clipboard]::GetText()
          } finally {
            if ($previousClipboard) {
              [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true)
            } else {
              [System.Windows.Forms.Clipboard]::Clear()
            }
            [void][InkForgeOwnedDialog]::SetCursorPos($previousCursor.X, $previousCursor.Y)
          }
          if ($actualFileName.Trim('"') -ne $pathValue) {
            $leafName = [IO.Path]::GetFileName($pathValue)
            throw "The native file-name combo did not preserve the exact selected file path. ExpectedLength=$($pathValue.Length); ActualLength=$($actualFileName.Length); EndsWithLeaf=$($actualFileName.EndsWith($leafName))"
          }
          $confirm = [InkForgeOwnedDialog]::GetDlgItem($candidate.Handle, 1)
          if ($confirm -eq [IntPtr]::Zero) {
            throw 'The exact native file dialog has no Win32 confirm control.'
          }
          if (-not [InkForgeOwnedDialog]::IsWindowEnabled($confirm)) {
            throw 'The exact native file dialog confirm control is disabled.'
          }
          $confirmRect = [InkForgeOwnedDialog+Rect]::new()
          if (-not [InkForgeOwnedDialog]::IsWindowVisible($confirm) -or -not [InkForgeOwnedDialog]::GetWindowRect($confirm, [ref]$confirmRect)) {
            throw 'The exact native file dialog confirm control has no visible screen bounds.'
          }
          $previousCursor = [System.Windows.Forms.Cursor]::Position
          try {
            $confirmX = [int](($confirmRect.Left + $confirmRect.Right) / 2)
            $confirmY = [int](($confirmRect.Top + $confirmRect.Bottom) / 2)
            [void][InkForgeOwnedDialog]::SetCursorPos($confirmX, $confirmY)
            [InkForgeOwnedDialog]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 50
            [InkForgeOwnedDialog]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 100
          } finally {
            [void][InkForgeOwnedDialog]::SetCursorPos($previousCursor.X, $previousCursor.Y)
          }
          $mouseCloseDeadline = [DateTime]::UtcNow.AddSeconds(1)
          while ([InkForgeOwnedDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $mouseCloseDeadline) {
            Start-Sleep -Milliseconds 50
          }
          if ([InkForgeOwnedDialog]::IsWindow($candidate.Handle)) {
            [void][InkForgeOwnedDialog]::SetForegroundWindow($candidate.Handle)
            [void][InkForgeOwnedDialog]::SetFocus($confirm)
            if ([InkForgeOwnedDialog]::GetFocus().ToInt64() -ne $confirm.ToInt64()) {
              throw 'The exact native file dialog confirm control did not receive keyboard focus.'
            }
            if (-not [InkForgeOwnedDialog]::SendKey(0x0D)) {
              throw 'The exact native file dialog rejected a real Enter confirmation.'
            }
          }
        } else {
          if (-not (Test-Path -LiteralPath $pathValue -PathType Container)) {
            throw 'The selected native output directory does not exist.'
          }
          $previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
          $actualDirectory = ''
          try {
            [System.Windows.Forms.Clipboard]::SetText($pathValue)
            if (-not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x4C)) {
              throw 'The native directory dialog rejected a real Ctrl+L keyboard input.'
            }
            Start-Sleep -Milliseconds 100
            if (-not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x56)) {
              throw 'The native directory dialog rejected a real Ctrl+V keyboard input.'
            }
            Start-Sleep -Milliseconds 100
            if (-not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x41) -or -not [InkForgeOwnedDialog]::SendShortcut(0x11, 0x43)) {
              throw 'The native directory dialog rejected real Ctrl+A/C readback input.'
            }
            Start-Sleep -Milliseconds 100
            $actualDirectory = [System.Windows.Forms.Clipboard]::GetText()
          } finally {
            if ($previousClipboard) {
              [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true)
            } else {
              [System.Windows.Forms.Clipboard]::Clear()
            }
          }
          if ($actualDirectory.Trim('"') -ne $pathValue) {
            throw "The native directory address did not preserve the exact selected path. ExpectedLength=$($pathValue.Length); ActualLength=$($actualDirectory.Length)"
          }
          if (-not [InkForgeOwnedDialog]::SendKey(0x0D)) {
            throw 'The native directory dialog rejected a real Enter keyboard input.'
          }

          $confirmDeadline = [DateTime]::UtcNow.AddSeconds(4)
          $confirm = [IntPtr]::Zero
          do {
            $confirm = [InkForgeOwnedDialog]::GetDlgItem($candidate.Handle, 1)
            if ($confirm -ne [IntPtr]::Zero -and [InkForgeOwnedDialog]::IsWindowVisible($confirm) -and [InkForgeOwnedDialog]::IsWindowEnabled($confirm)) {
              break
            }
            Start-Sleep -Milliseconds 50
          } while ([DateTime]::UtcNow -lt $confirmDeadline)
          if ($confirm -eq [IntPtr]::Zero -or -not [InkForgeOwnedDialog]::IsWindowVisible($confirm) -or -not [InkForgeOwnedDialog]::IsWindowEnabled($confirm)) {
            throw 'The exact native directory dialog has no enabled visible confirm control.'
          }
          $confirmLabel = [Text.StringBuilder]::new(128)
          [void][InkForgeOwnedDialog]::GetWindowText($confirm, $confirmLabel, $confirmLabel.Capacity)
          if ($confirmLabel.ToString() -notlike '选择*文件夹*' -and $confirmLabel.ToString() -notlike 'Select*Folder*') {
            throw "The exact native directory confirm control has an unexpected label: $($confirmLabel.ToString())"
          }
          $confirmRect = [InkForgeOwnedDialog+Rect]::new()
          if (-not [InkForgeOwnedDialog]::GetWindowRect($confirm, [ref]$confirmRect)) {
            throw 'The exact native directory confirm control has no screen bounds.'
          }
          $previousCursor = [System.Windows.Forms.Cursor]::Position
          try {
            [void][InkForgeOwnedDialog]::SetCursorPos([int](($confirmRect.Left + $confirmRect.Right) / 2), [int](($confirmRect.Top + $confirmRect.Bottom) / 2))
            [InkForgeOwnedDialog]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
            Start-Sleep -Milliseconds 50
            [InkForgeOwnedDialog]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
          } finally {
            [void][InkForgeOwnedDialog]::SetCursorPos($previousCursor.X, $previousCursor.Y)
          }
        }
        } finally {
          foreach ($attachedThread in $attachedThreads) {
            [void][InkForgeOwnedDialog]::AttachThreadInput($currentThread, $attachedThread, $false)
          }
        }

        $closeDeadline = [DateTime]::UtcNow.AddSeconds(6)
        while ([InkForgeOwnedDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $closeDeadline) {
          Start-Sleep -Milliseconds 50
        }
        if (-not [InkForgeOwnedDialog]::IsWindow($candidate.Handle)) { exit 0 }
        throw 'The exact native dialog remained open after visible confirmation.'
      }
      Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'No exact InkForge dialog matched the configured title and process.'
  `;

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Native ${kind} dialog interaction failed (exit ${code}): ${stderr.trim()}`));
    });
  });
}

async function clickTextButton(scopeSelector, text) {
  const candidates = await browser.$$(`${scopeSelector} button`);
  for (const candidate of candidates) {
    if ((await candidate.getText()).replace(/\s+/gu, ' ').trim().includes(text)) {
      await candidate.scrollIntoView({ block: 'center', inline: 'nearest' });
      await candidate.waitForClickable({ timeout: 10_000 });
      await candidate.click();
      return candidate;
    }
  }
  throw new Error(`Visible button not found: ${text}`);
}

async function selectExportPlatform(label) {
  const pills = await browser.$$('.export-panel .pill-btn');
  for (const pill of pills) {
    if ((await pill.getText()).includes(label)) {
      await pill.scrollIntoView({ block: 'center', inline: 'nearest' });
      if (!(await pill.getAttribute('class')).includes('active')) await pill.click();
      await browser.waitUntil(async () => (await pill.getAttribute('class')).includes('active'), {
        timeout: 10_000,
        interval: 100,
        timeoutMsg: `${label} platform pill did not become active.`,
      });
      return;
    }
  }
  throw new Error(`Export platform pill not found: ${label}`);
}

async function waitForWrittenArtifact(label) {
  await browser.waitUntil(async () => browser.execute(expected => {
    const text = document.querySelector('.export-panel .native-card-main')?.textContent ?? '';
    return text.includes('已回读') && text.includes(expected);
  }, label), {
    timeout: 30_000,
    interval: 200,
    timeoutMsg: `${label} production artifact bundle was not visibly read back.`,
  });
}

describe('release platform artifact production', () => {
  before(() => {
    fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
    fs.writeFileSync(INPUT_FILE, INPUT_MARKDOWN, 'utf8');
    expect(fs.existsSync(SOURCE_IMAGE), 'the real InkForge icon exists for asset ingestion').to.equal(true);
  });

  after(() => fs.rmSync(RUN_ROOT, { recursive: true, force: true }));

  it('writes XHS raster and Zhihu Markdown/image bundles through the visible release UI', async function () {
    this.timeout(240_000);
    const processId = await getCurrentInkForgeProcessId();

    const hub = await browser.$('.hub-page');
    await hub.waitForDisplayed({ timeout: 15_000 });
    const importButton = await browser.$('.card-new .new-action-btn-secondary');
    await importButton.scrollIntoView({ block: 'center', inline: 'nearest' });
    await importButton.waitForClickable({ timeout: 10_000 });
    const importInteraction = interactWithOwnedNativeDialog({
      expectedProcessId: processId,
      kind: 'file',
      pathValue: INPUT_FILE,
      titles: ['导入文件'],
    });
    await importButton.click();
    await importInteraction;
    await browser.waitUntil(async () => browser.execute(() => (
      location.pathname.startsWith('/workstation') && Boolean(document.querySelector('.panel-editor'))
    )), {
      timeout: 20_000,
      interval: 100,
      timeoutMsg: 'Visible Hub import did not open the imported article in Workstation.',
    });

    const inspectorBar = await browser.$('.panel-inspector.collapsed .inspector-collapsed-bar');
    if (await inspectorBar.isExisting() && await inspectorBar.isDisplayed()) await inspectorBar.click();
    const inspectorPin = await browser.$('.inspector-pin-btn');
    await inspectorPin.waitForDisplayed({ timeout: 10_000 });
    if ((await inspectorPin.getAttribute('aria-pressed')) !== 'true') {
      await browser.execute(element => element.focus(), inspectorPin);
      await browser.keys('Enter');
      await browser.waitUntil(async () => (await inspectorPin.getAttribute('aria-pressed')) === 'true', {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'Inspector did not remain pinned for visible asset ingestion.',
      });
    }

    const uploader = await browser.$('.inspector-asset-wrapper .asset-uploader');
    await uploader.waitForDisplayed({ timeout: 10_000 });
    await uploader.scrollIntoView({ block: 'center', inline: 'nearest' });
    const uploadInteraction = interactWithOwnedNativeDialog({
      expectedProcessId: processId,
      kind: 'file',
      pathValue: SOURCE_IMAGE,
      titles: ['打开', 'Open'],
    });
    await uploader.click();
    await uploadInteraction;

    const assetName = path.basename(SOURCE_IMAGE);
    const assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
    await assetCard.waitForDisplayed({ timeout: 15_000 });
    await assetCard.scrollIntoView({ block: 'center', inline: 'nearest' });
    await browser.execute(element => element.focus(), assetCard);
    await browser.keys(['Shift', 'F10']);
    const contextMenu = await browser.$('.context-menu[role="menu"]');
    await contextMenu.waitForDisplayed({ timeout: 5_000 });
    expect((await browser.execute(() => document.activeElement?.textContent ?? '')).includes('插入到编辑器'))
      .to.equal(true);
    await browser.keys('Enter');
    const insertedImage = await browser.$(`.ProseMirror img.asset-image[alt="${assetName}"]`);
    await browser.waitUntil(async () => browser.execute(image => (
      image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    ), insertedImage), {
      timeout: 15_000,
      interval: 100,
      timeoutMsg: 'The real uploaded PNG was not decoded in the editor surface.',
    });

    const stageBar = await browser.$('.panel-stage .stage-collapsed-bar');
    if (await stageBar.isExisting() && await stageBar.isDisplayed()) await stageBar.click();
    await clickTextButton('aside.panel-stage', '全屏导出');
    const exportPanel = await browser.$('.export-panel[role="dialog"]');
    await exportPanel.waitForDisplayed({ timeout: 15_000 });

    await selectExportPlatform('小红书');
    const xhsDirectoryInteraction = interactWithOwnedNativeDialog({
      expectedProcessId: processId,
      kind: 'directory',
      pathValue: OUTPUT_ROOT,
      titles: ['选择小红书资产包目录'],
    });
    await clickTextButton('.export-panel', '导出小红书图文包');
    await xhsDirectoryInteraction;
    await waitForWrittenArtifact('manifest');

    await selectExportPlatform('知乎');
    await browser.waitUntil(async () => browser.execute(() => !(
      document.querySelector('.export-panel .native-card-main')?.textContent ?? ''
    ).includes('已回读')), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'Switching to Zhihu did not clear the previous XHS artifact receipt.',
    });
    const zhihuDirectoryInteraction = interactWithOwnedNativeDialog({
      expectedProcessId: processId,
      kind: 'directory',
      pathValue: OUTPUT_ROOT,
      titles: ['选择知乎资产包目录'],
    });
    await clickTextButton('.export-panel', '导出知乎 Markdown 资产包');
    await zhihuDirectoryInteraction;
    await waitForWrittenArtifact('manifest');

    const releaseIdentity = readReleaseIdentity();
    const files = walkFiles(OUTPUT_ROOT);
    const relativeOutputPath = file => path.relative(OUTPUT_ROOT, file).split(path.sep).join('/');
    const xhsManifestPath = files.find(file => /\.xiaohongshu[\\/]manifest\.json$/u.test(file));
    const xhsPostPath = files.find(file => /\.xiaohongshu[\\/]post\.txt$/u.test(file));
    const xhsPngPaths = files.filter(file => /\.xiaohongshu[\\/]page-\d+\.png$/u.test(file)).sort();
    expect(xhsManifestPath, 'XHS manifest was written by the release UI').to.be.a('string');
    expect(xhsPostPath, 'XHS plain-text post was written by the release UI').to.be.a('string');
    expect(xhsPngPaths.length, 'XHS release output contains real raster pages').to.be.greaterThan(0);

    const xhsManifestRelativePath = relativeOutputPath(xhsManifestPath);
    const xhsRoot = path.dirname(xhsManifestPath);
    const xhsRootRelativePath = relativeOutputPath(xhsRoot);
    const xhsManifestBytes = fs.readFileSync(xhsManifestPath);
    const xhsManifest = JSON.parse(xhsManifestBytes.toString('utf8'));
    expect(xhsManifest.kind, 'XHS manifest identifies image pages').to.equal('image-page');
    expect(xhsManifest.pages, 'XHS manifest contains page readback').to.be.an('array')
      .and.to.have.length(xhsPngPaths.length);
    expect(xhsManifest.bodyReferences, 'XHS manifest exposes body references').to.be.an('array');

    const xhsPageReports = xhsManifest.pages.map((page, index) => {
      const expectedPage = index + 1;
      const expectedFileName = `page-${String(expectedPage).padStart(2, '0')}.png`;
      expect(page.page, `XHS page ${expectedPage} keeps manifest order`).to.equal(expectedPage);
      expect(page.fileName, `XHS page ${expectedPage} keeps its file name`).to.equal(expectedFileName);
      expect(page.format, `XHS page ${expectedPage} keeps PNG format`).to.equal('png');
      expect(page.ratio, `XHS page ${expectedPage} keeps 3:4 ratio`).to.equal('3:4');
      expect(page.cover, `XHS page ${expectedPage} cover flag is positional`).to.equal(expectedPage === 1);
      expect(page.cropStatus, `XHS page ${expectedPage} crop status is explicit`).to.equal('ok');
      expect(page.referencedByBody, `XHS page ${expectedPage} body reference is explicit`)
        .to.equal(xhsManifest.bodyReferences.includes(expectedPage));

      const artifact = readBinaryArtifact(OUTPUT_ROOT, page.src, `XHS page ${expectedPage}`);
      expect(artifact.relativePath, `XHS page ${expectedPage} src stays relative and contained`)
        .to.equal(normalizeRelativePath(page.src));
      expect(path.basename(artifact.relativePath), `XHS page ${expectedPage} src matches file name`)
        .to.equal(expectedFileName);
      expect(page.exists, `XHS page ${expectedPage} exists flag is true`).to.equal(true);
      expect(page.width, `XHS page ${expectedPage} manifest width matches bytes`).to.equal(artifact.dimensions.width);
      expect(page.height, `XHS page ${expectedPage} manifest height matches bytes`).to.equal(artifact.dimensions.height);
      expect(page.bytes, `XHS page ${expectedPage} manifest bytes match disk`).to.equal(artifact.byteLength);
      expect(artifact.dimensions, `XHS page ${expectedPage} is the release 1080x1440 raster`)
        .to.deep.equal({ width: 1080, height: 1440 });
      return {
        page: expectedPage,
        fileName: expectedFileName,
        path: artifact.relativePath,
        width: artifact.dimensions.width,
        height: artifact.dimensions.height,
        bytes: artifact.byteLength,
        sha256: artifact.sha256,
        cover: page.cover,
        cropStatus: page.cropStatus,
        referencedByBody: page.referencedByBody,
      };
    });
    expect(xhsManifest.bodyReferences, 'XHS body references cover every ordered page')
      .to.deep.equal(xhsPageReports.map(page => page.page));
    expect(xhsPngPaths.map(relativeOutputPath), 'XHS on-disk pages match every manifest page')
      .to.deep.equal(xhsPageReports.map(page => page.path).sort());

    const xhsPostLocation = resolveContainedFile(OUTPUT_ROOT, relativeOutputPath(xhsPostPath), 'XHS post');
    const xhsPostBytes = fs.readFileSync(xhsPostLocation.absolutePath);
    const xhsPost = xhsPostBytes.toString('utf8');
    expect(xhsPost).to.include('InkForge 三平台渲染验收');
    expect(xhsPost).not.to.match(/<(?:section|svg|style)\b|\bstyle\s*=|inkforge-asset:|data:image|blob:|localhost|127\.0\.0\.1/iu);
    assertExactFiles(xhsRoot, [
      'manifest.json',
      'post.txt',
      ...xhsPageReports.map(page => page.fileName),
    ], 'XHS bundle');

    const zhihuManifestPath = files.find(file => /\.zhihu-manifest\.json$/u.test(file));
    const zhihuMarkdownPath = files.find(file => /\.md$/u.test(file));
    expect(zhihuManifestPath, 'Zhihu manifest was written by the release UI').to.be.a('string');
    expect(zhihuMarkdownPath, 'Zhihu clean Markdown was written by the release UI').to.be.a('string');
    const zhihuManifestBytes = fs.readFileSync(zhihuManifestPath);
    const zhihuManifest = JSON.parse(zhihuManifestBytes.toString('utf8'));
    expect(zhihuManifest.requirePlatformUpload, 'Zhihu local fallback still requires platform upload').to.equal(true);
    expect(zhihuManifest.artifacts, 'Zhihu manifest contains real image fallback metadata').to.be.an('array')
      .and.to.have.length.greaterThan(0);
    const zhihuMarkdownLocation = resolveContainedFile(
      OUTPUT_ROOT,
      relativeOutputPath(zhihuMarkdownPath),
      'Zhihu Markdown',
    );
    const zhihuMarkdownBytes = fs.readFileSync(zhihuMarkdownLocation.absolutePath);
    const zhihuMarkdown = zhihuMarkdownBytes.toString('utf8');
    expect(zhihuMarkdown).to.include('InkForge 三平台渲染验收');
    expect(zhihuMarkdown).not.to.match(/<(?:section|svg|style)\b|\bstyle\s*=|inkforge-asset:|data:image|blob:|localhost|127\.0\.0\.1|file:\/\//iu);
    const markdownReferences = collectMarkdownImageReferences(zhihuMarkdown);
    expect(zhihuManifest.markdownReferences, 'Zhihu manifest references every Markdown image in order')
      .to.deep.equal(markdownReferences.map(reference => reference.src));

    const zhihuArtifactReports = zhihuManifest.artifacts.map((artifact, index) => {
      expect(artifact.id, `Zhihu artifact ${index + 1} has an id`).to.be.a('string').and.not.equal('');
      expect(artifact.exists, `Zhihu artifact ${index + 1} exists flag is true`).to.equal(true);
      expect(artifact.uploaded, `Zhihu artifact ${index + 1} is not published`).to.equal(false);
      expect(artifact.hostStatus, `Zhihu artifact ${index + 1} remains local-only`).to.equal('local-only');
      expect(artifact.referencedByMarkdown, `Zhihu artifact ${index + 1} is referenced`).to.equal(true);
      expect(artifact.format, `Zhihu artifact ${index + 1} keeps PNG format`).to.equal('png');
      expect(artifact.fileName, `Zhihu artifact ${index + 1} keeps its file name`).to.be.a('string').and.not.equal('');

      const source = readBinaryArtifact(OUTPUT_ROOT, artifact.sourceSrc, `Zhihu artifact ${index + 1} source`);
      const final = readBinaryArtifact(OUTPUT_ROOT, artifact.finalSrc, `Zhihu artifact ${index + 1} final`);
      expect(source.relativePath, `Zhihu artifact ${index + 1} source path is contained`)
        .to.equal(normalizeRelativePath(artifact.sourceSrc));
      expect(final.relativePath, `Zhihu artifact ${index + 1} final path is contained`)
        .to.equal(normalizeRelativePath(artifact.finalSrc));
      expect(path.basename(final.relativePath), `Zhihu artifact ${index + 1} final name matches manifest`)
        .to.equal(artifact.fileName);
      expect(artifact.bytes, `Zhihu artifact ${index + 1} manifest bytes match final disk bytes`)
        .to.equal(final.byteLength);
      expect(source.byteLength, `Zhihu artifact ${index + 1} source and final bytes agree`)
        .to.equal(final.byteLength);
      expect(source.sha256, `Zhihu artifact ${index + 1} source and final hashes agree`)
        .to.equal(final.sha256);
      const references = markdownReferences.filter(reference => reference.src === final.relativePath);
      expect(references, `Zhihu artifact ${index + 1} has one Markdown reference`).to.have.length(1);
      expect(references[0].alt.trim(), `Zhihu artifact ${index + 1} keeps a non-empty alt`).not.to.equal('');
      return {
        id: artifact.id,
        sourcePath: source.relativePath,
        finalPath: final.relativePath,
        fileName: artifact.fileName,
        format: artifact.format,
        width: final.dimensions.width,
        height: final.dimensions.height,
        bytes: final.byteLength,
        sha256: final.sha256,
        referencedByMarkdown: artifact.referencedByMarkdown,
      };
    });
    expect(markdownReferences.map(reference => reference.src), 'every Markdown image points to a manifest artifact')
      .to.have.members(zhihuArtifactReports.map(artifact => artifact.finalPath));

    const expectedOutputFiles = new Set([
      ...relativeFiles(xhsRoot).map(file => `${xhsRootRelativePath}/${file}`),
      relativeOutputPath(zhihuManifestPath),
      relativeOutputPath(zhihuMarkdownPath),
      ...zhihuArtifactReports.flatMap(artifact => [artifact.sourcePath, artifact.finalPath]),
    ]);
    expect(relativeFiles(OUTPUT_ROOT), 'all release output files are declared by XHS or Zhihu manifests')
      .to.deep.equal([...expectedOutputFiles].sort());

    const releaseArtifactReceipt = {
      status: 'local',
      executableBytes: releaseIdentity.executableBytes,
      executableSha256: releaseIdentity.executableSha256,
      producer: releaseIdentity.producerLabel,
      producerSha256: releaseIdentity.producerSha256,
      artifacts: {
        xhs: {
          manifest: {
            path: xhsManifestRelativePath,
            bytes: xhsManifestBytes.length,
            sha256: sha256(xhsManifestBytes),
          },
          post: {
            path: xhsPostLocation.relativePath,
            bytes: xhsPostBytes.length,
            sha256: sha256(xhsPostBytes),
          },
          pages: xhsPageReports,
        },
        zhihu: {
          manifest: {
            path: relativeOutputPath(zhihuManifestPath),
            bytes: zhihuManifestBytes.length,
            sha256: sha256(zhihuManifestBytes),
          },
          markdown: {
            path: zhihuMarkdownLocation.relativePath,
            bytes: zhihuMarkdownBytes.length,
            sha256: sha256(zhihuMarkdownBytes),
          },
          artifacts: zhihuArtifactReports,
        },
      },
    };
    const platformReadbackReceipt = {
      status: 'not-run',
      published: false,
      reason: 'External XHS and Zhihu platform readback is outside this local release harness.',
    };
    const receipt = {
      published: false,
      releaseArtifactReceipt,
      platformReadbackReceipt,
    };
    expect(JSON.stringify(receipt), 'release receipt contains no absolute paths')
      .not.to.match(/(?:[a-z]:[\\/]|\\\\|\/(?:Users|home|tmp)\/)/iu);
    console.log('[release-artifact-receipt]', JSON.stringify(receipt));
  });
});
