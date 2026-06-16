'use strict';

const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

// Tiny window-bounds persister: remembers size/position across launches and
// clamps the restored window to a currently-visible display.
const FILE = path.join(app.getPath('userData'), 'window-state.json');

const DEFAULTS = { width: 1280, height: 860, x: undefined, y: undefined };

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function isVisibleOnSomeDisplay(bounds) {
  if (bounds.x === undefined || bounds.y === undefined) return true;
  return screen.getAllDisplays().some(({ workArea }) => {
    return (
      bounds.x >= workArea.x &&
      bounds.y >= workArea.y &&
      bounds.x + bounds.width <= workArea.x + workArea.width &&
      bounds.y + bounds.height <= workArea.y + workArea.height
    );
  });
}

// Returns saved bounds (or sane defaults) plus a `track(window)` helper that
// wires up listeners to persist future moves/resizes.
function createWindowState() {
  let state = read();
  if (!isVisibleOnSomeDisplay(state)) {
    state = { ...DEFAULTS };
  }

  function save(window) {
    if (!window || window.isDestroyed() || window.isMinimized()) return;
    const bounds = window.getBounds();
    try {
      fs.writeFileSync(FILE, JSON.stringify({ ...bounds, maximized: window.isMaximized() }));
    } catch {
      /* best-effort persistence */
    }
  }

  function track(window) {
    let timer;
    const debouncedSave = () => {
      clearTimeout(timer);
      timer = setTimeout(() => save(window), 300);
    };
    window.on('resize', debouncedSave);
    window.on('move', debouncedSave);
    window.on('close', () => save(window));
  }

  return { bounds: state, maximized: Boolean(state.maximized), track };
}

module.exports = { createWindowState };
