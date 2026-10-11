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
.dsh-tripsy-preview{margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;white-space:pre-wrap;word-break:break-word}
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
		function costSummary(detail) {
			const buckets = new Map();
			const add = (label, price, currency) => {
				const n = Number(price);
				if (!Number.isFinite(n) || n === 0) return;
				const key = label + "|" + (currency || "");
				const row = buckets.get(key) || { label, currency: currency || "", total: 0 };
				row.total += n;
				buckets.set(key, row);
			};
			for (const a of detail?.activities || []) {
				const t = a.activity_type || "";
				const label =
					t === "restaurant" ? "餐厅" : t === "bar" || t === "nightlife" ? "酒吧" :
					t === "cafe" || t === "bakery" ? "咖啡烘焙" : t === "shopping" ? "购物" :
					t === "museum" || t === "theater" || t === "concert" ? "门票" : "其他";
				add(label, a.price, a.currency);
			}
			for (const x of detail?.hostings || []) add("住宿", x.price, x.currency);
			for (const t of detail?.transportations || []) {
				add(t.transportation_type === "airplane" ? "航班" : "交通", t.price, t.currency);
			}
			const rows = [...buckets.values()].sort((a, b) => b.total - a.total);
			const currency = rows[0]?.currency || "";
			const total = rows.filter((r) => r.currency === currency).reduce((sum, r) => sum + r.total, 0);
			return { rows, total, currency };
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
		 * Hand a composed instruction to the DSH composer.
		 *
		 * `ui-conversation` supplies `inputActions` as a standard prop and exposes
		 * `insertText(text, span)` for one undoable plain-text edit. The seam is
		 * optional and revision-guarded, so every lookup is defensive and a
		 * clipboard copy is the always-available fallback: the feature must not
		 * depend on an internal surface staying put between harness versions.
		 */
		function insertIntoComposer(ctx, text) {
			try {
				const faces = [
					ctx && ctx.get ? ctx.get("uiSession") : null,
					ctx && ctx.get ? ctx.get("uiConversation") : null,
					ctx && ctx.uiSession,
					ctx && ctx.uiConversation,
				];
				for (const face of faces) {
					const actions = face && (face.inputActions || (face.input && face.input.actions));
					if (!actions?.insertText) continue;
					const span = actions.captureInsertion ? actions.captureInsertion() : undefined;
					actions.insertText(text, span);
					return "inserted";
				}
			} catch {}
			return null;
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

		function BrowseTab({ detail, onIntent, ctx }) {
			// Hooks run before the early return so the order is stable.
			const [costOpen, setCostOpen] = react.useState(false);
			if (!detail) return h("div", { className: "dsh-tripsy-empty" }, "从左边选一个行程");
			const trip = detail.trip || {};
			const groups = buildTimeline(detail);
			const costs = costSummary(detail);
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
				costs.rows.length
					? h(
							Card,
							{
								title: "费用概览",
								right: h(
									"button",
									{
										className: "dsh-tripsy-btn",
										onClick: () => setCostOpen((v) => !v),
										title: "让 AI 把没有价格的条目也估出来，得到一份完整预算",
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
											text: (detail.costs && detail.costs.prompt) || "",
											note: detail.costs
												? h(
														"div",
														{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.8 } },
														"上面只统计了**已经填了价格**的 " +
															detail.costs.pricedCount +
															" 条；还有 " +
															detail.costs.missingCount +
															" 条没有价格。这条指令会把两者都交给 AI，让它按城市和类型补出估算，并注明依据。它不会改动你的行程。"
													)
												: h(
														"div",
														{ className: "dsh-tripsy-err", style: { padding: "10px 14px" } },
														"费用汇总尚未就绪——插件宿主半可能还没重新加载，重启一次 DSH 再试。"
													),
										})
									: null,
								costs.rows.map((r) =>
									h(
										"div",
										{ key: r.label + r.currency, className: "dsh-tripsy-money-row" },
										h("span", { className: "dsh-tripsy-money-label" }, r.label),
										h("span", { className: "dsh-tripsy-money-value" }, money(r.total, r.currency))
									)
								)
							)
						)
					: null,
				costs.total
					? h(
							"div",
							{ className: "dsh-tripsy-money-row", style: { padding: "10px 20px" } },
							h("span", { className: "dsh-tripsy-money-label dsh-tripsy-money-total" }, "总计"),
							h("span", { className: "dsh-tripsy-money-value dsh-tripsy-money-total" }, money(costs.total, costs.currency))
						)
					: null
			);
		}

		/**
		 * The shared "hand this to the agent" control.
		 *
		 * The panel never writes to the account itself: it composes an instruction
		 * and puts it in the conversation, where the agent confirms what it is
		 * about to change and does the work with the Tripsy MCP tools.
		 */
		function ComposerActions({ ctx, text, disabled, note }) {
			const [status, setStatus] = react.useState(null);

			react.useEffect(() => {
				setStatus(null);
			}, [text]);

			const submit = async (mode) => {
				let outcome = null;
				if (mode !== "copy") outcome = insertIntoComposer(ctx, text);
				if (outcome !== "inserted") {
					const copied = await copyText(text);
					outcome = copied ? "copied" : "failed";
				}
				setStatus(outcome);
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
							className: "dsh-tripsy-btn",
							disabled: disabled || !text.trim(),
							onClick: () => submit("insert"),
							title: "把这段指令放进对话输入框，确认后回车发送",
						},
						"放入对话框"
					),
					h(
						"button",
						{
							className: "dsh-tripsy-btn",
							disabled: disabled || !text.trim(),
							onClick: () => submit("copy"),
						},
						"复制指令"
					)
				),
				status
					? h(
							"div",
							{ className: "dsh-tripsy-sub", style: { marginTop: 10 } },
							status === "inserted"
								? h("span", { className: "dsh-tripsy-ok" }, "已放入对话输入框——确认无误后按回车发送。")
								: status === "copied"
									? h("span", { className: "dsh-tripsy-ok" }, "已复制到剪贴板——粘贴到对话里发送即可。")
									: "没能写入输入框，请手动复制下面的指令。"
						)
					: null,
				h("div", { className: "dsh-tripsy-preview" }, text),
				note || null
			);
		}

		/**
		 * Natural-language trip creation. The user describes the trip; the agent
		 * creates it and fills in a day-by-day itinerary with the MCP tools.
		 */
		function CreateTrip({ ctx }) {
			const [text, setText] = react.useState("");
			const instruction =
				"请用 Tripsy MCP 工具为我创建一份新的行程。\n\n我的想法：" +
				(text.trim() || "（在这里描述你想去哪、几天、和谁、什么偏好）") +
				"\n\n请按这个顺序做：\n" +
				"1. 先在 Tripsy 里建好行程本身：名称、起止日期、当地 IANA 时区；能设一张封面图就设一张。\n" +
				"2. 再按天补充具体活动（餐厅、景点、演出、逛街等），写清名称、地址与经纬度；时间用 UTC ISO-8601，并带上地点时区。\n" +
				"3. 需要的话补上住宿与交通；航班用 IATA 机场代码并给起降时区。\n" +
				"4. 每天不要排得太满，留出移动与休息时间；不确定的信息不要编造，宁可不写。\n" +
				"5. 全部完成后给我一份按天汇总，并说明一共写了哪些条目。\n\n" +
				"如果我上面缺了关键信息（具体日期、城市、天数、人数），先问清楚再动手。";

			return h(
				"div",
				{ className: "dsh-tripsy-pad", style: { paddingTop: 16, paddingBottom: 24, maxWidth: 720 } },
				h("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 6 } }, "新建行程"),
				h(
					"div",
					{ className: "dsh-tripsy-sub", style: { marginBottom: 12, lineHeight: 1.7 } },
					"用一句话描述你想怎么玩。agent 会先建好行程，再按天把活动、住宿和交通补进去。"
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
					text: instruction,
					disabled: !text.trim(),
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

		function ManageTab({ trip, detail, ctx, prefill }) {
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
					text: instruction,
					disabled: !tripId,
					note: h(
						"div",
						{ className: "dsh-tripsy-sub", style: { marginTop: 12, lineHeight: 1.7 } },
						"为什么是「放进对话框」而不是插件直接改？",
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
				? h(CreateTrip, { ctx: props && props.ctx })
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
								icsHelp ? h(IcsHelp, { note: icsNote, error: icsError }) : null,
								tripTabs,
								tab === "browse"
									? h(BrowseTab, {
											detail,
											ctx: props && props.ctx,
											onIntent: (tpl) => {
												setPrefill(tpl);
												setTab("manage");
											},
										})
									: h(ManageTab, { trip: currentTrip, detail, ctx: props && props.ctx, prefill })
							);

			return h(
				"div",
				{ className: "dsh-tripsy-root" },
				head,
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
