/**
 * Native Tauri/WebView2 shell lifecycle acceptance.
 *
 * The spec deliberately uses production controls, WebdriverIO input, and
 * real Tauri window handles. browser.execute is limited to read-only state,
 * geometry, and focus inspection.
 */
/* global after */
const { spawnSync } = require('node:child_process');
const { expect } = require('chai');

const HUB_DRAFT_CONTROLS = [
  ['.recent-create-btn', '空白草稿'],
  ['.hero-empty-btn', '空白开始'],
  ['.empty-create-btn', '新建文章'],
  ['.quick-action-item', '新建空白文档'],
];
const REQUIRED_WIDGET_ACTIONS = ['dock', 'float', 'native', 'close', 'reopen', 'redock'];

let mainHandle;
let createdArticleId;
const createdArticleIds = [];

async function readShellState() {
  return browser.execute(() => {
    const readPanel = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        collapsed: element.classList.contains('collapsed'),
        width: rect.width,
        height: rect.height,
      };
    };
    const active = document.activeElement;
    const activeSelector = ['.manager-collapsed-bar', '.stage-collapsed-bar', '.inspector-collapsed-bar',
      '.panel-manager [data-manager-tab][aria-pressed="true"]', '.panel-stage .collapse-trigger',
      '.panel-inspector .collapse-trigger', '.inspector-widget-menu-trigger']
      .find(selector => active?.matches(selector)) ?? null;
    const workstation = document.querySelector('.workstation');
    const managerTab = workstation?.querySelector('.panel-manager [data-manager-tab][aria-pressed="true"]')
      ?.getAttribute('data-manager-tab') ?? null;
    const motion = workstation ? getComputedStyle(workstation) : null;
    const manager = document.querySelector('.panel-manager');
    const readRect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };
    const transition = manager ? getComputedStyle(manager).transitionDuration : '';
    const transitionMs = transition.split(',').map(value => value.trim()).map(value => (
      value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
    ));

    const widgetMenu = document.querySelector('#inspector-widget-menu-popover');
    const widgetCapabilityCount = Number.parseInt(widgetMenu?.getAttribute('data-capability-count') ?? '', 10);

    return {
      path: `${location.pathname}${location.search}`,
      hasWorkstation: Boolean(workstation),
      hasEditor: Boolean(document.querySelector('.ProseMirror')),
      manager: readPanel('.panel-manager'),
      managerTab,
      stage: readPanel('.panel-stage'),
      inspector: readPanel('.panel-inspector'),
      inspectorPinned: document.querySelector('.inspector-pin-btn')?.getAttribute('aria-pressed') === 'true',
      widgetMenuOpen: document.querySelector('.inspector-widget-menu-trigger')?.getAttribute('aria-expanded') === 'true',
      widgetCapabilityCount: Number.isFinite(widgetCapabilityCount) ? widgetCapabilityCount : null,
      widgetPlacements: Array.from(document.querySelectorAll('.inspector-widget-menu-item')).map(item => ({
        id: item.getAttribute('data-capability-id'),
        title: item.querySelector('strong')?.textContent?.trim() ?? '',
        placement: item.getAttribute('data-placement'),
        actions: Array.from(item.querySelectorAll('button'))
          .map(button => button.getAttribute('aria-label'))
          .filter(Boolean),
      })),
      floatingWidgetIds: Array.from(document.querySelectorAll('.floating-inspector-widget'))
        .map(item => item.getAttribute('data-inspector-widget-id')),
      effectiveReducedMotion: workstation?.getAttribute('data-reduced-motion') === 'true',
      reducedMotionTransitionMs: transitionMs,
      osReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      activeSelector,
      activeAriaLabel: active?.getAttribute('aria-label') ?? null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      editorGeometry: readRect('.panel-editor'),
      stageGeometry: readRect('.panel-stage'),
      rootMotion: motion?.getPropertyValue('--motion-slow').trim() ?? null,
    };
  });
}

async function waitForState(predicate, message, timeout = 10_000) {
  await browser.waitUntil(async () => predicate(await readShellState()), {
    timeout,
    interval: 100,
    timeoutMsg: message,
  });
}

async function waitForFocus(selector, message) {
  await browser.waitUntil(
    async () => browser.execute(target => document.activeElement === document.querySelector(target), selector),
    { timeout: 5_000, interval: 50, timeoutMsg: message },
  );
}

async function waitForActiveAriaLabel(label, message) {
  await browser.waitUntil(
    async () => browser.execute(expected => document.activeElement?.getAttribute('aria-label') === expected, label),
    { timeout: 5_000, interval: 50, timeoutMsg: message },
  );
}

async function findVisibleHubDraftControl() {
  const find = async () => {
    for (const [selector, text] of HUB_DRAFT_CONTROLS) {
      for (const candidate of await browser.$$(selector)) {
        if (await candidate.isDisplayed() && (await candidate.getText()).includes(text)) return candidate;
      }
    }
    return null;
  };

  let control = await find();
  if (control) return control;

  const trigger = await browser.$('.quick-action-fab[aria-label="打开快速创建菜单"]');
  if (await trigger.isDisplayed()) {
    await trigger.waitForClickable({ timeout: 5_000 });
    await trigger.click();
    await browser.waitUntil(async () => Boolean(await find()), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'Hub quick-create menu did not expose a blank-draft control',
    });
  }
  control = await find();
  return control;
}

async function openHubWithVisibleControls() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await readShellState();
    if (state.path === '/') {
      await (await browser.$('.hub-page')).waitForDisplayed({ timeout: 10_000 });
      return;
    }

    let control;
    if (state.path.startsWith('/workstation')) control = await browser.$('.header-back-btn');
    else if (state.path.startsWith('/settings')) control = await browser.$('.sv-back-btn');
    else control = await browser.$('[aria-label="返回首页"]');

    await control.waitForClickable({ timeout: 5_000 });
    await control.click();
    await browser.waitUntil(async () => (await readShellState()).path !== state.path, {
      timeout: 10_000,
      interval: 100,
      timeoutMsg: `visible navigation did not leave ${state.path}`,
    });
  }
  throw new Error('The production visible navigation did not reach Hub');
}

async function createBlankDraft() {
  await openHubWithVisibleControls();
  const control = await findVisibleHubDraftControl();
  expect(control, 'Hub exposes a real blank-draft control').to.not.equal(null);
  await control.waitForClickable({ timeout: 5_000 });
  await control.click();

  await browser.waitUntil(async () => {
    const state = await readShellState();
    return state.path.startsWith('/workstation') && state.hasEditor;
  }, {
    timeout: 15_000,
    interval: 100,
    timeoutMsg: 'the visible blank-draft action did not open Workstation',
  });

  createdArticleId = await browser.execute(() => {
    const match = location.search.match(/[?&]id=([^&]*)/u);
    return match ? decodeURIComponent(match[1]) : null;
  });
  expect(createdArticleId, 'the real draft route exposes an article id').to.be.a('string').and.not.equal('');
  createdArticleIds.push(createdArticleId);
}

