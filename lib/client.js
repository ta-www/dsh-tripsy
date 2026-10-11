window.__ModuleLoader__.load({
	id: "dsh-tripsy",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const h = react.createElement;
		const API = "/api/dsh-tripsy";
		const PANEL_ID = "tripsy";
		const PANEL_ORDER = 60;

		// #region styles
		const STYLE_ID = "dsh-tripsy-styles";
		const CSS = `
.dsh-tripsy-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsh-text,#e6e6e6);font-size:13px}
.dsh-tripsy-head{display:flex;align-items:baseline;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--dsh-border,rgba(255,255,255,.08));flex:0 0 auto}
.dsh-tripsy-title{font-size:15px;font-weight:600;margin:0}
.dsh-tripsy-sub{opacity:.6;font-size:12px}
.dsh-tripsy-spacer{flex:1}
.dsh-tripsy-btn{background:transparent;border:1px solid var(--dsh-border,rgba(255,255,255,.16));color:inherit;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer}
.dsh-tripsy-btn:hover{border-color:#f97316;color:#f97316}
.dsh-tripsy-btn[disabled]{opacity:.45;cursor:default}
.dsh-tripsy-main{display:flex;flex:1 1 auto;min-height:0}
.dsh-tripsy-list{width:250px;flex:0 0 auto;overflow:auto;border-right:1px solid var(--dsh-border,rgba(255,255,255,.08));padding:8px}
.dsh-tripsy-item{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:9px 10px;cursor:pointer;color:inherit}
.dsh-tripsy-item:hover{background:rgba(249,115,22,.10)}
.dsh-tripsy-item.on{background:rgba(249,115,22,.18)}
.dsh-tripsy-item-name{font-weight:600;font-size:13px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-tripsy-item-dates{opacity:.62;font-size:11px;margin-top:2px;display:block}
.dsh-tripsy-detail{flex:1 1 auto;min-width:0;overflow:auto;padding:16px 20px 32px}
.dsh-tripsy-sec{margin-bottom:20px}
.dsh-tripsy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;opacity:.55;margin:0 0 8px}
.dsh-tripsy-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dsh-border,rgba(255,255,255,.06))}
.dsh-tripsy-row:last-child{border-bottom:0}
.dsh-tripsy-when{flex:0 0 132px;font-variant-numeric:tabular-nums;opacity:.78;font-size:12px}
.dsh-tripsy-body{flex:1 1 auto;min-width:0}
.dsh-tripsy-name{font-weight:600}
.dsh-tripsy-meta{opacity:.6;font-size:12px;margin-top:2px;word-break:break-word}
.dsh-tripsy-badge{display:inline-block;border:1px solid var(--dsh-border,rgba(255,255,255,.18));border-radius:999px;padding:0 7px;font-size:11px;opacity:.8;margin-left:6px}
.dsh-tripsy-empty{opacity:.55;padding:28px 4px}
.dsh-tripsy-err{color:#f87171;white-space:pre-wrap}
.dsh-tripsy-card{border:1px solid var(--dsh-border,rgba(255,255,255,.10));border-radius:10px;padding:14px 16px;max-width:640px}
.dsh-tripsy-cover{width:100%;max-width:640px;border-radius:10px;margin-bottom:14px;display:block}
.dsh-tripsy-link{color:#f97316;word-break:break-all}
.dsh-tripsy-row-actions{display:flex;gap:8px;margin-top:12px}
`;
		function ensureStyles() {
			try {
				if (document.getElementById(STYLE_ID)) return;
				const el = document.createElement("style");
				el.id = STYLE_ID;
				el.textContent = CSS;
				document.head.appendChild(el);
			} catch {}
		}
		// #endregion

		// #region formatting
		/** Trip timestamps are UTC; render them in the item's own timezone. */
		function fmtDateTime(iso, tz) {
			if (!iso) return "";
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return String(iso);
			try {
				return new Intl.DateTimeFormat(undefined, {
					timeZone: tz || undefined,
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				}).format(d);
			} catch {
				return d.toISOString().slice(0, 16).replace("T", " ");
			}
		}
		function fmtDate(value) {
			if (!value) return "";
			return String(value).slice(0, 10);
		}
		/** has_dates is authoritative: undated trips carry meaningless dates. */
		function tripDates(trip) {
			if (trip?.has_dates === false) return "无日期";
			const a = fmtDate(trip?.starts_at);
			const b = fmtDate(trip?.ends_at);
			if (!a && !b) return "无日期";
			return a === b || !b ? a : a + " → " + b;
		}
		function money(price, currency) {
			if (price === null || price === undefined || price === "") return "";
			return currency ? price + " " + currency : String(price);
		}
		// #endregion

		// #region data access
		async function getJson(path) {
			const res = await fetch(path, { headers: { Accept: "application/json" } });
			let body = null;
			try {
				body = await res.json();
			} catch {}
			if (!res.ok) {
				const err = new Error((body && body.error) || "HTTP " + res.status);
				err.notLoggedIn = Boolean(body && body.notLoggedIn);
				throw err;
			}
			return body;
		}
		async function postJson(path) {
			const res = await fetch(path, { method: "POST", headers: { Accept: "application/json" } });
			let body = null;
			try {
				body = await res.json();
			} catch {}
			if (!res.ok) throw new Error((body && body.error) || "HTTP " + res.status);
			return body;
		}
		// #endregion

		// #region components
		function TripsyPanelIcon({ size }) {
			const s = typeof size === "number" ? size : 16;
			return h(
				"svg",
				{
					width: s,
					height: s,
					viewBox: "0 0 24 24",
					fill: "none",
					"data-dsh-panel-entry": "tripsy",
					"aria-hidden": "true",
				},
				h("path", {
					d: "M12 2.6c-2.6 0-4.7 2.1-4.7 4.7 0 3.4 4.7 7.4 4.7 7.4s4.7-4 4.7-7.4c0-2.6-2.1-4.7-4.7-4.7z",
					stroke: "currentColor",
					strokeWidth: 1.8,
					strokeLinejoin: "round",
				}),
				h("circle", { cx: 12, cy: 7.3, r: 1.6, fill: "currentColor" }),
				h("path", {
					d: "M5 20.2c2-3.6 4-5.4 6-5.4 2 0 3 1.8 5 1.8",
					stroke: "currentColor",
					strokeWidth: 1.6,
					strokeLinecap: "round",
					strokeDasharray: "2.2 2.4",
				})
			);
		}

		function Row({ when, children }) {
			return h(
				"div",
				{ className: "dsh-tripsy-row" },
				when ? h("div", { className: "dsh-tripsy-when" }, when) : null,
				h("div", { className: "dsh-tripsy-body" }, children)
			);
		}

		function Section({ title, empty, children }) {
			return h(
				"div",
				{ className: "dsh-tripsy-sec" },
				h("h3", null, title),
				children && children.length ? children : h("div", { className: "dsh-tripsy-empty" }, empty)
			);
		}

		function TripDetail({ detail }) {
			if (!detail) return h("div", { className: "dsh-tripsy-empty" }, "从左边选一个行程");
			const trip = detail.trip || {};
			const tz = trip.timezone;

			const activities = (detail.activities || []).map((a) =>
				h(
					Row,
					{ key: "a" + a.id, when: fmtDateTime(a.starts_at, a.timezone || tz) },
					h(
						"div",
						{ className: "dsh-tripsy-name" },
						a.name || "(未命名活动)",
						a.activity_type ? h("span", { className: "dsh-tripsy-badge" }, a.activity_type) : null
					),
					a.address ? h("div", { className: "dsh-tripsy-meta" }, a.address) : null,
					a.provider_reservation_code
						? h("div", { className: "dsh-tripsy-meta" }, "确认号 " + a.provider_reservation_code)
						: null,
					a.price ? h("div", { className: "dsh-tripsy-meta" }, money(a.price, a.currency)) : null
				)
			);

			const hostings = (detail.hostings || []).map((x) =>
				h(
					Row,
					{ key: "h" + x.id, when: fmtDateTime(x.starts_at, x.timezone || tz) },
					h("div", { className: "dsh-tripsy-name" }, x.name || "(未命名住宿)"),
					x.address ? h("div", { className: "dsh-tripsy-meta" }, x.address) : null,
					x.provider_reservation_code
						? h("div", { className: "dsh-tripsy-meta" }, "确认号 " + x.provider_reservation_code)
						: null,
					x.room_number ? h("div", { className: "dsh-tripsy-meta" }, "房间 " + x.room_number) : null
				)
			);

			const transportations = (detail.transportations || []).map((x) =>
				h(
					Row,
					{ key: "t" + x.id, when: fmtDateTime(x.departure_at, x.departure_timezone || tz) },
					h(
						"div",
						{ className: "dsh-tripsy-name" },
						(x.departure_description || x.name || "?") + " → " + (x.arrival_description || "?"),
						x.transportation_type
							? h("span", { className: "dsh-tripsy-badge" }, x.transportation_type)
							: null
					),
					x.transport_number ? h("div", { className: "dsh-tripsy-meta" }, "班次 " + x.transport_number) : null,
					x.company ? h("div", { className: "dsh-tripsy-meta" }, x.company) : null,
					x.provider_reservation_code
						? h("div", { className: "dsh-tripsy-meta" }, "确认号 " + x.provider_reservation_code)
						: null
				)
			);

			const expenses = (detail.expenses || []).map((x) =>
				h(
					Row,
					{ key: "e" + x.id, when: fmtDate(x.date) },
					h("div", { className: "dsh-tripsy-name" }, x.title || x.name || "(未命名费用)"),
					h("div", { className: "dsh-tripsy-meta" }, money(x.price, x.currency) || "")
				)
			);

			return h(
				"div",
				null,
				trip.cover_image_url
					? h("img", { className: "dsh-tripsy-cover", src: trip.cover_image_url, alt: "", loading: "lazy" })
					: null,
				h("h2", { className: "dsh-tripsy-title" }, trip.name || "(未命名行程)"),
				h(
					"div",
					{ className: "dsh-tripsy-sub", style: { margin: "6px 0 18px" } },
					tripDates(trip),
					tz ? " · " + tz : ""
				),
				trip.description ? h("div", { className: "dsh-tripsy-sec" }, trip.description) : null,
				h(
					Section,
					{ title: "活动 " + (detail.activities || []).length, empty: "还没有活动" },
					activities
				),
				h(Section, { title: "住宿 " + (detail.hostings || []).length, empty: "还没有住宿" }, hostings),
				h(
					Section,
					{ title: "交通 " + (detail.transportations || []).length, empty: "还没有交通" },
					transportations
				),
				h(Section, { title: "费用 " + (detail.expenses || []).length, empty: "还没有费用" }, expenses)
			);
		}

		function TripsyPanelPage() {
			const [health, setHealth] = react.useState(null);
			const [trips, setTrips] = react.useState(null);
			const [selected, setSelected] = react.useState(null);
			const [detail, setDetail] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [loginUrl, setLoginUrl] = react.useState(null);

			const loadHealth = react.useCallback(async () => {
				try {
					const data = await getJson(API + "/health");
					setHealth(data);
					setError(null);
					return data;
				} catch (e) {
					setHealth({ auth: { loggedIn: false } });
					setError(e.message);
					return null;
				}
			}, []);

			const loadTrips = react.useCallback(async () => {
				try {
					const data = await getJson(API + "/trips");
					setTrips(data.trips || []);
					setError(null);
				} catch (e) {
					setTrips([]);
					setError(e.message);
				}
			}, []);

			react.useEffect(() => {
				ensureStyles();
				(async () => {
					const data = await loadHealth();
					if (data && data.auth && data.auth.loggedIn) await loadTrips();
				})();
			}, [loadHealth, loadTrips]);

			react.useEffect(() => {
				if (!selected) {
					setDetail(null);
					return;
				}
				let alive = true;
				setDetail(null);
				(async () => {
					try {
						const data = await getJson(API + "/trip?id=" + encodeURIComponent(selected));
						if (alive) setDetail(data);
					} catch (e) {
						if (alive) setError(e.message);
					}
				})();
				return () => {
					alive = false;
				};
			}, [selected]);

			const doLogin = async () => {
				setBusy(true);
				setError(null);
				try {
					const info = await postJson(API + "/login");
					setLoginUrl(info.authUrl || null);
				} catch (e) {
					setError(e.message);
				} finally {
					setBusy(false);
				}
			};

			// While a login is pending, poll until the credential lands.
			react.useEffect(() => {
				if (!loginUrl) return;
				const timer = setInterval(async () => {
					const data = await loadHealth();
					if (data && data.auth && data.auth.loggedIn) {
						setLoginUrl(null);
						await loadTrips();
					}
				}, 2000);
				return () => clearInterval(timer);
			}, [loginUrl, loadHealth, loadTrips]);

			const loggedIn = Boolean(health && health.auth && health.auth.loggedIn);
			const me = health && health.me;

			const head = h(
				"div",
				{ className: "dsh-tripsy-head" },
				h("h2", { className: "dsh-tripsy-title" }, "Tripsy"),
				h(
					"span",
					{ className: "dsh-tripsy-sub" },
					loggedIn ? (me && me.name ? me.name : "已登录") : "未登录",
					loggedIn && trips ? " · " + trips.length + " 个行程" : ""
				),
				h("span", { className: "dsh-tripsy-spacer" }),
				loggedIn
					? h(
							"button",
							{
								className: "dsh-tripsy-btn",
								disabled: busy,
								onClick: async () => {
									setBusy(true);
									await loadHealth();
									await loadTrips();
									setBusy(false);
								},
							},
							"刷新"
						)
					: h("button", { className: "dsh-tripsy-btn", disabled: busy, onClick: doLogin }, busy ? "启动中…" : "登录 Tripsy")
			);

			if (!loggedIn) {
				return h(
					"div",
					{ className: "dsh-tripsy-root" },
					head,
					h(
						"div",
						{ className: "dsh-tripsy-detail" },
						h(
							"div",
							{ className: "dsh-tripsy-card" },
							h("div", { style: { fontWeight: 600, marginBottom: 8 } }, "还没有连接 Tripsy"),
							h(
								"div",
								{ className: "dsh-tripsy-meta" },
								"点上面的「登录 Tripsy」会打开浏览器完成一次授权。授权后令牌自动续期，不用再管。"
							),
							loginUrl
								? h(
										"div",
										{ style: { marginTop: 12 } },
										h("div", { className: "dsh-tripsy-meta" }, "浏览器没自动打开？手动访问这个地址："),
										h("a", { className: "dsh-tripsy-link", href: loginUrl, target: "_blank", rel: "noreferrer" }, loginUrl)
									)
								: null,
							error ? h("div", { className: "dsh-tripsy-err", style: { marginTop: 12 } }, error) : null
						)
					)
				);
			}

			const list = (trips || []).map((t) =>
				h(
					"button",
					{
						key: t.id,
						className: "dsh-tripsy-item" + (String(selected) === String(t.id) ? " on" : ""),
						onClick: () => setSelected(t.id),
					},
					h("span", { className: "dsh-tripsy-item-name" }, t.name || "(未命名行程)"),
					h("span", { className: "dsh-tripsy-item-dates" }, tripDates(t))
				)
			);

			return h(
				"div",
				{ className: "dsh-tripsy-root" },
				head,
				error ? h("div", { className: "dsh-tripsy-err", style: { padding: "0 16px 8px" } }, error) : null,
				h(
					"div",
					{ className: "dsh-tripsy-main" },
					h(
						"div",
						{ className: "dsh-tripsy-list" },
						trips === null ? h("div", { className: "dsh-tripsy-empty" }, "加载中…") : null,
						trips && !trips.length ? h("div", { className: "dsh-tripsy-empty" }, "还没有行程") : null,
						list
					),
					h(
						"div",
						{ className: "dsh-tripsy-detail" },
						selected && !detail ? h("div", { className: "dsh-tripsy-empty" }, "加载中…") : h(TripDetail, { detail })
					)
				)
			);
		}
		// #endregion

		// #region plugin
		/** Required client services (fiber inject waiting). */
		const inject = ["slots"];

		function registerPanel(ctx) {
			const slots = ctx.slots;
			const disposers = [];
			disposers.push(
				slots.inject("sidebar.panellist", () =>
					slots.register(
						{
							name: "sidebar.panellist",
							id: PANEL_ID,
							order: PANEL_ORDER,
							label: () => "Tripsy",
						},
						TripsyPanelIcon
					)
				)
			);
			disposers.push(
				slots.inject("main", () =>
					slots.register(
						{ name: "main", key: PANEL_ID, inject: () => ({}) },
						TripsyPanelPage
					)
				)
			);
			return () => {
				for (const dispose of disposers.splice(0)) dispose();
			};
		}

		/**
		 * Mount the Tripsy surfaces. Registration problems are logged, never
		 * thrown: the web shell fails its whole boot when a plugin apply throws,
		 * and an external plugin must not be able to take the GUI down.
		 */
		function apply(ctx) {
			let release = () => {};
			try {
				release = registerPanel(ctx);
			} catch (error) {
				console.warn("[dsh-tripsy] panel registration failed:", error);
			}
			try {
				ctx.effect(() => () => release(), "dsh-tripsy: ui mounts");
			} catch {}
		}

		exports.apply = apply;
		exports.inject = inject;
		// #endregion

		return module.exports;
	}
});
