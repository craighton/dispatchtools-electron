'use strict';

const { APP_URL, PROTOCOL } = require('./config');

// Turns a dispatchtools://<path> URL into an absolute app URL.
// e.g. dispatchtools://flights/123?x=1 -> https://dispatchtools.com/flights/123?x=1
function deepLinkToAppUrl(deepLink) {
  if (!deepLink || !deepLink.startsWith(`${PROTOCOL}://`)) return null;
  try {
    const parsed = new URL(deepLink);
    const base = new URL(APP_URL);
    // host + pathname together form the path segment after the scheme.
    const pathPart = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+/, '');
    base.pathname = `/${pathPart}`;
    base.search = parsed.search;
    base.hash = parsed.hash;
    return base.toString();
  } catch {
    return null;
  }
}

// Finds the first dispatchtools:// argument in a process argv array (Windows/Linux
// deliver deep links this way; macOS uses the 'open-url' event instead).
function findDeepLink(argv) {
  return (argv || []).find((arg) => arg.startsWith(`${PROTOCOL}://`)) || null;
}

module.exports = { deepLinkToAppUrl, findDeepLink };