async function returnToCreatedArticle(articleId = createdArticleId) {
  if (!articleId) return;
  const state = await readShellState();
  const currentArticleId = await browser.execute(() => {
    const match = location.search.match(/[?&]id=([^&]*)/u);
    return match ? decodeURIComponent(match[1]) : null;
  });
  if (state.path.startsWith('/workstation') && currentArticleId === articleId) return;
  await openHubWithVisibleControls();
  const card = await browser.$(`[data-hub-article-id="${articleId}"]`);
  await card.scrollIntoView({ block: 'center', inline: 'nearest' });
  await card.waitForClickable({ timeout: 10_000 });
  await card.click();
  await waitForState(
    current => current.path.startsWith('/workstation') && current.hasEditor,
    'the visible Hub article card did not return to Workstation',
  );
}

async function setReducedMotion(enabled) {
  await openHubWithVisibleControls();
  const settingsButton = await browser.$('[aria-label="打开设置"]');
  await settingsButton.waitForClickable({ timeout: 5_000 });
  await settingsButton.click();
  await waitForState(state => state.path.startsWith('/settings'), 'the visible settings control did not open Settings');

  const appearanceTab = await browser.$('button=外观');
  await appearanceTab.waitForClickable({ timeout: 5_000 });
  await appearanceTab.click();
  await (await browser.$('[data-settings-tab="appearance"]')).waitForDisplayed({ timeout: 5_000 });

  const input = await browser.$('input[aria-label="减弱动效"]');
  const control = await browser.$('//input[@aria-label="减弱动效"]/parent::label');
  await control.scrollIntoView({ block: 'center', inline: 'nearest' });
  await control.waitForClickable({ timeout: 5_000 });
  const previous = await input.isSelected();
  if (previous !== enabled) {
    await control.click();
    await browser.waitUntil(async () => (await input.isSelected()) === enabled, {
      timeout: 5_000,
      interval: 50,
      timeoutMsg: `the visible reduced-motion switch did not become ${enabled ? 'enabled' : 'disabled'}`,
    });
  }
  return previous;
}

async function collapseExpandPanel(panelSelector, collapsedSelector, collapseSelector, focusAfterExpand, expandKey) {
  const moveAwayFromInspectorEdge = async () => {
    const state = await readShellState();
    if (state.inspectorPinned || state.inspector?.collapsed) return;
    await (await browser.$('.panel-editor')).moveTo();
    await waitForState(
      current => current.inspector?.collapsed === true,
      'Unpinned Inspector did not leave the target panel unobscured',
    );
    await (await browser.$('.inspector-collapsed-bar')).waitForDisplayed({ timeout: 5_000 });
  };

  await moveAwayFromInspectorEdge();
  const panel = await browser.$(panelSelector);
  const initial = (await panel.getAttribute('class')).split(/\s+/u).includes('collapsed');

  if (!initial) {
    await waitForPanelTransitions(`${panelSelector} transition did not settle before collapse`);
    await clickUnobscured(collapseSelector, `${panelSelector} collapse control`);
    await waitForState(state => state[panelSelector.slice(7)]?.collapsed === true, `${panelSelector} did not collapse`);
    await moveAwayFromInspectorEdge();
    await waitForFocus(collapsedSelector, `${panelSelector} did not restore focus to its collapsed bar`);
  } else {
    await moveAwayFromInspectorEdge();
    await waitForPanelTransitions(`${panelSelector} transition did not settle before expansion`);
    await clickUnobscured(collapsedSelector, `${panelSelector} collapsed control`);
    await waitForState(state => state[panelSelector.slice(7)]?.collapsed === false, `${panelSelector} did not expand`);
    await waitForFocus(focusAfterExpand, `${panelSelector} did not focus its first expanded control`);
    await waitForPanelTransitions(`${panelSelector} expansion transition did not settle before collapse`);
    await clickUnobscured(collapseSelector, `${panelSelector} expanded collapse control`);
    await waitForState(state => state[panelSelector.slice(7)]?.collapsed === true, `${panelSelector} did not collapse from expanded state`);
    await moveAwayFromInspectorEdge();
    await waitForFocus(collapsedSelector, `${panelSelector} did not restore collapsed focus`);
  }

  if (expandKey) await browser.keys(expandKey);
  else {
    await waitForPanelTransitions(`${panelSelector} transition did not settle before final expansion`);
    await clickUnobscured(collapsedSelector, `${panelSelector} final expansion control`);
  }
  await waitForState(state => state[panelSelector.slice(7)]?.collapsed === false, `${panelSelector} did not finish expanded`);
  await waitForFocus(focusAfterExpand, `${panelSelector} did not restore expanded focus`);
  await waitForPanelTransitions(`${panelSelector} final expansion transition did not settle`);
  const final = await readShellState();
  return {
    initialCollapsed: initial,
    finalCollapsed: final[panelSelector.slice(7)]?.collapsed ?? null,
    finalActiveAriaLabel: final.activeAriaLabel,
    observedActions: ['collapse', 'expand'],
  };
}

function expectGeometryClose(actual, expected, label) {
  expect(actual, `${label} exposes geometry`).to.not.equal(null);
  expect(expected, `${label} has baseline geometry`).to.not.equal(null);
  for (const key of ['left', 'top', 'width', 'height']) {
    expect(Math.abs(actual[key] - expected[key]), `${label} ${key} does not drift`).to.be.at.most(1);
  }
}

function geometryWithin(actual, expected, tolerance = 1) {
  if (!actual || !expected) return false;
  return ['left', 'top', 'width', 'height']
    .every(key => Math.abs(actual[key] - expected[key]) <= tolerance);
}

async function waitForGeometry(expectedEditor, expectedStage, message) {
  await browser.waitUntil(async () => {
    const state = await readShellState();
    return geometryWithin(state.editorGeometry, expectedEditor)
      && geometryWithin(state.stageGeometry, expectedStage);
  }, {
    timeout: 10_000,
    interval: 50,
    timeoutMsg: message,
  });
}

async function waitForPanelTransitions(message) {
  await browser.waitUntil(
    async () => browser.execute(() => [
      '.panel-manager',
      '.panel-stage',
      '.panel-inspector',
    ].every(selector => document.querySelector(selector)?.getAnimations()
      .every(animation => animation.playState !== 'running'))),
    { timeout: 5_000, interval: 50, timeoutMsg: message },
  );
}

async function clickUnobscured(selector, label) {
  const point = await browser.execute((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    const hit = document.elementFromPoint(x, y);
    return hit && (hit === target || target.contains(hit)) ? { x, y } : null;
  }, selector);
  expect(point, `${label} exposes a real unobscured pointer target`).to.not.equal(null);
  await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ duration: 0, x: point.x, y: point.y })
    .down({ button: 0 })
    .up({ button: 0 })
    .perform();
}

