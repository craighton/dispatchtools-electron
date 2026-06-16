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

  // Custom protocol used for deep links: dispatchtools://flights/123 -> /flights/123
  PROTOCOL: 'dispatchtools',

  // GitHub "owner/repo" that publishes releases. When set (here or via
  // DISPATCHTOOLS_UPDATE_REPO), packaged builds auto-update via update.electronjs.org.
  // Leave empty to disable auto-update.
  UPDATE_REPO: process.env.DISPATCHTOOLS_UPDATE_REPO || '',
};
