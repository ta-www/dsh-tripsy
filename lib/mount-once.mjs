/**
 * Host single-instance guard.
 *
 * The same package can be present through two install sources at once — for
 * example a manually inserted profile-patch row alongside a marketplace install
 * that also added it to `dsh.profile.bundles`. Without this guard the second
 * instance re-registers the same webserver routes and fails the boot.
 *
 * A plain "already mounted, skip" is not enough. The host reloads a profile by
 * creating the new loader entries BEFORE tearing the old ones down (a
 * plugin-manager install/enable/disable write, a settings-driven row reload,
 * HMR), so a new entry can mount while the previous one still owns the name.
 * Dropping that refused mount loses the plugin for good: the previous entry then
 * disposes its own mount, releasing the name with nobody left to take it, and
 * the plugin stays listed while its routes 404. So a refused mount is QUEUED and
 * replayed the moment the holder releases the name, provided its own fiber is
 * still alive.
 *
 * The registry lives on a global symbol so two module instances of the same
 * package (an npm copy and a repository link) still share one verdict.
 *
 * cordis `ctx.effect` runs its callback immediately and treats the returned
 * value as the fiber disposer, so the unmarker is returned, not called.
 */

/** Package names currently mounted, process-wide. */
const MOUNTED = Symbol.for('dsh-tripsy.mounted');
/** Per-package queues of mounts refused while a holder was alive. */
const WAITERS = Symbol.for('dsh-tripsy.mounted.waiters');

/** Always a Set, whatever another build may have stored under the symbol. */
function mountedSet() {
  const registry = globalThis;
  const existing = registry[MOUNTED];
  if (existing instanceof Set) return existing;
  const created = new Set();
  registry[MOUNTED] = created;
  return created;
}

function mountWaiters() {
  const registry = globalThis;
  return (registry[WAITERS] ??= new Map());
}

/**
 * Wrap a cordis plugin apply so the package runs at most once per process.
 * @param {string} packageName - npm package identity shared by every install source.
 * @param {Function} fn - the original plugin apply.
 * @returns {Function} an apply of the same shape.
 */
export function mountOnce(packageName, fn) {
  const mount = (...args) => {
    const mounted = mountedSet();
    const ctx = args[0];

    if (mounted.has(packageName)) {
      const waiters = mountWaiters();
      const queue = waiters.get(packageName) ?? [];
      let alive = true;
      const pending = {
        run: () => {
          if (alive) mount(...args);
        },
      };
      ctx?.effect?.(() => () => {
        alive = false;
        const index = queue.indexOf(pending);
        if (index >= 0) queue.splice(index, 1);
      });
      queue.push(pending);
      waiters.set(packageName, queue);
      return;
    }

    mounted.add(packageName);
    ctx?.effect?.(() => () => {
      mounted.delete(packageName);
      const waiters = mountWaiters();
      const queue = waiters.get(packageName);
      if (queue === undefined) return;
      waiters.delete(packageName);
      for (const waiter of queue.splice(0)) {
        queueMicrotask(() => {
          waiter.run();
        });
      }
    });
    return fn(...args);
  };
  return mount;
}