async function setPanelCollapsed(panelKey, collapsed, collapsedSelector, collapseSelector) {
  const state = await readShellState();
  if (state[panelKey]?.collapsed === collapsed) return;
  await waitForPanelTransitions(`${panelKey} transition did not settle before restoring state`);
  if (panelKey === 'inspector' && !collapsed && !state.inspectorPinned) {
    const control = await browser.$(collapsedSelector);
    await control.waitForClickable({ timeout: 5_000 });
    await control.click();
  } else {
    await clickUnobscured(
      collapsed ? collapseSelector : collapsedSelector,
      `${panelKey} state restore control`,
    );
  }
  await waitForState(current => current[panelKey]?.collapsed === collapsed, `${panelKey} did not reach requested state`);
}

async function openWidgetMenu() {
  await setPanelCollapsed(
    'inspector',
    false,
    '.inspector-collapsed-bar',
    '.panel-inspector .collapse-trigger',
  );
  await waitForPanelTransitions('Inspector transition did not settle before opening widget menu');
  const point = await browser.execute(() => {
    const trigger = document.querySelector('.inspector-widget-menu-trigger');
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  });
  expect(point, 'Inspector widget menu trigger exposes a pointer target').to.not.equal(null);
  await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ duration: 0, x: point.x, y: point.y })
    .pause(50)
    .perform();
  const trigger = await browser.$('.inspector-widget-menu-trigger');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.waitForClickable({ timeout: 5_000 });
    await trigger.click();
  }
  const menu = await browser.$('#inspector-widget-menu-popover');
  await menu.waitForDisplayed({ timeout: 5_000 });
  await waitForActiveAriaLabel('关闭检查器窗口管理', 'widget menu did not focus its first control');
  return menu;
}

async function closeWidgetMenu() {
  const close = await browser.$('[aria-label="关闭检查器窗口管理"]');
  if (await close.isExisting() && await close.isDisplayed()) await close.click();
}

async function findWidgetMenuItem(title) {
  for (const item of await browser.$$('#inspector-widget-menu-popover .inspector-widget-menu-item')) {
    if ((await item.getText()).includes(title)) return item;
  }
  throw new Error(`widget menu item not found: ${title}`);
}

async function readWidgetCapability(title) {
  await openWidgetMenu();
  const item = await findWidgetMenuItem(title);
  const actions = [];
  for (const button of await item.$$('button')) {
    const label = await button.getAttribute('aria-label');
    if (label) actions.push(label);
  }
  return {
    id: await item.getAttribute('data-capability-id'),
    title,
    placement: await item.getAttribute('data-placement'),
    actions,
  };
}

async function readWidgetPlacement(title) {
  return (await readWidgetCapability(title)).placement;
}

async function clickWidgetMenuAction(title, label) {
  const menu = await openWidgetMenu();
  const item = await findWidgetMenuItem(title);
  const action = await item.$(`[aria-label="${label}"]`);
  await action.waitForClickable({ timeout: 5_000 });
  await action.click();
  await menu.waitForExist({ reverse: true, timeout: 5_000 });
}

async function waitForWidgetPlacement(title, expected) {
  await browser.waitUntil(async () => (await readWidgetPlacement(title)) === expected, {
    timeout: 10_000,
    interval: 100,
    timeoutMsg: `${title} widget did not reach placement ${expected}`,
  });
  const placement = await readWidgetPlacement(title);
  await closeWidgetMenu();
  return placement;
}

async function readRuntimeCapabilityTable() {
  await openWidgetMenu();
  const state = await readShellState();
  expect(state.widgetCapabilityCount, 'runtime registry declares its inspector widget count')
    .to.be.a('number');
  expect(state.widgetPlacements, 'runtime DOM exposes exactly the declared inspector widgets')
    .to.have.length(state.widgetCapabilityCount);
  const capabilityIds = state.widgetPlacements.map(widget => widget.id);
  expect(capabilityIds.every(Boolean), 'every runtime inspector widget exposes a capability id').to.equal(true);
  expect(new Set(capabilityIds).size, 'runtime inspector capability ids are unique')
    .to.equal(capabilityIds.length);
  const table = {
    source: 'live runtime DOM capability table',
    declaredWidgetCount: state.widgetCapabilityCount,
    panels: ['manager', 'stage', 'inspector'].map(id => ({
      id,
      initialState: state[id],
    })),
    widgets: state.widgetPlacements,
  };
  await closeWidgetMenu();
  return table;
}

async function findFloatingWidget(title) {
  for (const widget of await browser.$$('.floating-inspector-widget')) {
    if ((await widget.getText()).includes(title)) return widget;
  }
  throw new Error(`floating widget not found: ${title}`);
}

async function readFloatingWidgetGeometry(capabilityId) {
  return browser.execute(id => {
    const widget = document.querySelector(`[data-inspector-widget-id="${id}"]`);
    if (!widget) return null;
    const rect = widget.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
    };
  }, capabilityId);
}

async function assertFloatingWidgetKeyboardMove(widget) {
  const selector = `[data-inspector-widget-id="${widget.id}"] .floating-inspector-widget__grip`;
  const grip = await browser.$(selector);
  await grip.waitForDisplayed({ timeout: 5_000 });
  await grip.click();
  await waitForFocus(selector, `${widget.title} floating grip did not receive focus`);
  const before = await readFloatingWidgetGeometry(widget.id);
  expect(before, `${widget.title} exposes floating geometry`).to.not.equal(null);
  const forwardKey = before.left + before.width + 16 < before.viewportWidth ? 'ArrowRight' : 'ArrowLeft';
  const reverseKey = forwardKey === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
  await browser.keys(forwardKey);
  await browser.waitUntil(async () => {
    const current = await readFloatingWidgetGeometry(widget.id);
    return current && Math.abs(current.left - before.left) >= 1;
  }, {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `${widget.title} floating grip direction key did not move the widget`,
  });
  const moved = await readFloatingWidgetGeometry(widget.id);
  await browser.keys(reverseKey);
  await browser.waitUntil(async () => geometryWithin(
    await readFloatingWidgetGeometry(widget.id),
    before,
  ), {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: `${widget.title} reverse direction key did not restore geometry`,
  });
  const restored = await readFloatingWidgetGeometry(widget.id);
  return {
    focusAriaLabel: (await readShellState()).activeAriaLabel,
    forwardKey,
    before,
    moved,
    restored,
  };
}

async function movePointerToInspectorEdge(edge) {
  const state = await readShellState();
  const edgePoint = edge === 'right'
    ? await browser.execute(() => {
      const target = document.querySelector('.inspector-collapsed-bar');
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    })
    : { x: 1, y: Math.round(state.viewport.height / 2) };
  expect(edgePoint, 'Inspector edge exposes a real pointer target').to.not.equal(null);
  const pointer = browser.action('pointer', { parameters: { pointerType: 'mouse' } });
  if (edge === 'right') {
    pointer
      .move({ duration: 0, x: edgePoint.x - 32, y: edgePoint.y })
      .pause(50);
  }
  await pointer
    .move({ duration: 0, x: edgePoint.x, y: edgePoint.y })
    .pause(edge === 'right' ? 250 : 650)
    .perform();
}

