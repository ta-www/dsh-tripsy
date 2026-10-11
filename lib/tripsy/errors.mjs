// Error classification shared by the CLI, the MCP client and the stdio proxy.
//
// The distinction that matters operationally:
//   - notLoggedIn / authFailed  -> nothing to do but wait for a new login.
//     The bridge must idle quietly; if it answers `tools/list` with an error,
//     the host treats the server as broken and respawns it every few seconds.
//   - anything else             -> a real fault worth surfacing as an error.

/** The user has not completed the browser login yet. */
export function notLoggedInError(
  message = 'Tripsy 尚未登录。运行 `node src/cli.mjs login` 完成一次浏览器授权。',
) {
  const e = new Error(message);
  e.notLoggedIn = true;
  return e;
}

/** The credential exists but the server rejected it; a fresh login is needed. */
export function authFailedError(message) {
  const e = new Error(message || '通往 Tripsy 的授权已失效，需要重新登录。');
  e.authFailed = true;
  return e;
}

/**
 * True when the only useful next step is a new login. Marked by `notLoggedIn`
 * or by `authFailed` (set on 4xx responses from the token endpoint, never on
 * network or 5xx failures, which are transient and should still be reported).
 */
export function isAuthError(err) {
  return Boolean(err && (err.notLoggedIn || err.authFailed));
}
