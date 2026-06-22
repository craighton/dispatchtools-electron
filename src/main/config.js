'use strict';

// Central configuration for the desktop shell. Override at runtime with env vars
// (e.g. DISPATCHTOOLS_URL=http://localhost:8080 npm start) for local development.
module.exports = {
  // The live site the shell wraps.
  APP_URL: process.env.DISPATCHTOOLS_URL || 'https://dispatchtools.com',

  // Hosts that are allowed to load *inside* the main app window (the primary
  // site). Navigation to anything not covered here or by IN_APP_DOMAINS is
  // opened in the user's default browser instead.
  ALLOWED_HOSTS: ['dispatchtools.com', 'www.dispatchtools.com'],

  // Additional domains that should open INSIDE the app — in a secondary window —
  // rather than the system browser. Matched by domain suffix, so every subdomain
  // is covered (e.g. notams.aim.faa.gov, tfr.faa.gov, www.faa.gov all match
  // 'faa.gov'). Add more linked resources here as needed.
  IN_APP_DOMAINS: ['faa.gov'],

  // Primary-site path segments that designate a "compact view" — a pop-out panel
  // a dispatcher can move to its own monitor. Any dispatchtools.com URL whose
  // path contains one of these as a segment (e.g. /nas/compact/, /advzy/compact/,
  // /atis/compact/, /wx/compact/) opens in its OWN window instead of replacing
  // the current one. Segment match, so new compact sections are covered without
  // a code change.
  COMPACT_VIEW_SEGMENTS: ['compact'],

  // Compact tools surfaced as toolbar buttons. Each opens its compact pop-out in
  // its own window (via the same path that COMPACT_VIEW_SEGMENTS recognizes), so
  // a dispatcher can move it to another monitor. `label` is the button text,
  // `title` the hover tooltip, `path` the site path (resolved against APP_URL).
  COMPACT_TOOLS: [
    { id: 'nas', label: 'NAS Status', title: 'NAS Status', path: '/nas/compact/' },
    { id: 'wx', label: 'Weather', title: 'Weather Monitor', path: '/wx/compact/' },
    { id: 'atis', label: 'D-ATIS', title: 'D-ATIS Monitor', path: '/atis/compact/' },
    { id: 'advzy', label: 'Advisories', title: 'Advisories', path: '/advzy/compact/' },
  ],

  // Custom protocol used for deep links: dispatchtools://flights/123 -> /flights/123
  PROTOCOL: 'dispatchtools',

  // GitHub "owner/repo" that publishes releases. When set (here or via
  // DISPATCHTOOLS_UPDATE_REPO), packaged builds auto-update via update.electronjs.org.
  // Leave empty to disable auto-update.
  UPDATE_REPO: process.env.DISPATCHTOOLS_UPDATE_REPO || 'craighton/dispatchtools-electron',
};