async function waitForUtilityWindow(title) {
  let utilityHandle = null;
  await browser.waitUntil(async () => {
    for (const handle of await browser.getWindowHandles()) {
      if (handle === mainHandle) continue;
      try {
        await browser.switchToWindow(handle);
        const matches = await browser.execute(expected => (
          document.querySelector('.utility-widget')
          && document.querySelector('.utility-widget__header strong')?.textContent?.trim() === expected
        ), title);
        if (matches) {
          utilityHandle = handle;
          return true;
        }
      } catch {
        // A native window can disappear while handles are enumerated.
      }
    }
    await browser.switchToWindow(mainHandle);
    return false;
  }, {
    timeout: 15_000,
    interval: 100,
    timeoutMsg: `native utility window did not mount for ${title}`,
  });
  return utilityHandle;
}

async function waitForUtilityArticleContext(articleId) {
  let readback = null;
  await browser.waitUntil(async () => {
    readback = await browser.execute(() => {
      const widget = document.querySelector('.utility-widget');
      const routeMatch = location.search.match(/[?&]articleId=([^&]*)/u);
      return {
        articleId: widget?.getAttribute('data-inspector-article-id') ?? null,
        contextSource: widget?.getAttribute('data-inspector-context-source') ?? null,
        routeArticleId: routeMatch ? decodeURIComponent(routeMatch[1]) : null,
      };
    });
    return readback.articleId === articleId && readback.contextSource === 'live';
  }, {
    timeout: 15_000,
    interval: 100,
    timeoutMsg: `native utility window did not read back article context ${articleId}`,
  });
  return readback;
}

async function assertUtilityKeyboardLifecycle() {
  const first = await browser.$('.utility-widget__controls button:first-child');
  await first.waitForDisplayed({ timeout: 5_000 });
  const firstLabel = await first.getAttribute('aria-label');
  await waitForActiveAriaLabel(firstLabel, 'utility window did not focus its first control');
  await browser.keys('Tab');
  await waitForActiveAriaLabel('最小化小组件', 'utility Tab did not move to the second control');
  await browser.keys(['Shift', 'Tab']);
  await waitForActiveAriaLabel(firstLabel, 'utility Shift+Tab did not restore first-control focus');
  return {
    firstControl: firstLabel,
    tabControl: '最小化小组件',
    restoredControl: (await browser.execute(() => document.activeElement?.getAttribute('aria-label') ?? null)),
  };
}

async function assertManagerShortcutLifecycle() {
  const before = (await readShellState()).manager.collapsed;
  const focusTarget = before
    ? '.manager-collapsed-bar'
    : '.panel-manager [data-manager-tab][aria-pressed="true"]';
  await (await browser.$(focusTarget)).click();
  await browser.keys(['Control', 'Shift', 'b']);
  await waitForState(state => state.manager.collapsed === !before, 'Ctrl+Shift+B did not toggle Manager');
  const toggled = await readShellState();
  await browser.keys(['Control', 'Shift', 'b']);
  await waitForState(state => state.manager.collapsed === before, 'Ctrl+Shift+B did not restore Manager');
  const restored = await readShellState();
  return {
    binding: 'Ctrl+Shift+B',
    beforeCollapsed: before,
    toggledCollapsed: toggled.manager.collapsed,
    restoredCollapsed: restored.manager.collapsed,
    restoredFocusAriaLabel: restored.activeAriaLabel,
  };
}

async function closeNativeUtilityWithEscape(handle) {
  await browser.keys('Escape');
  await browser.switchToWindow(mainHandle);
  await browser.waitUntil(async () => !(await browser.getWindowHandles()).includes(handle), {
    timeout: 10_000,
    interval: 100,
    timeoutMsg: 'Escape did not close the top-level native utility window',
  });
  await waitForFocus('.inspector-widget-menu-trigger', 'native close did not restore main-window focus');
}

