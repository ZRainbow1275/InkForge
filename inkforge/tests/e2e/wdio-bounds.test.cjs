const assert = require('node:assert/strict');
const test = require('node:test');

const { isNativeHostWebViewBoundsAligned } = require('./wdio.conf.cjs');

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
