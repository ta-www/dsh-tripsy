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
		/** Tripsy's app shows this on its "connect to MCP" screen; a sane default. */
		const DEFAULT_MCP_URL = "https://mcp.tripsy.app";
		/**
		 * Composer slots that may declare `inputActions` as a standard prop. The
		 * shipped declaration could not be read with certainty, so several
		 * null-rendering entries are registered and whichever slot carries it
		 * wins. A slot that does not exist never activates, and a null occupant
		 * changes nothing visually in any of them.
		 */
		const CAPTURE_SLOTS = [
			"conversation.input.left",
			"conversation.input.right",
			"conversation.composer.dock",
			"conversation.input.dock",
		];

		// #region styles
		const STYLE_ID = "dsh-tripsy-styles";
		const CSS = `
.dsh-tripsy-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px}
.dsh-tripsy-head{display:flex;align-items:center;gap:10px;padding:12px 16px 0;flex:none}
.dsh-tripsy-title{font-size:16px;font-weight:700;margin:0;white-space:nowrap}
.dsh-tripsy-sub{color:var(--dsw-alias-label-secondary);font-size:12px}
/* Opt-in truncation. The secondary-text class itself must wrap: it is also used
   for prose (guides, hints, empty states), and while it carried nowrap+ellipsis
   every paragraph silently lost everything past its first line. */
.dsh-tripsy-clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dsh-tripsy-preview{margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;white-space:pre-wrap;word-break:break-word}
.dsh-tripsy-spacer{flex:1}
.dsh-tripsy-btn{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;flex:none}
.dsh-tripsy-btn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-tripsy-btn[disabled]{opacity:.45;cursor:default}
.dsh-tripsy-triphead{display:flex;align-items:baseline;gap:10px;padding:12px 20px 0;flex:none}
.dsh-tripsy-tripname{font-weight:700;font-size:14px}
.dsh-tripsy-newtrip{margin-bottom:6px;border:1px dashed var(--dsw-alias-border-l2)}
.dsh-tripsy-tabs{display:flex;gap:2px;padding:8px 16px 0;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsh-tripsy-tab{background:0 0;border:0;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;padding:7px 14px;font-size:13px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-family:inherit}
.dsh-tripsy-tab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-tripsy-tab[data-active]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-state-business-primary);font-weight:600}
.dsh-tripsy-main{display:flex;flex:1 1 auto;min-height:0;overflow:hidden}
.dsh-tripsy-list{width:230px;flex:0 0 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;border-right:1px solid var(--dsw-alias-border-l1);padding:8px}
.dsh-tripsy-item{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:9px 10px;cursor:pointer;color:inherit;font:inherit}
.dsh-tripsy-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-tripsy-item.on{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.dsh-tripsy-item-name{font-weight:600;font-size:13px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-tripsy-item-dates{color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:2px;display:block}
.dsh-tripsy-detail{flex:1 1 auto;min-width:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 0 40px}
.dsh-tripsy-hero{position:relative;height:190px;overflow:hidden;background:linear-gradient(135deg,#4a3a2a,#243b2f);flex:none}
.dsh-tripsy-hero img{width:100%;height:100%;object-fit:cover;display:block}
.dsh-tripsy-hero-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.05) 35%,rgba(0,0,0,.72) 100%)}
.dsh-tripsy-hero-text{position:absolute;left:20px;right:20px;bottom:14px;color:#fff}
.dsh-tripsy-hero-name{font-size:24px;font-weight:800;margin:0;text-shadow:0 1px 12px rgba(0,0,0,.5)}
.dsh-tripsy-hero-meta{font-size:12px;opacity:.92;margin-top:4px;text-shadow:0 1px 8px rgba(0,0,0,.5)}
.dsh-tripsy-actions{display:flex;gap:10px;padding:14px 20px 4px;flex-wrap:wrap}
.dsh-tripsy-action{display:flex;flex-direction:column;align-items:center;gap:5px;background:0 0;border:0;cursor:pointer;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;min-width:56px}
.dsh-tripsy-action-glyph{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2)}
.dsh-tripsy-action:hover .dsh-tripsy-action-glyph{border-color:var(--dsw-alias-state-business-primary)}
.dsh-tripsy-action:hover{color:var(--dsw-alias-label-primary)}
.dsh-tripsy-card{margin:14px 20px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;overflow:hidden}
.dsh-tripsy-card-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-weight:600}
.dsh-tripsy-card-head .dsh-tripsy-spacer{flex:1}
.dsh-tripsy-daylabel{padding:10px 14px 4px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-tripsy-tl{position:relative;padding:2px 14px 10px}
.dsh-tripsy-tl-row{position:relative;display:flex;gap:10px;padding:7px 0}
.dsh-tripsy-tl-rail{position:relative;flex:0 0 26px;display:flex;justify-content:center}
.dsh-tripsy-tl-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2);z-index:1}
.dsh-tripsy-tl-row:not(:last-child) .dsh-tripsy-tl-rail::after{content:"";position:absolute;top:26px;bottom:-9px;width:2px;background:var(--dsw-alias-border-l1)}
.dsh-tripsy-tl-body{flex:1 1 auto;min-width:0;display:flex;gap:10px;align-items:baseline}
.dsh-tripsy-tl-main{flex:1 1 auto;min-width:0}
.dsh-tripsy-tl-name{font-weight:600;word-break:break-word}
.dsh-tripsy-tl-sub{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:2px;word-break:break-word}
.dsh-tripsy-tl-time{flex:0 0 auto;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}
.dsh-tripsy-badge{display:inline-block;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 7px;font-size:11px;color:var(--dsw-alias-label-secondary);margin-left:6px}
.dsh-tripsy-money-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsh-tripsy-money-row:last-child{border-bottom:0}
.dsh-tripsy-money-label{flex:1 1 auto}
.dsh-tripsy-money-value{font-variant-numeric:tabular-nums}
.dsh-tripsy-money-total{font-weight:700}
.dsh-tripsy-field{display:block;width:100%;box-sizing:border-box;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;font:inherit;outline:none;resize:vertical}
.dsh-tripsy-field:focus{border-color:var(--dsw-alias-state-business-primary)}
.dsh-tripsy-chips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 10px}
.dsh-tripsy-chip{background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:4px 11px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-family:inherit}
.dsh-tripsy-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dsh-tripsy-notice{margin:10px 20px 0;padding:9px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.7}
.dsh-tripsy-primary{padding:7px 16px;border-radius:8px;border:1px solid transparent;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-inverse,#fff);font:inherit;font-size:13px;cursor:pointer}
/* Disabled must read as disabled: muted fill, muted label, no pointer. */
.dsh-tripsy-primary:disabled{opacity:1;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);border-color:var(--dsw-alias-border-l1);cursor:not-allowed}
/* The hint is a hint: placeholder colour, never the input's own colour. */
.dsh-tripsy-field::placeholder{color:var(--dsw-alias-label-tertiary);opacity:1}
.dsh-tripsy-empty{color:var(--dsw-alias-label-tertiary);padding:28px 20px}
.dsh-tripsy-err{color:#f87171;white-space:pre-wrap}
.dsh-tripsy-ok{color:var(--dsw-alias-state-business-primary,#f97316)}
.dsh-tripsy-pad{padding:0 20px}
.dsh-tripsy-cover{width:100%;max-width:640px;border-radius:10px;margin-bottom:14px;display:block}
.dsh-tripsy-link{color:var(--dsw-alias-state-business-primary,#f97316);word-break:break-all}
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
		/** Tripsy stores UTC and expects clients to render in the item's zone. */
		function fmtDateTime(iso, tz) {
			if (!iso) return "";
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return String(iso);
			try {
				return new Intl.DateTimeFormat(undefined, {
					timeZone: tz || undefined,
					month: "numeric",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				}).format(d);
			} catch {
				return d.toISOString().slice(5, 16).replace("T", " ");
			}
		}
		function fmtTime(iso, tz) {
			if (!iso) return "";
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return "";
			try {
				return new Intl.DateTimeFormat(undefined, {
					timeZone: tz || undefined,
					hour: "2-digit",
					minute: "2-digit",
				}).format(d);
			} catch {
				return d.toISOString().slice(11, 16);
			}
		}
		function fmtDate(value) {
			return value ? String(value).slice(0, 10) : "";
		}
		/** Local calendar day key for grouping, in the item's own timezone. */
		function dayKey(iso, tz) {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return "unknown";
			try {
				return new Intl.DateTimeFormat("en-CA", {
					timeZone: tz || undefined,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				}).format(d);
			} catch {
				return d.toISOString().slice(0, 10);
			}
		}
		function dayLabel(iso, tz) {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return "";
			try {
				return new Intl.DateTimeFormat(undefined, {
					timeZone: tz || undefined,
					month: "long",
					day: "numeric",
					weekday: "long",
				}).format(d);
			} catch {
				return dayKey(iso, tz);
			}
		}
		/** has_dates is authoritative: undated trips carry meaningless dates. */
		function tripDates(trip) {
			if (trip?.has_dates === false) return "无日期";
			const a = fmtDate(trip?.starts_at);
			const b = fmtDate(trip?.ends_at);
			if (!a && !b) return "无日期";
			return a === b || !b ? a : a + " → " + b;
		}
		function tripCountdown(trip) {
			if (trip?.has_dates === false || !trip?.ends_at) return "";
			const end = new Date(trip.ends_at + "T23:59:59");
			const start = trip.starts_at ? new Date(trip.starts_at + "T00:00:00") : null;
			const now = new Date();
			const day = 86400000;
			if (start && now < start) return Math.ceil((start - now) / day) + " 天后出发";
			if (now <= end) return "还有 " + Math.max(1, Math.ceil((end - now) / day)) + " 天结束";
			return "已结束";
		}
		function tripLength(trip) {
			if (trip?.has_dates === false || !trip?.starts_at || !trip?.ends_at) return "";
			const days = Math.round((new Date(trip.ends_at) - new Date(trip.starts_at)) / 86400000) + 1;
			return days > 0 ? days + " 天行程" : "";
		}
		function money(price, currency) {
			if (price === null || price === undefined || price === "") return "";
			const n = Number(price);
			const shown = Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(price);
			return (currency || "") + " " + shown;
		}

		const ACTIVITY_EMOJI = {
			restaurant: "🍽️", bar: "🍸", cafe: "☕", bakery: "🥐", nightlife: "🎶",
			shopping: "🛍️", foodMarket: "🧺", museum: "🏛️", theater: "🎭", concert: "🎤",
			park: "🌳", nationalPark: "🏞️", beach: "🏖️", zoo: "🦁", aquarium: "🐠",
			amusementPark: "🎡", stadium: "🏟️", winery: "🍷", brewery: "🍺",
			fitnessCenter: "🏋️", gym: "🏋️", spa: "💆", hotel: "🏨", library: "📚",
			university: "🎓", school: "🏫", hospital: "🏥", pharmacy: "💊",
			publicTransport: "🚇", parking: "🅿️", gasStation: "⛽", evCharger: "🔌",
			atm: "🏧", bank: "🏦", postOffice: "📮", police: "🚓", fireStation: "🚒",
			restroom: "🚻", laundry: "🧺", marina: "⛵", movieTheater: "🎬",
			meeting: "👥", event: "🎪", tour: "🧭", kids: "🧸", relax: "🛋️",
			note: "📝", general: "📍", fit: "🏃",
		};
		const TRANSPORT_EMOJI = {
			airplane: "✈️", train: "🚆", bus: "🚌", car: "🚗", roadtrip: "🚗",
			ferry: "⛴️", cruise: "🛳️", bike: "🚲", motorcycle: "🏍️", walk: "🚶",
		};
		function emojiForActivity(a) {
			return ACTIVITY_EMOJI[a?.activity_type] || "📍";
		}
		function emojiForTransport(t) {
			return TRANSPORT_EMOJI[t?.transportation_type] || "🧭";
		}

		/** Merge the trip's three scheduled collections into one day-grouped rail. */
		function buildTimeline(detail) {
			const tz = detail?.trip?.timezone;
			const items = [];
			for (const a of detail?.activities || []) {
				items.push({
					kind: "activity",
					id: "a" + a.id,
					at: a.starts_at || a.ends_at,
					tz: a.timezone || tz,
					emoji: emojiForActivity(a),
					title: a.name || "(未命名活动)",
					badge: a.activity_type || "",
					sub: a.address || "",
					extra: [
						a.provider_reservation_code ? "确认号 " + a.provider_reservation_code : "",
						a.price ? money(a.price, a.currency) : "",
					].filter(Boolean).join(" · "),
				});
			}
			for (const x of detail?.hostings || []) {
				items.push({
					kind: "hosting",
					id: "h" + x.id,
					at: x.starts_at || x.ends_at,
					tz: x.timezone || tz,
					emoji: "🏨",
					title: x.name || "(未命名住宿)",
					badge: "",
					sub: x.address || "",
					extra: [
						x.provider_reservation_code ? "确认号 " + x.provider_reservation_code : "",
						x.room_number ? "房间 " + x.room_number : "",
					].filter(Boolean).join(" · "),
				});
			}
			for (const t of detail?.transportations || []) {
				items.push({
					kind: "transport",
					id: "t" + t.id,
					at: t.departure_at || t.arrival_at,
					tz: t.departure_timezone || tz,
					emoji: emojiForTransport(t),
					title: (t.departure_description || t.name || "?") + " → " + (t.arrival_description || "?"),
					badge: t.transportation_type || "",
					sub: [t.company, t.transport_number].filter(Boolean).join(" · "),
					extra: t.provider_reservation_code ? "确认号 " + t.provider_reservation_code : "",
				});
			}
			items.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

			const groups = [];
			const index = new Map();
			for (const item of items) {
				const key = item.at ? dayKey(item.at, item.tz) : "unknown";
				if (!index.has(key)) {
					index.set(key, { key, label: item.at ? dayLabel(item.at, item.tz) : "未排期", items: [] });
					groups.push(index.get(key));
				}
				index.get(key).items.push(item);
			}
			return groups;
		}

	/** Spend per category, computed from the items' own prices. */
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
		async function postJson(path, payload) {
			const res = await fetch(path, {
				method: "POST",
				headers: payload
					? { Accept: "application/json", "Content-Type": "application/json" }
					: { Accept: "application/json" },
				...(payload ? { body: JSON.stringify(payload) } : {}),
			});
			let body = null;
			try {
				body = await res.json();
			} catch {}
			if (!res.ok) throw new Error((body && body.error) || "HTTP " + res.status);
			return body;
		}

		/**
		 * Resolve a way to send into a conversation.
		 *
		 * `inputActions` is NOT a service: `ui-conversation` publishes it through
		 * `ctx.uiSession.provide({ props: ["inputActions"] })`, so it only reaches
		 * slot entries whose declaration lists it. Asking `ctx.get("uiSession")`
		 * can therefore never work, which is why earlier attempts silently fell
		 * back to the clipboard.
		 *
		 * Two real paths exist, tried in order:
		 *
		 * 1. The standard prop. An entry in a conversation-owned slot receives
		 *    `inputActions` and `sessionId` directly.
		 * 2. By session id: `sessions.scope(id)` gives the session-scoped ctx, and
		 *    `actx.get("conversation").input.for(actx)` gives that session's shell
		 *    (the same object the provide channel hands out). Path 2 is what lets a
		 *    trip keep using one conversation instead of whatever happens to be
		 *    open, and it is the shape the harness itself documents in
		 *    `conversation`'s own error text.
		 *
		 * The reason is reported rather than swallowed, so a failure is visible in
		 * the panel instead of looking like success.
		 */
		function actionsFromService(ctx, sessionId) {
			try {
				const sessions = ctx && ctx.get ? ctx.get("sessions") : null;
				if (!sessions || typeof sessions.scope !== "function") return null;
				let id = sessionId;
				if (id === undefined || id === null) {
					id = typeof sessions.scopeOf === "function" ? sessions.scopeOf(ctx) : undefined;
					if (id === undefined) return null;
				}
				const actx = sessions.scope(id);
				if (!actx) return null;
				const conversation = actx.get ? actx.get("conversation") : actx.conversation;
				const shell =
					conversation && conversation.input && typeof conversation.input.for === "function"
						? conversation.input.for(actx)
						: null;
				const actions = shell && shell.actions;
				if (actions && typeof actions.insertText === "function") {
					return { actions, sessionId: id, via: "service" };
				}
			} catch {}
			return null;
		}

		/**
		 * The live conversation, learned from a composer slot entry.
		 *
		 * `actions` is the real InputActions object, already resolved for the
		 * visible session, so it is preferred over the by-id service path. The
		 * session id it arrives with is what lets a trip pin itself to one
		 * conversation.
		 */
		let liveLink = null;
		function rememberLink(props) {
			try {
				const actions = props && (props.inputActions || props.actions);
				const hasActions = actions && typeof actions.insertText === "function";
				const sessionId = props && props.sessionId;
				if (!hasActions && !sessionId) return;
				liveLink = {
					actions: hasActions ? actions : (liveLink && liveLink.actions) || null,
					sessionId: sessionId === undefined ? (liveLink && liveLink.sessionId) || null : sessionId,
					via: "slot",
				};
			} catch {}
		}

		/** Renders nothing: it exists only to be handed the composer's props. */
		function TripsyCapture(props) {
			rememberLink(props);
			return null;
		}

		function resolveInput(ctx, props, boundId) {
			// 0. Props handed to the panel entry itself, if its slot declares them.
			try {
				const actions = props && props.inputActions;
				if (actions && typeof actions.insertText === "function") {
					return { actions, sessionId: props.sessionId, via: "panel" };
				}
			} catch {}
			// 1. Anything the capture entry has observed and addresses the target.
			if (liveLink) {
				const wanted = boundId === undefined || boundId === null ? null : String(boundId);
				if (liveLink.actions && (wanted === null || wanted === String(liveLink.sessionId))) {
					return { actions: liveLink.actions, sessionId: liveLink.sessionId, via: liveLink.via };
				}
			}
			// 2. Addressed by id through the conversation service.
			const bound = boundId ? actionsFromService(ctx, boundId) : null;
			if (bound) return bound;
			const byId = liveLink && liveLink.sessionId ? actionsFromService(ctx, liveLink.sessionId) : null;
			if (byId) return byId;
			return actionsFromService(ctx, undefined);
		}

		/** Remember which conversation a trip owns, so it is not scattered. */
		function boundSession(tripId) {
			try {
				return tripId ? window.localStorage.getItem("dsh-tripsy:session:" + tripId) : null;
			} catch {
				return null;
			}
		}
		function bindSession(tripId, sessionId) {
			try {
				if (tripId && sessionId) window.localStorage.setItem("dsh-tripsy:session:" + tripId, String(sessionId));
			} catch {}
		}
		function unbindSession(tripId) {
			try {
				if (tripId) window.localStorage.removeItem("dsh-tripsy:session:" + tripId);
			} catch {}
		}

		/**
		 * Conversations a trip can be pointed at.
		 *
		 * `sessions.list` is the same snapshot the sidebar renders, so this needs
		 * no new plumbing and never invents a conversation.
		 */
		/**
		 * Conversations a trip can be pointed at.
		 *
		 * The service is reached by several routes because a plugin's context does
		 * not necessarily expose the same accessors the harness uses internally,
		 * and a failure here used to be swallowed into an empty list with no way
		 * to tell why. The notes are surfaced in the picker instead.
		 *
		 * @returns {{items: Array<object>, notes: string[]}}
		 */
		function listConversationsDetailed(ctx) {
			const notes = [];
			const routes = [];
			try {
				if (services.sessions) routes.push(["ctx.inject('sessions')", services.sessions]);
			} catch {}
			try {
				if (ctx && ctx.sessions) routes.push(["ctx.sessions", ctx.sessions]);
			} catch (e) {
				notes.push("ctx.sessions 读取抛错：" + (e && e.message));
			}
			try {
				const s = ctx && typeof ctx.get === "function" ? ctx.get("sessions") : undefined;
				if (s) routes.push(["ctx.get('sessions')", s]);
			} catch (e) {
				notes.push("ctx.get('sessions') 抛错：" + (e && e.message));
			}
			if (!routes.length) {
				notes.push("没有拿到 sessions 服务。ctx.inject('sessions') 未生效，ctx.sessions / ctx.get('sessions') 也都为空");
			}

			for (const [label, service] of routes) {
				let snapshot = null;
				try {
					snapshot = service.list && service.list.getSnapshot ? service.list.getSnapshot() : null;
				} catch (e) {
					notes.push(label + "：list.getSnapshot() 抛错：" + (e && e.message));
					continue;
				}
				if (!snapshot) {
					notes.push(label + "：没有 list.getSnapshot()（该服务上有：" + Object.keys(service).join(",") + "）");
					continue;
				}
				let rows = [];
				if (Array.isArray(snapshot)) rows = snapshot;
				else if (Array.isArray(snapshot.ids)) rows = snapshot.ids.map((id) => snapshot.byId && snapshot.byId[id]);
				else if (snapshot.byId) rows = Object.values(snapshot.byId);
				rows = rows.filter(Boolean);
				notes.push(
					label + "：拿到 " + rows.length + " 条" +
						(snapshot.ids ? "（ids " + snapshot.ids.length + "）" : "") +
						(rows[0] ? "，字段：" + Object.keys(rows[0]).slice(0, 14).join(",") : "")
				);
				if (rows.length) {
					return {
						items: rows.map((s) => ({
							id: s.id,
							title: s.title || (s.blank ? "(空白对话)" : String(s.id).slice(0, 8)),
							blank: Boolean(s.blank),
							cwd: s.cwd || "",
						})),
						notes,
					};
				}
			}
			return { items: [], notes };
		}

		/** Convenience wrapper for callers that only need the rows. */
		function listConversations(ctx) {
			return listConversationsDetailed(ctx).items;
		}

		/**
		 * Services reached through `ctx.inject` rather than `ctx.get`.
		 *
		 * `ctx.get("sessions")` from this plugin's context came back empty, which
		 * is why both the conversation list and creating one failed. Injecting the
		 * service yields a scope where it is actually present, and -- unlike adding
		 * it to the plugin's top-level `inject` -- a name that never resolves only
		 * skips this callback instead of keeping the whole panel from mounting.
		 */
		const services = { sessions: null, workspace: null, notes: [] };

		/** Whichever route produced the sessions service. */
		function sessionsService(ctx) {
			if (services.sessions) return services.sessions;
			try {
				if (ctx && ctx.sessions) return ctx.sessions;
			} catch {}
			try {
				if (ctx && typeof ctx.get === "function") {
					const s = ctx.get("sessions");
					if (s) return s;
				}
			} catch {}
			return null;
		}

		/** Whichever route produced the workspace navigation service. */
		function workspaceService(ctx) {
			if (services.workspace) return services.workspace;
			try {
				if (ctx && typeof ctx.get === "function") return ctx.get("uiWorkspace") || null;
			} catch {}
			return null;
		}

		/** Bring a conversation to the front. Best effort: sending works without it. */
		function openConversation(ctx, sessionId) {
			try {
				const nav = workspaceService(ctx);
				if (nav && typeof nav.openSession === "function" && sessionId) {
					nav.openSession(sessionId);
					return true;
				}
			} catch {}
			return false;
		}

		/**
		 * Create a conversation and bring it to the front.
		 *
		 * Used when starting a new trip: that trip has no conversation yet, and
		 * reusing whichever one is open is what scattered the workspace before.
		 * A failure is reported rather than papered over, so the caller can refuse
		 * to send instead of quietly landing in someone else's conversation.
		 *
		 * @returns {Promise<{ok: boolean, id?: string, reason?: string}>}
		 */
		async function createConversation(ctx) {
			const sessions = sessionsService(ctx);
			if (!sessions || typeof sessions.create !== "function") {
				return { ok: false, reason: "没有拿到 sessions.create（ctx.sessions 不可用）" };
			}
			let workspaceId;
			try {
				const snapshot = sessions.list ? sessions.list.getSnapshot() : null;
				const here =
					liveLink && snapshot && snapshot.byId ? snapshot.byId[liveLink.sessionId] : null;
				workspaceId = here && (here.workspaceId || here.workspace);
			} catch {}
			try {
				const created = await sessions.create(workspaceId ? { workspaceId } : {});
				const id =
					typeof created === "string" ? created : created && (created.sessionId || created.id);
				if (!id) return { ok: false, reason: "sessions.create 没有返回新对话 id" };
				openConversation(ctx, id);
				return { ok: true, id };
			} catch (e) {
				return { ok: false, reason: (e && e.message) || String(e) };
			}
		}

		/** Words that appear in almost every conversation title, so they prove nothing. */
		const TITLE_STOPWORDS = ["行程", "创建", "旅行", "旅游", "安排", "计划", "助手", "对话"];

		/**
		 * Guess which conversation owns a trip, by title.
		 *
		 * The trip was created from a conversation, and the harness titles
		 * conversations after what happened in them ("西安三天行程创建" for the
		 * 西安 trip), so the title is the only durable link back. Deliberately
		 * weak: a guess only pre-selects a row in the picker and never binds on
		 * its own, because binding decides where later edits land.
		 */
		function suggestSession(ctx, trip) {
			try {
				const name = String((trip && trip.name) || "");
				if (!name) return null;
				const grams = [];
				for (let i = 0; i + 2 <= name.length; i++) {
					const g = name.slice(i, i + 2);
					if (/^[\u4e00-\u9fa5]{2}$/.test(g) && !TITLE_STOPWORDS.includes(g)) grams.push(g);
				}
				const words = name
					.split(/[^A-Za-z]+/)
					.filter((w) => w.length >= 3)
					.map((w) => w.toLowerCase());
				let best = null;
				for (const s of listConversations(ctx)) {
					const title = String(s.title || "");
					const lower = title.toLowerCase();
					let score = 0;
					for (const g of grams) if (title.includes(g)) score += 2;
					for (const w of words) if (lower.includes(w)) score += 3;
					if (score > 0 && (!best || score > best.score)) best = { ...s, score };
				}
				return best;
			} catch {
				return null;
			}
		}

		/** Choose the conversation a trip's edits belong to. */
		function ConversationPicker({ ctx, current, suggested, onPick, onClose }) {
			const read = listConversationsDetailed(ctx);
			const all = read.items;
			const ordered = suggested ? [suggested, ...all.filter((s) => s.id !== suggested.id)] : all;
			return h(
				"div",
				{ className: "dsh-tripsy-card", style: { margin: "10px 20px 0" } },
				h(
					"div",
					{ className: "dsh-tripsy-card-head" },
					h("span", null, "这个行程用哪个对话"),
					h("span", { className: "dsh-tripsy-spacer" }),
					h("button", { className: "dsh-tripsy-btn", onClick: onClose }, "取消")
				),
				h(
					"div",
					{ style: { padding: "8px 10px 12px" } },
					h(
						"div",
						{ className: "dsh-tripsy-sub", style: { marginBottom: 8, lineHeight: 1.7 } },
						"选定后，这个行程的改动都会发到那个对话并自动切过去，不会再落到当前打开的这个。"
					),
					// Needs no service lookup, so it still works when the list cannot
					// be read: open the trip's conversation, then bind it here.
					liveLink && liveLink.sessionId
						? h(
								"button",
								{
									className: "dsh-tripsy-item",
									style: { width: "100%", textAlign: "left", marginBottom: 4 },
									onClick: () => onPick(liveLink.sessionId),
								},
								h("span", { className: "dsh-tripsy-item-name" }, "用当前打开的对话"),
								h(
									"span",
									{ className: "dsh-tripsy-item-dates dsh-tripsy-clip" },
									"先在左侧打开这个行程的对话，再点这里"
								)
							)
						: null,
					ordered.length
						? ordered
								.slice(0, 20)
								.map((s) =>
									h(
										"button",
										{
											key: s.id,
											className: "dsh-tripsy-item" + (String(current) === String(s.id) ? " on" : ""),
											style: { width: "100%", textAlign: "left", marginBottom: 4 },
											onClick: () => onPick(s.id),
										},
										h(
											"span",
											{ className: "dsh-tripsy-item-name" },
											s.title + (suggested && s.id === suggested.id ? "　← 建议" : "")
										),
										h(
											"span",
											{ className: "dsh-tripsy-item-dates dsh-tripsy-clip" },
											s.cwd || (s.blank ? "空白对话" : "")
										)
									)
								)
						: h(
								"div",
								{ className: "dsh-tripsy-sub", style: { lineHeight: 1.9 } },
								"没有读到对话列表。以下是我实际探测到的结果，请把它发给我：",
								h(
									"div",
									{ className: "dsh-tripsy-preview", style: { marginTop: 8, display: "block" } },
									read.notes.length ? read.notes.join("\n") : "（没有任何诊断信息）"
								)
							)
				)
			);
		}

		/** Insert the text, then submit it once the editor has actually taken it. */
		function sendToAgent(link, text) {
			if (!link || !link.actions) return "no-session";
			const actions = link.actions;
			let span;
			try {
				span = actions.captureInsertion ? actions.captureInsertion() : undefined;
			} catch {}
			let accepted = false;
			try {
				accepted = actions.insertText(text, span) !== false;
			} catch {
				accepted = false;
			}
			if (!accepted) return "inserted";

			if (typeof actions.submit !== "function") return "inserted";

			// Wait for the async insert to land, judged by the draft revision.
			const before = span && typeof span.draftRev !== "undefined" ? span.draftRev : undefined;
			const started = Date.now();
			const trySubmit = () => {
				let settled = true;
				try {
					if (before !== undefined && actions.captureInsertion) {
						settled = actions.captureInsertion().draftRev !== before;
					}
				} catch {}
				if (settled || Date.now() - started > 1200) {
					try {
						actions.submit();
					} catch {}
					return;
				}
				requestAnimationFrame(trySubmit);
			};
			requestAnimationFrame(trySubmit);
			return "sent";
		}
		async function copyText(text) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				return false;
			}
		}

		/** Pull the filename out of Content-Disposition, preferring RFC 5987. */
		function filenameFrom(header) {
			if (!header) return null;
			const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
			if (star) {
				try {
					return decodeURIComponent(star[1]);
				} catch {}
			}
			const plain = /filename="?([^";]+)"?/i.exec(header);
			return plain ? plain[1] : null;
		}

		/**
		 * Download a trip as .ics.
		 *
		 * Fetched and saved as a blob rather than navigated to. Clicking an anchor
		 * that hits a failing route replaces the whole harness window with the
		 * server's error page, stranding the user with no way back; fetching keeps
		 * the panel in place and lets a failure be reported next to the button.
		 */
		async function downloadIcs(tripId) {
			const res = await fetch(API + "/ics?id=" + encodeURIComponent(tripId), {
				headers: { Accept: "text/calendar" },
			});
			if (!res.ok) {
				let detail = "";
				try {
					detail = (await res.json()).error || "";
				} catch {}
				const err = new Error(
					res.status === 404
						? "导出接口不可用（404）。插件宿主半可能还没重新加载——重启一次 DSH 再试。"
						: detail || "导出失败：HTTP " + res.status
				);
				err.status = res.status;
				throw err;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			try {
				const a = document.createElement("a");
				a.href = url;
				a.download = filenameFrom(res.headers.get("Content-Disposition")) || "tripsy.ics";
				a.style.display = "none";
				document.body.appendChild(a);
				a.click();
				a.remove();
			} finally {
				// Give the browser time to start the save before dropping the URL.
				setTimeout(() => URL.revokeObjectURL(url), 10000);
			}
			return {
				name: filenameFrom(res.headers.get("Content-Disposition")) || "tripsy.ics",
				events: res.headers.get("X-Tripsy-Events"),
				skipped: res.headers.get("X-Tripsy-Skipped"),
			};
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

		/**
		 * The import tutorial lives next to the button that produces the file:
		 * the two halves of "get this onto my phone" are useless apart.
		 */
		function IcsHelp({ note, error }) {
			return h(
				"div",
				{ className: "dsh-tripsy-card", style: { margin: "12px 20px 0" } },
				// No close button here: the 教程/收起教程 toggle in the trip header is
				// the single control for this card's visibility.
				h("div", { className: "dsh-tripsy-card-head" }, h("span", null, "导出到 iPhone 日历（ICS）")),
				error
					? h("div", { className: "dsh-tripsy-err", style: { margin: "10px 14px 0" } }, error)
					: note
						? h("div", { className: "dsh-tripsy-ok", style: { margin: "10px 14px 0" } }, note)
						: null,
				h(
					"div",
					{ style: { padding: "12px 14px", lineHeight: 1.85 } },
					h("div", { style: { fontWeight: 600 } }, "① 下载"),
					h(
						"div",
						{ className: "dsh-tripsy-sub" },
						"点「导出到日历」，这条行程会存成 .ics 文件。电脑上直接下载；你也可以在 iPhone 上打开这个面板再点一次。"
					),
					h("div", { style: { fontWeight: 600, marginTop: 10 } }, "② 装上「ICS To Calendar」快捷指令"),
					h(
						"div",
						{ className: "dsh-tripsy-sub" },
						"在 iPhone 的「快捷指令」App 里添加一个 ICS To Calendar 快捷指令（社区里有现成的）。自己建也很简单：接收「文件」输入 → 用「选择日历」动作 → 用「添加新日程」动作读取 ICS。"
					),
					h("div", { style: { fontWeight: 600, marginTop: 10 } }, "③ 导入"),
					h(
						"div",
						{ className: "dsh-tripsy-sub" },
						"在「文件」App 里找到这个 .ics，长按 → 共享 → 运行「ICS To Calendar」→ 选择要写入的日历。也可以直接点开 .ics，iOS 会问你要加到哪个日历。"
					),
					h("div", { style: { fontWeight: 600, marginTop: 10 } }, "导入后你会得到"),
					h(
						"ul",
						{ className: "dsh-tripsy-sub", style: { margin: "4px 0 0", paddingLeft: 20 } },
						h("li", null, "行程本身：一条跨多天的全天日程"),
						h("li", null, "每个活动 / 住宿 / 交通：各一条日程，带地址、确认号、价格与备注"),
						h("li", null, "有经纬度的条目会带上地图位置")
					),
					h("div", { style: { fontWeight: 600, marginTop: 10 } }, "关于时间"),
					h(
						"div",
						{ className: "dsh-tripsy-sub" },
						"事件按 UTC 绝对时刻写入，因此会随手机当前时区显示，而且飞行时长是准确的；每条事件的描述里都标了当地时间。例如纽约 10/12 09:00 的活动：你在纽约看到的就是 09:00，行程开始前在北京看会显示成 21:00——同一个时刻。"
					)
				)
			);
		}

		function Card({ title, right, children }) {
			return h(
				"div",
				{ className: "dsh-tripsy-card" },
				h(
					"div",
					{ className: "dsh-tripsy-card-head" },
					h("span", null, title),
					h("span", { className: "dsh-tripsy-spacer" }),
					right || null
				),
				children
			);
		}

		function Timeline({ groups }) {
			return h(
				"div",
				null,
				groups.map((g) =>
					h(
						"div",
						{ key: g.key },
						h("div", { className: "dsh-tripsy-daylabel" }, g.label),
						h(
							"div",
							{ className: "dsh-tripsy-tl" },
							g.items.map((it) =>
								h(
									"div",
									{ key: it.id, className: "dsh-tripsy-tl-row" },
									h("div", { className: "dsh-tripsy-tl-rail" }, h("div", { className: "dsh-tripsy-tl-dot" }, it.emoji)),
									h(
										"div",
										{ className: "dsh-tripsy-tl-body" },
										h(
											"div",
											{ className: "dsh-tripsy-tl-main" },
											h(
												"div",
												{ className: "dsh-tripsy-tl-name" },
												it.title,
												it.badge ? h("span", { className: "dsh-tripsy-badge" }, it.badge) : null
											),
											it.sub ? h("div", { className: "dsh-tripsy-tl-sub" }, it.sub) : null,
											it.extra ? h("div", { className: "dsh-tripsy-tl-sub" }, it.extra) : null
										),
										h("div", { className: "dsh-tripsy-tl-time" }, fmtTime(it.at, it.tz))
									)
								)
							)
						)
					)
				)
			);
		}

		function BrowseTab({ detail, onIntent, link, ctx }) {
			// Hooks run before the early return so the order is stable.
			const [costOpen, setCostOpen] = react.useState(false);
			if (!detail) return h("div", { className: "dsh-tripsy-empty" }, "从左边选一个行程");
			const trip = detail.trip || {};
			const groups = buildTimeline(detail);
			// Summed on the host so there is one implementation of the arithmetic;
			// absent only while a stale host half is still loaded.
			const costs = detail.costs || null;
			const scheduled = groups.reduce((n, g) => n + g.items.length, 0);

			return h(
				"div",
				null,
				h(
					"div",
					{ className: "dsh-tripsy-hero" },
					trip.cover_image_url
						? h("img", {
								src: trip.cover_image_url,
								alt: "",
								loading: "lazy",
								onError: (e) => {
									e.currentTarget.style.display = "none";
								},
							})
						: null,
					h("div", { className: "dsh-tripsy-hero-veil" }),
					h(
						"div",
						{ className: "dsh-tripsy-hero-text" },
						h("h2", { className: "dsh-tripsy-hero-name" }, trip.name || "(未命名行程)"),
						h(
							"div",
							{ className: "dsh-tripsy-hero-meta" },
							[tripCountdown(trip), tripLength(trip)].filter(Boolean).join(" · ")
						),
						h("div", { className: "dsh-tripsy-hero-meta" }, tripDates(trip))
					)
				),
				h(
					"div",
					{ className: "dsh-tripsy-actions" },
					[
						["＋", "加活动", "在「{trip}」里加一个活动："],
						["✈️", "加航班", "在「{trip}」里加一段航班："],
						["🛏️", "加住宿", "在「{trip}」里加一段住宿："],
						["💳", "记费用", "在「{trip}」里记一笔费用："],
					].map(([glyph, label, template]) =>
						h(
							"button",
							{
								key: label,
								className: "dsh-tripsy-action",
								onClick: () => onIntent(template.replace("{trip}", trip.name || "")),
								title: "到「AI 管理」里补全并交给 agent",
							},
							h("span", { className: "dsh-tripsy-action-glyph" }, glyph),
							h("span", null, label)
						)
					)
				),
				groups.length
					? h(Card, { title: "行程", right: h("span", { className: "dsh-tripsy-sub dsh-tripsy-clip" }, scheduled + " 项") }, h(Timeline, { groups }))
					: h("div", { className: "dsh-tripsy-empty" }, "这个行程还没有活动、住宿或交通"),
				// Always rendered: a trip whose items all lack prices is exactly the
				// one that needs this, and keying the card on a non-empty price list
				// hid it there.
				h(
					Card,
					{
						title: "费用概览",
						right: h(
							"button",
							{
								className: "dsh-tripsy-btn",
								onClick: () => setCostOpen((v) => !v),
								title: "让 AI 去查价格并写回行程，之后这里就会显示真实数字",
							},
							costOpen ? "收起" : "AI 计算费用"
						),
					},
					h(
						react.Fragment,
						null,
						costOpen
							? h(ComposerActions, {
									ctx,
									link,
									tripId: trip.id,
									text: (costs && costs.prompt) || "",
									label: "计算并发送",
									note: costs
										? h(
												"div",
												{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.8 } },
												"点「计算并发送」后 AI 会去查这 " +
													costs.missingCount +
													" 条没有价格的条目（已经填好的 " +
													costs.pricedCount +
													" 条会直接采用），**确认后写回行程**，之后这张卡片就会显示真实金额。"
											)
										: h(
												"div",
												{ className: "dsh-tripsy-err", style: { padding: "10px 14px" } },
												"费用汇总尚未就绪——插件宿主半可能还没重新加载，重启一次 DSH 再试。"
											),
								})
							: null,
						costs && costs.rows.length
							? costs.rows.map((r) =>
									h(
										"div",
										{ key: r.key, className: "dsh-tripsy-money-row" },
										h(
											"span",
											{ className: "dsh-tripsy-money-label" },
											r.label + (r.missingCount ? "（" + r.missingCount + " 条待估）" : "")
										),
										h("span", { className: "dsh-tripsy-money-value" }, money(r.known, costs.currency))
									)
								)
							: h(
									"div",
									{ className: "dsh-tripsy-empty", style: { padding: "0 14px 14px" } },
									costs
										? "还没有条目填了价格——点右上角「AI 计算费用」，让 AI 去查价并写回行程。"
										: "费用汇总尚未就绪，重启一次 DSH 再试。"
								),
						costs && costs.knownTotal
							? h(
									"div",
									{ className: "dsh-tripsy-money-row", style: { padding: "0 14px 10px" } },
									h("span", { className: "dsh-tripsy-money-label dsh-tripsy-money-total" }, "已填价格合计"),
									h(
										"span",
										{ className: "dsh-tripsy-money-value dsh-tripsy-money-total" },
										money(costs.knownTotal, costs.currency)
									)
								)
							: null,
						costs && costs.perDay
							? h(
									"div",
									{ className: "dsh-tripsy-money-row", style: { padding: "0 14px 10px" } },
									h("span", { className: "dsh-tripsy-money-label" }, "日均 · " + costs.days + " 天"),
									h("span", { className: "dsh-tripsy-money-value" }, money(costs.perDay, costs.currency))
								)
							: null,
						costs && costs.perPerson
							? h(
									"div",
									{ className: "dsh-tripsy-money-row", style: { padding: "0 14px 10px" } },
									h("span", { className: "dsh-tripsy-money-label" }, "人均 · " + costs.people + " 人"),
									h("span", { className: "dsh-tripsy-money-value" }, money(costs.perPerson, costs.currency))
								)
							: null
					)
				),
			);
		}

		/**
		 * The shared "hand this to the agent" control.
		 *
		 * The panel never writes to the account itself: it composes an instruction
		 * and puts it in the conversation, where the agent confirms what it is
		 * about to change and does the work with the Tripsy MCP tools.
		 */
		function ComposerActions({ ctx, link, tripId, fresh, text, disabled, note, label }) {
			const [status, setStatus] = react.useState(null);

			react.useEffect(() => {
				setStatus(null);
			}, [text]);

			const submit = async (mode) => {
				let outcome = null;
				if (mode === "copy") {
					const copied = await copyText(text);
					setStatus(copied ? "copied" : "failed");
					return;
				}
				// A trip drives its own conversation: address that one and bring it
				// to the front, so an edit never lands in whatever else is open.
				let target = link;
				if (tripId && ctx) {
					const bound = boundSession(tripId);
					if (bound) {
						const byId = actionsFromService(ctx, bound);
						if (byId) target = byId;
					}
				}
				// Switch whenever the target is not the conversation on screen.
				let opened = false;
				if (ctx && target && target.sessionId) {
					const visible = liveLink && liveLink.sessionId;
					if (String(visible) !== String(target.sessionId)) {
						opened = openConversation(ctx, target.sessionId);
					}
				}
				// A new trip gets a new conversation. If one cannot be created we do
				// not fall back to whatever is open -- that is exactly the scatter
				// this is meant to prevent -- so the instruction is copied instead
				// and the reason is shown.
				if (fresh && ctx) {
					setStatus("creating");
					const made = await createConversation(ctx);
					if (!made.ok) {
						await copyText(text);
						setStatus("no-create:" + made.reason);
						return;
					}
					await new Promise((r) => setTimeout(r, 500));
					const byId = actionsFromService(ctx, made.id);
					const outcome2 = sendToAgent(
						byId || { actions: liveLink && liveLink.actions, sessionId: made.id },
						text
					);
					setStatus(outcome2 === "sent" || outcome2 === "inserted" ? "created" : outcome2);
					return;
				}
				outcome = sendToAgent(target, text);
				if ((outcome === "sent" || outcome === "inserted") && tripId && target && target.sessionId) {
					bindSession(tripId, target.sessionId);
				} else if (outcome !== "sent" && outcome !== "inserted") {
					const copied = await copyText(text);
					outcome = copied ? "copied" : outcome === "no-session" ? "no-session" : "failed";
				}
				setStatus(outcome === "sent" && opened ? "sent-switched" : outcome);
			};

			return h(
				react.Fragment,
				null,
				h(
					"div",
					{ className: "dsh-tripsy-chips", style: { marginTop: 12 } },
					h(
						"button",
						{
							className: "dsh-tripsy-primary",
							disabled: disabled || !text.trim(),
							onClick: () => submit("insert"),
							title: "直接发到对话里开始执行",
						},
						label || "发送并执行"
					),
					h(
						"button",
						{
							className: "dsh-tripsy-btn",
							disabled: disabled || !text.trim(),
							onClick: () => submit("copy"),
							title: "只在需要自己检查内容时用",
						},
						"复制指令"
					)
				),
				status
					? h(
							"div",
							{ className: "dsh-tripsy-sub", style: { marginTop: 10 } },
							status === "sent" || status === "sent-switched" || status === "created"
								? h(
										"span",
										{ className: "dsh-tripsy-ok" },
										status === "created"
											? "已新建对话并发送——这个行程会一直用这个新对话。"
											: status === "sent-switched"
												? "已切回这个行程的对话并发送——后续操作都会留在那里。"
												: "已发送——对话里会开始执行，进度在那边看。"
									)
								: status === "creating"
									? h("span", { className: "dsh-tripsy-sub" }, "正在新建对话…")
									: typeof status === "string" && status.indexOf("no-create:") === 0
										? h(
												"span",
												{ className: "dsh-tripsy-err" },
												"没能自动新建对话，所以**没有发送**（指令已复制到剪贴板）。原因：" +
													status.slice("no-create:".length) +
													"　请手动新建一个对话，再粘贴发送。"
											)
								: status === "inserted"
									? h("span", { className: "dsh-tripsy-ok" }, "已放入输入框——按回车发送即可。")
									: status === "copied"
										? h("span", { className: "dsh-tripsy-ok" }, "已复制到剪贴板——粘贴到对话里发送即可。")
										: status === "no-session"
											? h(
													"span",
													{ className: "dsh-tripsy-err" },
													"这里还没有可用的对话。请先在左侧新建或打开一个对话，再回来点这个按钮。"
												)
											: "没能写入输入框，请手动复制指令。"
						)
					: null,
				note || null
			);
		}

		/**
		 * Natural-language trip creation. The user describes the trip; the agent
		 * creates it and fills in a day-by-day itinerary with the MCP tools.
		 */
		function CreateTrip({ link, ctx }) {
			const [text, setText] = react.useState("");
			const instruction =
				"请用 Tripsy MCP 工具为我创建一份新的行程。\n\n我的想法：" +
				(text.trim() || "（在这里描述你想去哪、几天、和谁、什么偏好）") +
				"\n\n请按这个顺序做：\n" +
				"1. 先在 Tripsy 里建好行程本身：名称、起止日期、当地 IANA 时区；能设一张封面图就设一张。\n" +
				"2. 再按天补充具体活动（餐厅、景点、演出、逛街等），写清名称、地址与经纬度；时间用 UTC ISO-8601，并带上地点时区。\n" +
				"3. 需要的话补上住宿与交通；航班用 IATA 机场代码并给起降时区。\n" +
				"4. 每天不要排得太满，留出移动与休息时间。\n" +
				"5. 【价格】每加一条都要**查清实际价格并写入 price + currency**，不要留空：\n" +
				"   · 国内餐饮/景点/玩乐：用大众点评、美团、抖音团购、小红书查人均或票价\n" +
				"   · 国内交通：用 12306 查真实车次与票价；航班用航司官网或航旅纵横\n" +
				"   · 国外：用 Google Maps、Tripadvisor、Yelp、官网票价；交通用当地铁路/航司官网\n" +
				"   · 住宿：查同酒店同房型的实际房价\n" +
				"   · 大众点评/美团/12306 若抓不到（反爬严格），用携程/Trip.com、铁路航班查询站或官网代替，并注明实际来源\n" +
				"   每条都把「来源 + 查到的时间」写进 notes；确实查不到的，写一个区间并标注「估」，不要为了填满而编造出处。\n" +
				"6. 【班次】交通要给出**真实存在的**车次/航班号与时刻，不要写示例班次。\n" +
				"7. 全部完成后给我一份按天汇总：条目清单 + 每条的价格与来源 + 总花费（区分已确认与估算）。\n\n" +
				"如果我上面缺了关键信息（具体日期、城市、天数、人数），先问清楚再动手。";

			return h(
				"div",
				{ className: "dsh-tripsy-pad", style: { paddingTop: 16, paddingBottom: 24, maxWidth: 720 } },
				h("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 6 } }, "新建行程"),
				h(
					"div",
					{ className: "dsh-tripsy-sub", style: { marginBottom: 12, lineHeight: 1.7 } },
					"用一句话描述你想怎么玩，点下面的按钮就会直接开始建行程，不用再按回车。agent 会先建好行程，再按天把活动、住宿、交通和价格补进去。"
				),
				h("textarea", {
					className: "dsh-tripsy-field",
					rows: 5,
					value: text,
					placeholder:
						"例如：11 月中旬去大阪玩 4 天，两个人，想多吃当地小店、逛逛二手店，预算中等，住难波附近。",
					onChange: (e) => setText(e.target.value),
				}),
				h(ComposerActions, {
					ctx,
					link,
					fresh: true,
					text: instruction,
					disabled: !text.trim(),
					label: "生成行程并发送",
					note: h(
						"div",
						{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.7 } },
						"为什么不是插件直接建？",
						h("br"),
						"建行程会在你的账号里写入多条真实数据。交回对话，agent 会先问清缺的信息、边做边报告，你也能随时喊停。"
					),
				})
			);
		}

		function ManageTab({ trip, detail, link, prefill, ctx }) {
			const [text, setText] = react.useState(prefill || "");

			react.useEffect(() => {
				if (prefill) setText(prefill);
			}, [prefill]);

			const name = trip?.name || "";
			const tripId = trip?.id;
			const tz = trip?.timezone || detail?.trip?.timezone || "";
			const instruction =
				"在 Tripsy 的「" + name + "」行程（id " + tripId + "，时区 " + tz + "）里：" +
				(text.trim() || "（在这里写你想做的改动）") +
				"\n请先用一句话复述你打算改什么和影响哪几条，我确认后再执行。";

			return h(
				"div",
				{ className: "dsh-tripsy-pad", style: { paddingTop: 16, paddingBottom: 24, maxWidth: 720 } },
				h(
					"div",
					{ className: "dsh-tripsy-chips" },
					[
						"加一个餐厅：",
						"加一个景点：",
						"改一下这条的时间：",
						"删掉这条：",
						"这个行程花了多少钱？",
					].map((c) =>
						h(
							"button",
							{ key: c, className: "dsh-tripsy-chip", onClick: () => setText((t) => (t ? t + " " + c : c)) },
							c
						)
					)
				),
				h("textarea", {
					className: "dsh-tripsy-field",
					rows: 5,
					value: text,
					placeholder: "用中文描述你想对这个行程做什么，例如：10 月 14 日晚上 7 点在大阪加一家寿司店，地址在道顿堀。",
					onChange: (e) => setText(e.target.value),
				}),
				h(ComposerActions, {
					ctx,
					link,
					tripId,
					text: instruction,
					disabled: !tripId,
					label: "发送并执行",
					note: h(
						"div",
						{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.7 } },
						"为什么是「发回对话」而不是插件直接改？",
						h("br"),
						"改行程是不能撤销的真实操作。交回对话，agent 会先复述改动、必要时用工具核对，你也能看到每一步——比面板上点一下就写进你的账号安全得多。"
					),
				})
			);
		}

		function TripsyPanelPage(props) {
			const [tab, setTab] = react.useState("browse");
			const [health, setHealth] = react.useState(null);
			const [trips, setTrips] = react.useState(null);
			const [selected, setSelected] = react.useState(null);
			const [detail, setDetail] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [loginUrl, setLoginUrl] = react.useState(null);
			const [prefill, setPrefill] = react.useState("");
			// "New trip" is a peer of picking a trip, not a third tab: the two
			// modules below belong to one trip and only make sense once it exists.
			const [creating, setCreating] = react.useState(false);
			// The ICS tutorial is shown on demand next to the export button.
			const [icsHelp, setIcsHelp] = react.useState(false);
			const [icsNote, setIcsNote] = react.useState(null);
			const [icsError, setIcsError] = react.useState(null);
			const [convOpen, setConvOpen] = react.useState(false);
			// Onboarding: the address comes from Tripsy's own app, so it is an
			// input the user owns rather than a constant baked into the plugin.
			const [urlInput, setUrlInput] = react.useState(DEFAULT_MCP_URL);
			const [connecting, setConnecting] = react.useState(false);
			const [connectError, setConnectError] = react.useState(null);
			const [endpoint, setEndpoint] = react.useState(null);

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

			/** Paste the URL from Tripsy's app: discover the endpoints, then authorize. */
			const connect = async (url) => {
				setConnecting(true);
				setConnectError(null);
				setError(null);
				try {
					const info = await postJson(API + "/connect", { url });
					if (info.endpoint) setEndpoint(info.endpoint);
					if (info.error) setConnectError(info.error);
					else setLoginUrl(info.authUrl || null);
				} catch (e) {
					setConnectError(e.message);
				} finally {
					setConnecting(false);
				}
			};

			const reauthorize = async () => {
				setBusy(true);
				setError(null);
				try {
					const info = await postJson(API + "/login");
					if (info.error) setError(info.error);
					else setLoginUrl(info.authUrl || null);
				} catch (e) {
					setError(e.message);
				} finally {
					setBusy(false);
				}
			};

			const disconnect = async () => {
				try {
					await postJson(API + "/disconnect");
				} catch {}
				setEndpoint(null);
				setTrips(null);
				setSelected(null);
				setDetail(null);
				setLoginUrl(null);
				await loadHealth();
			};

			const loggedIn = Boolean(health && health.auth && health.auth.loggedIn);
			const currentTrip = (trips || []).find((t) => String(t.id) === String(selected)) || null;
			// Which conversation this trip's edits belong to: its own binding if it
			// has one, else the best title match, else whatever is open.
			const boundForTrip = selected ? boundSession(selected) : null;
			const suggested = currentTrip ? suggestSession(props && props.ctx, currentTrip) : null;
			const targetSession = boundForTrip || (suggested ? suggested.id : null);
			const boundTitle = (() => {
				if (!targetSession) return null;
				const found = listConversations(props && props.ctx).find((s) => String(s.id) === String(targetSession));
				return found ? found.title : String(targetSession).slice(0, 8);
			})();
			// Resolved once per render: the conversation this trip owns, else the
			// one this panel is sitting next to. Checked at render so the user is
			// warned before clicking rather than discovering it afterwards.
			const link = resolveInput(props && props.ctx, props, targetSession);
			const canSend = Boolean(link);
			// The capture entry learns the composer's props on its own render, which
			// may land after this one. Re-render a few times until it does, then
			// stop -- so the notice disappears without a manual refresh and without
			// a permanent polling loop.
			const [, retick] = react.useState(0);
			react.useEffect(() => {
				if (!loggedIn || canSend) return undefined;
				const timer = setTimeout(() => retick((n) => (n + 1) % 1000), 1200);
				return () => clearTimeout(timer);
			}, [loggedIn, canSend, selected]);
			const connectedTo =
				(health && health.auth && (health.auth.resourceName || health.auth.resource)) || null;

			const head = h(
				"div",
				{ className: "dsh-tripsy-head" },
				h("h2", { className: "dsh-tripsy-title" }, "Tripsy"),
				h(
					"span",
					{ className: "dsh-tripsy-sub dsh-tripsy-clip" },
					loggedIn
						? [trips ? trips.length + " 个行程" : "已连接", connectedTo].filter(Boolean).join(" · ")
						: "未连接"
				),
				h("span", { className: "dsh-tripsy-spacer" }),
				loggedIn
					? h(
							react.Fragment,
							null,
							h(
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
							),
							h(
								"button",
								{
									className: "dsh-tripsy-btn",
									style: { marginLeft: 8 },
									onClick: disconnect,
									title: "清除本地凭据，之后可以粘贴另一个地址",
								},
								"断开"
							)
						)
					: null
			);

			if (!loggedIn) {
				const authorizing = Boolean(loginUrl);
				return h(
					"div",
					{ className: "dsh-tripsy-root" },
					head,
					h(
						"div",
						{ className: "dsh-tripsy-pad", style: { paddingTop: 20, maxWidth: 640 } },
						h(
							"div",
							{ className: "dsh-tripsy-card", style: { margin: 0, padding: "16px 18px" } },
							h("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 10 } }, "连接 Tripsy"),
							authorizing
								? h(
										"div",
										null,
										h("div", { style: { fontWeight: 600, marginBottom: 6 } }, "② 在浏览器里完成授权"),
										h(
											"div",
											{ className: "dsh-tripsy-sub" },
											"已打开授权页。同意后这个面板会自动接上，不用手动刷新。"
										),
										loginUrl
											? h(
													"div",
													{ style: { marginTop: 12 } },
													h("div", { className: "dsh-tripsy-sub" }, "浏览器没自动打开？手动访问："),
													h("a", { className: "dsh-tripsy-link", href: loginUrl, target: "_blank", rel: "noreferrer" }, loginUrl)
												)
											: null
									)
								: h(
										"div",
										null,
										h(
											"div",
											{ className: "dsh-tripsy-sub", style: { marginBottom: 8 } },
											"从 Tripsy App 里复制 MCP 地址："
										),
										h(
											"ol",
											{ style: { margin: "0 0 12px", paddingLeft: 20, lineHeight: 2 } },
											h("li", null, "打开 Tripsy App，进入任一「行程」"),
											h("li", null, "点右上角 ··· → 「连接到 Claude / MCP」"),
											h("li", null, "复制页面上那条地址，粘贴到下面")
										),
										h("input", {
											className: "dsh-tripsy-field",
											type: "url",
											value: urlInput,
											spellCheck: false,
											placeholder: "https://mcp.tripsy.app",
											onChange: (e) => {
												setUrlInput(e.target.value);
												setConnectError(null);
											},
											onKeyDown: (e) => {
												if (e.key === "Enter" && urlInput.trim()) connect(urlInput.trim());
											},
										}),
										h(
											"div",
											{ className: "dsh-tripsy-chips", style: { marginTop: 12 } },
											h(
												"button",
												{
													className: "dsh-tripsy-btn",
													disabled: connecting || !urlInput.trim(),
													onClick: () => connect(urlInput.trim()),
												},
												connecting ? "正在连接…" : "连接并授权"
											),
											urlInput.trim() !== DEFAULT_MCP_URL
												? h(
														"button",
														{
															className: "dsh-tripsy-chip",
															onClick: () => {
																setUrlInput(DEFAULT_MCP_URL);
																setConnectError(null);
															},
														},
														"用官方地址"
													)
												: null
										),
										h(
											"div",
											{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.8 } },
											"「连接并授权」会打开浏览器做一次 OAuth 授权；之后访问令牌自动续期，不用再管。",
											h("br"),
											"插件不索取账号密码，本地凭据文件里的令牌也不会发到浏览器。"
										)
									),
							connectError
								? h("div", { className: "dsh-tripsy-err", style: { marginTop: 12 } }, connectError)
								: null,
							error ? h("div", { className: "dsh-tripsy-err", style: { marginTop: 8 } }, error) : null
						)
					)
				);
			}

			const list = (trips || []).map((t) =>
				h(
					"button",
					{
						key: t.id,
						className:
							"dsh-tripsy-item" + (!creating && String(selected) === String(t.id) ? " on" : ""),
						onClick: () => {
							setCreating(false);
							setSelected(t.id);
						},
					},
					h("span", { className: "dsh-tripsy-item-name" }, t.name || "(未命名行程)"),
					h("span", { className: "dsh-tripsy-item-dates" }, tripDates(t))
				)
			);

			// Browsing and AI management live inside a trip: pick one, then choose.
			const tripTabs = h(
				"div",
				{ className: "dsh-tripsy-tabs" },
				[
					["browse", "行程浏览"],
					["manage", "AI 管理"],
				].map(([id, label]) =>
					h(
						"button",
						{
							key: id,
							className: "dsh-tripsy-tab",
							"data-active": tab === id ? "" : undefined,
							onClick: () => setTab(id),
						},
						label
					)
				)
			);

			const detailPane = creating
				? h(CreateTrip, { link, ctx: props && props.ctx })
				: !selected
					? h("div", { className: "dsh-tripsy-empty" }, "从左边选一个行程，或点「＋ 新建行程」")
					: !detail
						? h("div", { className: "dsh-tripsy-empty" }, "加载中…")
						: h(
								react.Fragment,
								null,
								h(
									"div",
									{ className: "dsh-tripsy-triphead" },
									h("span", { className: "dsh-tripsy-tripname" }, currentTrip ? currentTrip.name : ""),
									h("span", { className: "dsh-tripsy-sub dsh-tripsy-clip" }, currentTrip ? tripDates(currentTrip) : ""),
									h("span", { className: "dsh-tripsy-spacer" }),
									h(
										"button",
										{
											className: "dsh-tripsy-btn",
											title: "这个行程的改动会发到这个对话",
											onClick: () => setConvOpen((v) => !v),
										},
										"对话：" + (boundTitle || "未绑定") + (convOpen ? " ▴" : " ▾")
									),
									h(
										"button",
										{
											className: "dsh-tripsy-btn",
											onClick: async () => {
												setIcsHelp(true);
												setIcsNote(null);
												setIcsError(null);
												try {
													const r = await downloadIcs(selected);
													setIcsNote(
														"已保存 " +
															r.name +
															(r.events ? "（含 " + r.events + " 条日程）" : "") +
															(r.skipped && r.skipped !== "0" ? "，" + r.skipped + " 条没有时间已跳过" : "")
													);
												} catch (e) {
													setIcsError(e.message || String(e));
												}
											},
											title: "下载 .ics，再导入到 iPhone 日历",
										},
										"导出到日历"
									),
									h(
										"button",
										{
											className: "dsh-tripsy-btn",
											style: { marginLeft: 8 },
											onClick: () => setIcsHelp((v) => !v),
											title: "怎么把它导进 iPhone 日历",
										},
										icsHelp ? "收起教程" : "教程"
									)
								),
								convOpen
									? h(ConversationPicker, {
											ctx: props && props.ctx,
											current: targetSession,
											suggested,
											onPick: (id) => {
												if (currentTrip) bindSession(currentTrip.id, id);
												openConversation(props && props.ctx, id);
												setConvOpen(false);
											},
											onClose: () => setConvOpen(false),
										})
									: null,
								icsHelp ? h(IcsHelp, { note: icsNote, error: icsError }) : null,
								tripTabs,
								tab === "browse"
									? h(BrowseTab, {
											detail,
											link,
											ctx: props && props.ctx,
											onIntent: (tpl) => {
												setPrefill(tpl);
												setTab("manage");
											},
										})
										: h(ManageTab, { trip: currentTrip, detail, link, prefill, ctx: props && props.ctx })
							);

			return h(
				"div",
				{ className: "dsh-tripsy-root" },
				head,
				loggedIn && !canSend
					? h(
							"div",
							{ className: "dsh-tripsy-notice" },
							"这个面板还没连到对话。请先在左侧新建或打开一个对话，「发送」按钮才能直接执行；在那之前它只能把指令复制到剪贴板。"
						)
					: null,
				error
					? h(
							"div",
							{ className: "dsh-tripsy-err", style: { padding: "8px 20px 0" } },
							error,
							h(
								"button",
								{
									className: "dsh-tripsy-btn",
									style: { marginLeft: 10 },
									disabled: busy,
									onClick: reauthorize,
								},
								"重新授权"
							)
						)
					: null,
				h(
					"div",
					{ className: "dsh-tripsy-main" },
					h(
						"div",
						{ className: "dsh-tripsy-list" },
						h(
							"button",
							{
								className: "dsh-tripsy-item dsh-tripsy-newtrip" + (creating ? " on" : ""),
								onClick: () => {
									setCreating(true);
									setSelected(null);
								},
							},
							h("span", { className: "dsh-tripsy-item-name" }, "＋ 新建行程"),
							h("span", { className: "dsh-tripsy-item-dates" }, "用一句话让 AI 生成行程")
						),
						trips === null ? h("div", { className: "dsh-tripsy-empty" }, "加载中…") : null,
						trips && !trips.length ? h("div", { className: "dsh-tripsy-empty" }, "还没有行程") : null,
						list
					),
					h("div", { className: "dsh-tripsy-detail" }, detailPane)
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
						{ name: "sidebar.panellist", id: PANEL_ID, order: PANEL_ORDER, label: () => "Tripsy" },
						TripsyPanelIcon
					)
				)
			);
			disposers.push(
				slots.inject("main", () =>
					slots.register({ name: "main", key: PANEL_ID, inject: () => ({ ctx }) }, TripsyPanelPage)
				)
			);
			// Learn which conversation is current, and get hold of its InputActions.
			//
			// `inputActions` is published through the provide channel to slot
			// entries and is never a service, so `ctx.get("uiSession")` cannot
			// reach it -- which is why the panel could only copy for so long. It
			// arrives as a standard prop, and only for slots whose declaration
			// lists it; render nothing and the composer is untouched. Several
			// candidate list slots are tried because the declaration could not be
			// read off the shipped bundle with certainty; a slot that does not
			// exist simply never activates.
			for (const slotName of CAPTURE_SLOTS) {
				disposers.push(
					slots.inject(slotName, () =>
						slots.register(
							{ name: slotName, id: "tripsy-capture", order: 900, inject: () => ({}) },
							TripsyCapture
						)
					)
				);
			}
			// The clients the panel needs are session- and workspace-scoped
			// services that this plugin's own context cannot read directly. Both
			// injections are optional by construction: a service that never
			// resolves skips only its own callback.
			disposers.push(
				ctx.inject(["sessions"], (scope) => {
					services.sessions = scope.get("sessions") || scope.sessions || null;
					services.notes.push("sessions 注入成功");
					return () => {
						services.sessions = null;
					};
				})
			);
			disposers.push(
				ctx.inject(["uiWorkspace"], (scope) => {
					services.workspace = scope.get("uiWorkspace") || null;
					services.notes.push("uiWorkspace 注入成功");
					return () => {
						services.workspace = null;
					};
				})
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
