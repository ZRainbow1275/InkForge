const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isNativeHostWebViewBoundsAligned,
  isProducerSourceFile,
} = require('./wdio.conf.cjs');

test('native host and WebView bounds allow only DPI-scale border variance', () => {
  assert.equal(
    isNativeHostWebViewBoundsAligned(
      { width: 1401, height: 900 },
      { width: 1400, height: 900 },
    ),
    true,
  );
  assert.equal(
    isNativeHostWebViewBoundsAligned(
      { width: 1408, height: 892 },
      { width: 1400, height: 900 },
    ),
    true,
  );
  assert.equal(
    isNativeHostWebViewBoundsAligned(
      { width: 1409, height: 900 },
      { width: 1400, height: 900 },
    ),
    false,
  );
  assert.equal(
    isNativeHostWebViewBoundsAligned(
      { width: 1400, height: 909 },
      { width: 1400, height: 900 },
    ),
    false,
  );
  assert.equal(
    isNativeHostWebViewBoundsAligned(
      { width: 1400, height: 891 },
      { width: 1400, height: 900 },
    ),
    false,
  );
});

test('producer source enumeration excludes tests on Windows and POSIX paths', () => {
  assert.equal(isProducerSourceFile('D:\\InkForge\\src\\services\\export\\zhihu.ts'), true);
  assert.equal(isProducerSourceFile('/workspace/src/services/export/zhihu.ts'), true);
  assert.equal(isProducerSourceFile('D:\\InkForge\\src\\services\\export\\zhihu.test.ts'), false);
  assert.equal(
    isProducerSourceFile('D:\\InkForge\\src\\services\\export\\__tests__\\node-builtins.shim.d.ts'),
    false,
  );
  assert.equal(isProducerSourceFile('/workspace/src/services/export/__tests__/node-builtins.shim.d.ts'), false);
});