async function closeNativeUtilityWithSystemCommand(handle, title) {
  const processId = Number(browser.capabilities?.['goog:processID']);
  expect(
    Number.isInteger(processId) && processId > 0,
    'system close owns a verified InkForge process',
  ).to.equal(true);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -TypeDefinition @'",
    'using System;',
    'using System.Collections.Generic;',
    'using System.Runtime.InteropServices;',
    'using System.Text;',
    'public static class InkForgeWindowClose {',
    '  private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
    '  [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);',
    '  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);',
    '  [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowTextLengthW(IntPtr hWnd);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int count);',
    '  [DllImport("user32.dll", SetLastError = true)] private static extern bool PostMessageW(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);',
    '  public static IntPtr[] Find(uint processId, string exactTitle) {',
    '    var matches = new List<IntPtr>();',
    '    EnumWindows((hWnd, _) => {',
    '      uint owner;',
    '      GetWindowThreadProcessId(hWnd, out owner);',
    '      if (owner != processId || !IsWindowVisible(hWnd)) return true;',
    '      var text = new StringBuilder(GetWindowTextLengthW(hWnd) + 1);',
    '      GetWindowTextW(hWnd, text, text.Capacity);',
    '      if (text.ToString() == exactTitle) matches.Add(hWnd);',
    '      return true;',
    '    }, IntPtr.Zero);',
    '    return matches.ToArray();',
    '  }',
    '  public static bool RequestSystemClose(IntPtr hWnd) {',
    '    return PostMessageW(hWnd, 0x0112, new IntPtr(0xF060), IntPtr.Zero);',
    '  }',
    '}',
    "'@",
    '$handles = [InkForgeWindowClose]::Find([uint32]::Parse($env:INKFORGE_E2E_PROCESS_ID), $env:INKFORGE_E2E_WINDOW_TITLE)',
    "if ($handles.Count -ne 1) { throw 'Expected exactly one owned native utility window.' }",
    "if (-not [InkForgeWindowClose]::RequestSystemClose($handles[0])) { throw 'WM_SYSCOMMAND/SC_CLOSE failed.' }",
  ].join('\n');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        INKFORGE_E2E_PROCESS_ID: String(processId),
        INKFORGE_E2E_WINDOW_TITLE: `InkForge · ${title}`,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Unable to request the owned native utility system close (exit ${result.status}).`);
  }
  await browser.switchToWindow(mainHandle);
  await browser.waitUntil(async () => !(await browser.getWindowHandles()).includes(handle), {
    timeout: 10_000,
    interval: 100,
    timeoutMsg: 'Alt+F4 did not close the top-level native utility window',
  });
  await waitForFocus('.inspector-widget-menu-trigger', 'system close did not restore main-window focus');
}

async function rapidToggle(panelKey, collapsedSelector, collapseSelector) {
  const initial = (await readShellState())[panelKey].collapsed;
  let expected = initial;
  for (let round = 0; round < 10; round += 1) {
    await (await browser.$(expected ? collapsedSelector : collapseSelector)).click();
    expected = !expected;
    await waitForState(
      state => state[panelKey].collapsed === expected,
      `${panelKey} rapid toggle ${round + 1} was not applied`,
    );
  }
  await waitForState(state => state[panelKey].collapsed === initial, `${panelKey} rapid toggles lost final state`);
}

async function restoreWidgetPlacement(title, placement) {
  let current = await readWidgetPlacement(title);
  await closeWidgetMenu();
  if (current === placement) return;

  if (placement === 'native') {
    if (current === 'closed') {
      await clickWidgetMenuAction(title, `将${title}重新停靠`);
      await waitForWidgetPlacement(title, 'docked');
      current = 'docked';
    }
    if (current === 'floating') {
      const floating = await findFloatingWidget(title);
      await (await floating.$(`[aria-label="将${title}重新停靠"]`)).click();
      await waitForWidgetPlacement(title, 'docked');
      current = 'docked';
    }
    if (current === 'docked') {
      await clickWidgetMenuAction(title, `在 InkForge 内浮动${title}`);
      await waitForWidgetPlacement(title, 'floating');
      const floating = await findFloatingWidget(title);
      await (await floating.$(`[aria-label="将${title}摘到桌面"]`)).click();
      await waitForUtilityWindow(title);
      await browser.switchToWindow(mainHandle);
    }
    return;
  }

  if (placement === 'closed') {
    await clickWidgetMenuAction(title, `关闭${title}小组件`);
    await waitForWidgetPlacement(title, 'closed');
    return;
  }

  if (current === 'closed') {
    await clickWidgetMenuAction(title, `将${title}重新停靠`);
    await waitForWidgetPlacement(title, 'docked');
    current = 'docked';
  }

  if (current !== placement) {
    const action = placement === 'floating'
      ? `在 InkForge 内浮动${title}`
      : `将${title}重新停靠`;
    await clickWidgetMenuAction(title, action);
    await waitForWidgetPlacement(title, placement);
  }
}

async function deleteCreatedArticleThroughFileManager(articleId = createdArticleId) {
  if (!articleId) return;
  await returnToCreatedArticle(articleId);
  const state = await readShellState();
  if (state.manager?.collapsed) {
    await (await browser.$('.manager-collapsed-bar')).click();
    await waitForState(current => current.manager.collapsed === false, 'Manager did not reopen for visible cleanup');
  }
  const filesTab = await browser.$('[data-manager-tab="files"]');
  if ((await filesTab.getAttribute('aria-pressed')) !== 'true') await filesTab.click();
  await (await browser.$('.fm-root')).waitForDisplayed({ timeout: 10_000 });

  const rowSelector = `.fm-article-row[data-file-article-id="${articleId}"]`;
  const row = await browser.$(rowSelector);
  await row.waitForDisplayed({ timeout: 10_000 });
  await row.scrollIntoView({ block: 'center', inline: 'nearest' });
  const point = await browser.execute(selector => {
    const target = document.querySelector(selector);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const x = Math.round(rect.left + Math.min(12, rect.width / 2));
    const y = Math.round(rect.top + rect.height / 2);
    return document.elementFromPoint(x, y)?.closest(selector) === target ? { x, y } : null;
  }, rowSelector);
  expect(point, 'FileManager row exposes a real unobscured pointer target').to.not.equal(null);
  await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ duration: 0, x: point.x, y: point.y })
    .down({ button: 2 })
    .up({ button: 2 })
    .perform();
  await (await browser.$('[data-article-action="delete"]')).click();
  const confirmation = await browser.$('[data-category-delete-confirm]');
  await confirmation.waitForDisplayed({ timeout: 5_000 });
  await (await confirmation.$('[data-file-delete-submit]')).click();
  await row.waitForExist({
    reverse: true,
    timeout: 10_000,
    timeoutMsg: 'visible FileManager cleanup did not remove the created draft row',
  });
  const createdIndex = createdArticleIds.indexOf(articleId);
  if (createdIndex >= 0) createdArticleIds.splice(createdIndex, 1);
  createdArticleId = createdArticleIds.at(-1) ?? null;
}

describe('native shell lifecycle', () => {
  after(async () => {
    if (!mainHandle) return;
    try {
      await browser.switchToWindow(mainHandle);
      for (const articleId of [...createdArticleIds].reverse()) {
        await deleteCreatedArticleThroughFileManager(articleId);
      }
    } finally {
      mainHandle = null;
      createdArticleId = null;
      createdArticleIds.length = 0;
    }
  });

  it('accepts real shell collapse, widget window, focus, motion, and rapid-toggle lifecycle', async function () {
    this.timeout(240_000);
    await browser.switchToWindow(await browser.getWindowHandle());
    mainHandle = await browser.getWindowHandle();
    expect(await browser.getWindowHandles(), 'native acceptance starts with the main Tauri window')
      .to.deep.equal([mainHandle]);

    await createBlankDraft();
    const baseline = await readShellState();
    expect(baseline.hasWorkstation && baseline.hasEditor, 'real draft is mounted in Workstation').to.equal(true);
    const capabilityTable = await readRuntimeCapabilityTable();
    expect(capabilityTable.widgets, 'runtime capability table exposes every inspector widget').to.be.an('array')
      .and.to.have.length.greaterThan(0);
    const widgetTitles = capabilityTable.widgets.map(widget => widget.title);
    const widgetIds = capabilityTable.widgets.map(widget => widget.id);
    expect(new Set(widgetTitles).size, 'runtime capability table has unique inspector widgets')
      .to.equal(widgetTitles.length);
    expect(new Set(widgetIds).size, 'runtime capability table has unique inspector capability ids')
      .to.equal(widgetIds.length);
    const observedPanelActions = new Map(['manager', 'stage', 'inspector'].map(id => [id, new Set()]));
    const observedWidgetActions = new Map(capabilityTable.widgets.map(widget => [widget.id, new Set()]));
    const widgetLifecycleEvidence = new Map();
    let articleReuseEvidence = null;
    let systemCloseEvidence = null;
    const observeWidget = async (widget) => {
      const capability = await readWidgetCapability(widget.title);
      expect(capability.id, `${widget.title} capability id remains stable`).to.equal(widget.id);
      await closeWidgetMenu();
      return capability;
    };

    const panelEvidence = new Map();
    panelEvidence.set('manager', await collapseExpandPanel(
      '.panel-manager', '.manager-collapsed-bar', '.panel-manager .collapse-trigger',
      '.panel-manager [data-manager-tab][aria-pressed="true"]',
      'Enter',
    ));
    panelEvidence.set('stage', await collapseExpandPanel(
      '.panel-stage', '.stage-collapsed-bar', '.panel-stage .collapse-trigger',
      '.panel-stage .collapse-trigger',
      ' ',
    ));
    panelEvidence.set('inspector', await collapseExpandPanel(
      '.panel-inspector', '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger',
      '.panel-inspector .collapse-trigger',
    ));
    for (const [id, evidence] of panelEvidence) {
      for (const action of evidence.observedActions) observedPanelActions.get(id).add(action);
    }
    const managerShortcutEvidence = await assertManagerShortcutLifecycle();
    observedPanelActions.get('manager').add('shortcut-collapse');
    observedPanelActions.get('manager').add('shortcut-expand');
    baseline.inspectorPinned = (await readShellState()).inspectorPinned;

    const inspectorPin = await browser.$('.inspector-pin-btn');
    if ((await inspectorPin.getAttribute('aria-pressed')) === 'true') await inspectorPin.click();
    await waitForState(state => state.inspectorPinned === false, 'Inspector did not enter unpinned hover mode');
    await (await browser.$('.panel-inspector .collapse-trigger')).click();
    await waitForState(state => state.inspector.collapsed === true, 'Inspector did not collapse for hover acceptance');
    await waitForPanelTransitions('Inspector hover-collapse transition did not settle before baseline');
    const hoverBefore = await readShellState();
    await movePointerToInspectorEdge('right');
    await waitForState(state => state.inspector.collapsed === false, 'Inspector edge hover did not expand the panel');
    await waitForPanelTransitions('Inspector hover-reveal transition did not settle');
    const hoverReveal = await readShellState();
    expectGeometryClose(hoverReveal.editorGeometry, hoverBefore.editorGeometry, 'Inspector hover reveal editor geometry');
    await movePointerToInspectorEdge('left');
    await waitForState(state => state.inspector.collapsed === true, 'Inspector pointer exit did not collapse the panel');
    await browser.waitUntil(async () => (
      geometryWithin((await readShellState()).editorGeometry, hoverBefore.editorGeometry)
    ), {
      timeout: 10_000,
      interval: 50,
      timeoutMsg: 'Inspector hover reveal left editor geometry drift',
    });
    const hoverAfter = await readShellState();
    expectGeometryClose(hoverAfter.editorGeometry, hoverBefore.editorGeometry, 'Inspector hover reveal final editor geometry');
    await waitForPanelTransitions('Inspector hover-collapse transition did not settle before reopening');
    await clickUnobscured('.inspector-collapsed-bar', 'Inspector hover reopen control');
    await waitForState(state => state.inspector.collapsed === false, 'Inspector did not reopen after hover test');
    await (await browser.$('.inspector-pin-btn')).click();
    await waitForState(state => state.inspectorPinned === true, 'Inspector pin control did not pin the panel');

    for (const widget of capabilityTable.widgets) {
      const title = widget.title;
      const observedActions = observedWidgetActions.get(widget.id);
      const originalCapability = await observeWidget(widget);
      const originalPlacement = originalCapability.placement;
      expect(originalPlacement, `${title} placement is a real production state`)
        .to.be.oneOf(['docked', 'floating', 'native', 'closed']);

      if (originalPlacement === 'floating') {
        const floating = await findFloatingWidget(title);
        await (await floating.$(`[aria-label="将${title}重新停靠"]`)).click();
        await waitForWidgetPlacement(title, 'docked');
        await observeWidget(widget);
      } else if (originalPlacement === 'closed' || originalPlacement === 'native') {
        await clickWidgetMenuAction(title, `将${title}重新停靠`);
        await waitForWidgetPlacement(title, 'docked');
        await observeWidget(widget);
      }

      await clickWidgetMenuAction(title, `在 InkForge 内浮动${title}`);
      await waitForWidgetPlacement(title, 'floating');
      observedActions.add('float');
      const floating = await findFloatingWidget(title);
      await floating.waitForDisplayed({ timeout: 5_000 });
      const floatingKeyboard = await assertFloatingWidgetKeyboardMove(widget);
      await (await floating.$(`[aria-label="将${title}重新停靠"]`)).click();
      await waitForWidgetPlacement(title, 'docked');
      observedActions.add('dock');

      await clickWidgetMenuAction(title, `在 InkForge 内浮动${title}`);
      await waitForWidgetPlacement(title, 'floating');
      const floatingForNative = await findFloatingWidget(title);
      await (await floatingForNative.$(`[aria-label="将${title}摘到桌面"]`)).click();
      const firstNativeHandle = await waitForUtilityWindow(title);
      observedActions.add('native');
      if (!articleReuseEvidence) {
        const articleAId = createdArticleId;
        await browser.switchToWindow(mainHandle);
        await createBlankDraft();
        const articleBId = createdArticleId;
        expect(articleBId, 'article B uses a distinct real article id').to.not.equal(articleAId);

        const reusedNativeHandle = await waitForUtilityWindow(title);
        expect(reusedNativeHandle, 'article B reuses the existing native Inspector window')
          .to.equal(firstNativeHandle);
        const contextReadback = await waitForUtilityArticleContext(articleBId);
        articleReuseEvidence = {
          sameWindow: reusedNativeHandle === firstNativeHandle,
          initialRoutePreserved: contextReadback.routeArticleId === articleAId,
          liveReadbackMatchesArticleB: contextReadback.articleId === articleBId,
          contextSource: contextReadback.contextSource,
        };
        expect(articleReuseEvidence.initialRoutePreserved, 'same-window reuse keeps the original utility route')
          .to.equal(true);
        expect(articleReuseEvidence.liveReadbackMatchesArticleB, 'utility live payload reads back article B')
          .to.equal(true);
      }
      const firstUtilityKeyboard = await assertUtilityKeyboardLifecycle();
      const usedSystemClose = systemCloseEvidence === null;
      if (usedSystemClose) await closeNativeUtilityWithSystemCommand(firstNativeHandle, title);
      else await closeNativeUtilityWithEscape(firstNativeHandle);
      const closedPlacement = await waitForWidgetPlacement(title, 'closed');
      observedActions.add('close');
      const closeReadback = await readShellState();
      if (usedSystemClose) {
        systemCloseEvidence = {
          status: closedPlacement === 'closed'
            && closeReadback.activeSelector === '.inspector-widget-menu-trigger'
            ? 'local'
            : 'blocked',
          widgetId: widget.id,
          finalPlacement: closedPlacement,
          restoredFocus: closeReadback.activeSelector,
        };
      }
      await observeWidget(widget);

      await clickWidgetMenuAction(title, `在 InkForge 内浮动${title}`);
      await waitForWidgetPlacement(title, 'floating');
      observedActions.add('reopen');
      const floatingAgain = await findFloatingWidget(title);
      await (await floatingAgain.$(`[aria-label="将${title}摘到桌面"]`)).click();
      const secondNativeHandle = await waitForUtilityWindow(title);
      const secondUtilityKeyboard = await assertUtilityKeyboardLifecycle();
      await (await browser.$('.utility-widget__controls button:first-child')).click();
      await browser.switchToWindow(mainHandle);
      await browser.waitUntil(async () => !(await browser.getWindowHandles()).includes(secondNativeHandle), {
        timeout: 10_000,
        interval: 100,
        timeoutMsg: `${title} native redock control did not close the utility window`,
      });
      await waitForFocus('.inspector-widget-menu-trigger', `${title} native redock did not restore main-window focus`);
      await waitForWidgetPlacement(title, 'docked');
      observedActions.add('redock');
      const redockReadback = await readShellState();
      await observeWidget(widget);

      await clickWidgetMenuAction(title, `关闭${title}小组件`);
      await waitForFocus('.inspector-widget-menu-trigger', `${title} close did not restore source focus`);
      await waitForWidgetPlacement(title, 'closed');
      observedActions.add('close');
      await observeWidget(widget);
      await restoreWidgetPlacement(title, originalPlacement);
      await observeWidget(widget);
      widgetLifecycleEvidence.set(widget.id, {
        floatingKeyboard,
        firstUtilityKeyboard,
        secondUtilityKeyboard,
        closeFocus: closeReadback.activeSelector,
        redockFocus: redockReadback.activeSelector,
      });
    }

    const motionState = await readShellState();
    if (motionState.osReducedMotion) {
      console.log('[covered] OS reduced motion is active; default-motion behavior is verified by the separate default-OS run.');
    } else {
      const originalProductMotion = await setReducedMotion(false);
      await returnToCreatedArticle();
      await waitForState(state => state.effectiveReducedMotion === false, 'product reduced-motion off did not reach the shell');
      expect((await readShellState()).reducedMotionTransitionMs.some(value => value > 0), 'default motion keeps a real transition').to.equal(true);
      await setReducedMotion(true);
      await returnToCreatedArticle();
      await waitForState(state => state.effectiveReducedMotion === true, 'product reduced-motion on did not reach the shell');
      expect((await readShellState()).reducedMotionTransitionMs.every(value => value <= 0.1), 'reduced motion collapses transitions').to.equal(true);
      await setReducedMotion(originalProductMotion);
      await returnToCreatedArticle();
    }

    await setPanelCollapsed('manager', baseline.manager.collapsed, '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await setPanelCollapsed('stage', baseline.stage.collapsed, '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await setPanelCollapsed('inspector', baseline.inspector.collapsed, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');

    await setPanelCollapsed('manager', false, '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await setPanelCollapsed('stage', false, '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await setPanelCollapsed('inspector', false, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    const rapidPin = await browser.$('.inspector-pin-btn');
    if (await rapidPin.getAttribute('aria-pressed') !== 'true') {
      await rapidPin.click();
    }
    await waitForState(state => state.inspectorPinned === true, 'Inspector pin was not enabled for rapid toggles');
    await waitForPanelTransitions('Inspector pin transition did not settle before rapid-toggle baseline');
    const rapidToggleGeometry = await readShellState();
    await rapidToggle('manager', '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await rapidToggle('stage', '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await rapidToggle('inspector', '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    await waitForGeometry(
      rapidToggleGeometry.editorGeometry,
      rapidToggleGeometry.stageGeometry,
      '10-round shell toggles left editor/stage geometry drift',
    );
    await openWidgetMenu();
    const final = await readShellState();
    expectGeometryClose(final.editorGeometry, rapidToggleGeometry.editorGeometry, '10-round shell toggle editor geometry');
    expectGeometryClose(final.stageGeometry, rapidToggleGeometry.stageGeometry, '10-round shell toggle stage geometry');
    expect(final.floatingWidgetIds, 'rapid shell switching preserves the runtime floating-widget count')
      .to.have.length(capabilityTable.widgets.filter(widget => widget.placement === 'floating').length);
    for (const widget of capabilityTable.widgets) {
      const current = final.widgetPlacements.find(item => item.id === widget.id);
      expect(current, `${widget.title} remains a singular runtime capability row`).to.not.equal(undefined);
      expect(current.placement, `${widget.title} preserves its initial placement after rapid toggles`)
        .to.equal(widget.placement);
    }
    await closeWidgetMenu();
    await waitForState(state => state.widgetMenuOpen === false, 'widget menu did not close after singular-state readback');
    for (const widget of capabilityTable.widgets) {
      await restoreWidgetPlacement(widget.title, widget.placement);
    }
    const restoredPin = await browser.$('.inspector-pin-btn');
    if ((await restoredPin.getAttribute('aria-pressed') === 'true') !== baseline.inspectorPinned) {
      await restoredPin.click();
      await waitForState(state => state.inspectorPinned === baseline.inspectorPinned, 'Inspector pin did not restore its original state');
    }
    await openWidgetMenu();
    const restoredWidgetState = await readShellState();
    await closeWidgetMenu();
    await waitForState(state => state.widgetMenuOpen === false, 'widget menu did not close after restored-state readback');
    await setPanelCollapsed('manager', baseline.manager.collapsed, '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await setPanelCollapsed('stage', baseline.stage.collapsed, '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await setPanelCollapsed('inspector', baseline.inspector.collapsed, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    const restoredPanelState = await readShellState();

    const shellRows = [
      ...capabilityTable.panels.map(panel => ({
        kind: 'panel',
        id: panel.id,
        initialState: panel.initialState,
        lifecycle: panelEvidence.get(panel.id),
        shortcut: panel.id === 'manager' ? managerShortcutEvidence : null,
        observedActions: [...observedPanelActions.get(panel.id)],
        status: ['collapse', 'expand'].every(action => observedPanelActions.get(panel.id).has(action))
          ? 'local'
          : 'blocked',
      })),
      ...capabilityTable.widgets.map(widget => {
        const restoredWidget = restoredWidgetState.widgetPlacements.find(item => item.id === widget.id);
        const observedActions = observedWidgetActions.get(widget.id);
        const lifecycle = widgetLifecycleEvidence.get(widget.id);
        const actionsAccepted = REQUIRED_WIDGET_ACTIONS.every(action => observedActions.has(action));
        const keyboardAccepted = geometryWithin(
          lifecycle?.floatingKeyboard?.restored,
          lifecycle?.floatingKeyboard?.before,
        )
          && lifecycle?.firstUtilityKeyboard?.restoredControl === lifecycle?.firstUtilityKeyboard?.firstControl
          && lifecycle?.secondUtilityKeyboard?.restoredControl === lifecycle?.secondUtilityKeyboard?.firstControl
          && lifecycle?.closeFocus === '.inspector-widget-menu-trigger'
          && lifecycle?.redockFocus === '.inspector-widget-menu-trigger';
        return {
          kind: 'inspector-widget',
          id: widget.id,
          title: widget.title,
          initialPlacement: widget.placement,
          capabilityActions: widget.actions,
          requiredActions: REQUIRED_WIDGET_ACTIONS,
          observedActions: [...observedActions],
          lifecycle,
          finalPlacement: restoredWidget?.placement ?? null,
          status: restoredWidget?.placement === widget.placement
            && actionsAccepted
            && keyboardAccepted
            ? 'local'
            : 'blocked',
        };
      }),
    ];

    await setPanelCollapsed('inspector', false, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    const nativeRestartWidget = capabilityTable.widgets.find(widget => widget.placement !== 'native')
      ?? capabilityTable.widgets[0];
    const restartWidgetTargets = new Map(capabilityTable.widgets.map(widget => [
      widget.title,
      widget.title === nativeRestartWidget.title
        ? 'native'
        : widget.placement === 'closed' ? 'floating' : 'closed',
    ]));
    for (const widget of capabilityTable.widgets) {
      await restoreWidgetPlacement(widget.title, restartWidgetTargets.get(widget.title));
    }

    const restartInspectorPinned = !baseline.inspectorPinned;
    const restartPin = await browser.$('.inspector-pin-btn');
    if (((await restartPin.getAttribute('aria-pressed')) === 'true') !== restartInspectorPinned) {
      await restartPin.click();
      await waitForState(
        state => state.inspectorPinned === restartInspectorPinned,
        'Inspector pin did not reach the deliberate restart state',
      );
    }
    if (!restartInspectorPinned) await movePointerToInspectorEdge('left');
    const restartPanelTargets = {
      manager: !restoredPanelState.manager.collapsed,
      stage: !restoredPanelState.stage.collapsed,
      inspector: restartInspectorPinned ? !restoredPanelState.inspector.collapsed : false,
    };
    await setPanelCollapsed('manager', restartPanelTargets.manager, '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await setPanelCollapsed('stage', restartPanelTargets.stage, '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await setPanelCollapsed('inspector', restartPanelTargets.inspector, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    await browser.pause(750);

    const reloadReleaseSession = global.__INKFORGE_E2E_RELOAD_RELEASE_SESSION__;
    expect(reloadReleaseSession, 'release harness exposes a verified native process restart').to.be.a('function');
    const restartedProcess = await reloadReleaseSession();
    expect(restartedProcess.currentProcessId, 'restart launches a different InkForge process')
      .to.not.equal(restartedProcess.previousProcessId);
    mainHandle = await browser.getWindowHandle();
    await returnToCreatedArticle();
    await waitForState(state => (
      state.manager?.collapsed === restartPanelTargets.manager
      && state.stage?.collapsed === restartPanelTargets.stage
      && state.inspector?.collapsed === restartPanelTargets.inspector
      && state.inspectorPinned === restartInspectorPinned
    ), 'release restart did not restore deliberate panel and pin state');
    const restartedPanelState = await readShellState();

    if (restartedPanelState.inspector.collapsed) {
      await setPanelCollapsed('inspector', false, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');
    }
    await openWidgetMenu();
    await browser.waitUntil(async () => {
      const state = await readShellState();
      return capabilityTable.widgets.every(widget => (
        state.widgetPlacements.find(item => item.id === widget.id)?.placement
          === restartWidgetTargets.get(widget.title)
      ));
    }, {
      timeout: 15_000,
      interval: 100,
      timeoutMsg: 'release restart did not restore every inspector widget placement',
    });
    const restartedWidgetState = await readShellState();
    await closeWidgetMenu();
    const restartedNativeHandle = await waitForUtilityWindow(nativeRestartWidget.title);
    await browser.switchToWindow(mainHandle);

    const restartRows = [
      ...Object.entries(restartPanelTargets).map(([id, expectedCollapsed]) => ({
        kind: 'panel',
        id,
        expectedCollapsed,
        actualCollapsed: restartedPanelState[id]?.collapsed ?? null,
        status: restartedPanelState[id]?.collapsed === expectedCollapsed ? 'local' : 'blocked',
      })),
      {
        kind: 'inspector-pin',
        id: 'inspector-pin',
        expectedPinned: restartInspectorPinned,
        actualPinned: restartedPanelState.inspectorPinned,
        status: restartedPanelState.inspectorPinned === restartInspectorPinned ? 'local' : 'blocked',
      },
      ...capabilityTable.widgets.map(widget => {
        const expectedPlacement = restartWidgetTargets.get(widget.title);
        const actualPlacement = restartedWidgetState.widgetPlacements
          .find(item => item.id === widget.id)?.placement ?? null;
        return {
          kind: 'inspector-widget',
          id: widget.id,
          title: widget.title,
          expectedPlacement,
          actualPlacement,
          nativeWindowRestored: expectedPlacement === 'native' ? Boolean(restartedNativeHandle) : null,
          status: actualPlacement === expectedPlacement
            && (expectedPlacement !== 'native' || Boolean(restartedNativeHandle))
            ? 'local'
            : 'blocked',
        };
      }),
    ];

    for (const widget of capabilityTable.widgets) {
      await restoreWidgetPlacement(widget.title, widget.placement);
    }
    const restoredRestartPin = await browser.$('.inspector-pin-btn');
    if (((await restoredRestartPin.getAttribute('aria-pressed')) === 'true') !== baseline.inspectorPinned) {
      await restoredRestartPin.click();
      await waitForState(
        state => state.inspectorPinned === baseline.inspectorPinned,
        'Inspector pin did not restore after restart acceptance',
      );
    }
    await setPanelCollapsed('manager', baseline.manager.collapsed, '.manager-collapsed-bar', '.panel-manager .collapse-trigger');
    await setPanelCollapsed('stage', baseline.stage.collapsed, '.stage-collapsed-bar', '.panel-stage .collapse-trigger');
    await setPanelCollapsed('inspector', baseline.inspector.collapsed, '.inspector-collapsed-bar', '.panel-inspector .collapse-trigger');

    const releaseIdentity = global.__INKFORGE_E2E_RELEASE_IDENTITY__;
    expect(releaseIdentity, 'native shell receipt is bound to the verified release identity').to.be.an('object');
    const articleReuseAccepted = articleReuseEvidence?.sameWindow
      && articleReuseEvidence.initialRoutePreserved
      && articleReuseEvidence.liveReadbackMatchesArticleB
      && articleReuseEvidence.contextSource === 'live';
    const fullAcceptance = shellRows.every(row => row.status === 'local')
      && restartRows.every(row => row.status === 'local')
      && articleReuseAccepted
      && systemCloseEvidence?.status === 'local';
    const receipt = {
      published: false,
      releaseArtifactReceipt: {
        status: 'local',
        executableBytes: releaseIdentity.executableBytes,
        executableSha256: releaseIdentity.executableSha256,
        producer: releaseIdentity.producerLabel,
        producerSha256: releaseIdentity.producerSha256,
      },
      capabilityTable,
      articleContextReuse: {
        status: articleReuseAccepted ? 'local' : 'blocked',
        ...articleReuseEvidence,
      },
      systemClose: systemCloseEvidence,
      rows: shellRows,
      restart: {
        status: fullAcceptance ? 'local' : 'blocked',
        processChanged: restartedProcess.currentProcessId !== restartedProcess.previousProcessId,
        rows: restartRows,
      },
      fullAcceptance,
    };
    console.log('[native-shell-receipt]', JSON.stringify(receipt));
    expect(fullAcceptance, 'native shell lifecycle and restart persistence are fully accepted').to.equal(true);
  });

  it('accepts OS-only prefers-reduced-motion without enabling the product setting', async function () {
    this.timeout(60_000);
    const state = await readShellState();
    if (!state.osReducedMotion) this.skip();

    const originalProductMotion = await setReducedMotion(false);
    try {
      await returnToCreatedArticle();
      await waitForState(
        current => current.osReducedMotion
          && current.effectiveReducedMotion
          && current.reducedMotionTransitionMs.every(value => value <= 0.1),
        'OS-only reduced motion did not reach the release shell',
      );
    } finally {
      await setReducedMotion(originalProductMotion);
      await returnToCreatedArticle();
    }
  });
});
