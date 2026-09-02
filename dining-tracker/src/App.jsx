import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UCLA Academic Calendar
// ─────────────────────────────────────────────────────────────────────────────
const QUARTERS = [
  { name: "Fall 2026",   start: "2026-09-21", end: "2026-12-11" },
  { name: "Winter 2027", start: "2027-01-04", end: "2027-03-19" },
  { name: "Spring 2027", start: "2027-03-24", end: "2027-06-11" },
  { name: "Fall 2027",   start: "2027-09-20", end: "2027-12-10" },
  { name: "Winter 2028", start: "2028-01-04", end: "2028-03-17" },
  { name: "Spring 2028", start: "2028-03-22", end: "2028-06-09" },
];

const SWIPE_VALUE = 16.50;

// ─────────────────────────────────────────────────────────────────────────────
// Meal Plans — all 6 UCLA options
// Premier (P): meals roll over week-to-week within a quarter.
// Regular (R): no rollover; strict weekly reset; one entry per meal period.
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_PLANS = {
  "19P": { label: "19 Premier", weekly: 19, premier: true  },
  "19R": { label: "19 Regular", weekly: 19, premier: false },
  "14P": { label: "14 Premier", weekly: 14, premier: true  },
  "14R": { label: "14 Regular", weekly: 14, premier: false },
  "11P": { label: "11 Premier", weekly: 11, premier: true  },
  "11R": { label: "11 Regular", weekly: 11, premier: false },
};
const DEFAULT_PLAN = "19P";

const DEFAULT_LOCATIONS = [
  "De Neve","Epicuria at Covel","Bruin Plate","Rendezvous",
  "The Study at Hedrick","Bruin Café","Café 1919",
  "Epic at Ackerman","Northern Lights Café","Anderson Café","Luvalle Commons",
];

const MEAL_PERIODS = ["Breakfast", "Lunch", "Dinner", "Late Night"];

const COMMON_FOODS = [
  "Pizza","Pasta","Salad","Burger","Tacos","Sushi",
  "Stir Fry","Soup","Sandwich","Grilled Chicken",
  "Veggie Bowl","Ramen","Waffles","Omelette","Steak",
  "Smoothie","Coffee","Bagel","Acai Bowl","Fries",
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles — defined early so all components can reference them
// ─────────────────────────────────────────────────────────────────────────────
const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
};
const modalStyle = {
  background: "#fff", borderRadius: "20px 20px 0 0",
  padding: "24px 20px 32px", width: "100%", maxWidth: 480,
  maxHeight: "87vh", display: "flex", flexDirection: "column",
};
const chipGrid = { display: "flex", flexWrap: "wrap", gap: 8 };
const chipStyle = (active, dashed = false) => ({
  border: dashed ? "1.5px dashed #bbb" : active ? "2px solid #2774AE" : "1.5px solid #e5e5e5",
  background: active ? "#eef5fb" : "#fff",
  color: active ? "#2774AE" : dashed ? "#888" : "#444",
  borderRadius: 20, padding: "7px 14px", fontSize: 13, cursor: "pointer",
  fontWeight: active ? 600 : 400, transition: "all .15s",
});
const fieldLabel = { fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: .5, marginBottom: 10, marginTop: 0 };
const primaryBtnStyle = {
  background: "#2774AE", color: "#fff", border: "none", borderRadius: 12,
  padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: "pointer",
};
const ghostBtnStyle = { background: "none", border: "none", cursor: "pointer", color: "#888", padding: 0, fontFamily: "inherit" };
const inputStyle = {
  border: "1.5px solid #e5e5e5", borderRadius: 10, padding: "10px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const addBtnStyle = {
  background: "#2774AE", color: "#fff", border: "none", borderRadius: 10,
  padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const tagStyle = {
  background: "#eef5fb", color: "#2774AE", borderRadius: 16, padding: "4px 10px", fontSize: 12, fontWeight: 500,
};
const cardStyle = {
  background: "#fff", borderRadius: 14, padding: "15px 16px", boxShadow: "0 1px 5px rgba(0,0,0,.07)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Responsive breakpoint hook
// ─────────────────────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1100,
    isDesktop: width >= 1100,
    width,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar helpers
// ─────────────────────────────────────────────────────────────────────────────
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function dateStr(date = new Date()) {
  return new Date(date).toISOString().split("T")[0];
}

function getActiveQuarter(date = new Date()) {
  const ds = dateStr(date);
  return QUARTERS.find(q => ds >= q.start && ds <= q.end) || null;
}

function weeksInQuarter(quarter) {
  const weeks = [];
  const end = new Date(quarter.end);
  let cur = new Date(getWeekStart(new Date(quarter.start)));
  while (cur <= end) {
    weeks.push(cur.toISOString().split("T")[0]);
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

// Premier rollover: accumulates unused swipes across weeks within a quarter
function computeRollover(meals, weeklySwipes) {
  const today = new Date();
  const curWeek = getWeekStart(today);
  let bank = 0;
  for (const quarter of QUARTERS) {
    const weeks = weeksInQuarter(quarter);
    for (const weekStart of weeks) {
      if (weekStart >= curWeek) break;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const used = meals.filter(m => {
        const d = new Date(m.timestamp);
        return d >= new Date(weekStart) && d < weekEnd;
      }).length;
      bank = Math.max(0, weeklySwipes + bank - used);
    }
    if (new Date(quarter.end) < today) continue;
    break;
  }
  return bank;
}

// Total quarter meals used & remaining (Premier only)
function computeQuarterStats(meals, weeklySwipes) {
  const today = new Date();
  const quarter = getActiveQuarter(today);
  if (!quarter) return null;
  const weeks = weeksInQuarter(quarter);
  const totalQuarter = weeks.length * weeklySwipes;
  const used = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(quarter.start) && d <= new Date(quarter.end + "T23:59:59");
  }).length;
  return { totalQuarter, used, remaining: Math.max(0, totalQuarter - used), quarter };
}

// Regular: meals this week (no rollover). Returns swipes left this week only.
function computeRegularWeekly(meals, weeklySwipes) {
  const curWeek = getWeekStart();
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const used = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  return { used, left: Math.max(0, weeklySwipes - used) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "ucla_dining_v4";
function load() {
  try {
    let raw = localStorage.getItem("ucla_dining_v4")
      || localStorage.getItem("ucla_dining_v3")
      || localStorage.getItem("ucla_dining_v2");
    if (!raw) return { meals: [], customLocations: [], mealPlan: DEFAULT_PLAN, rankings: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.mealPlan) parsed.mealPlan = DEFAULT_PLAN;
    if (!parsed.rankings) parsed.rankings = {};
    return parsed;
  } catch { return { meals: [], customLocations: [], mealPlan: DEFAULT_PLAN, rankings: {} }; }
}
function persist(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stars
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ value, onChange, size = 22 }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange?.(n)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default",
            color: n <= value ? "#FFB800" : "#ddd", userSelect: "none", lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Location Modal
// ─────────────────────────────────────────────────────────────────────────────
function AddLocationModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, padding: "28px 24px 28px", maxWidth: 460, borderRadius: 16, margin: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Add a location</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Café, food truck, off-campus spot — anything works.</div>
        <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onAdd(name.trim())}
          placeholder="e.g. Kerckhoff Coffee House"
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...ghostBtnStyle, flex: 1, border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "11px 0" }}>Cancel</button>
          <button disabled={!name.trim()} onClick={() => onAdd(name.trim())}
            style={{ ...primaryBtnStyle, flex: 2, opacity: name.trim() ? 1 : 0.4 }}>Add location</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Meal Modal
// ─────────────────────────────────────────────────────────────────────────────
function LogModal({ onClose, onSave, allLocations, onAddLocation, isDesktop, editMeal = null }) {
  const isEditing = !!editMeal;
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(editMeal?.location || "");
  const [period, setPeriod] = useState(editMeal?.period || (() => {
    const h = new Date().getHours();
    if (h < 11) return "Breakfast";
    if (h < 15) return "Lunch";
    if (h < 20) return "Dinner";
    return "Late Night";
  })());
  const [foods, setFoods] = useState(editMeal?.foods || []);
  const [customFood, setCustomFood] = useState("");
  const [rating, setRating] = useState(editMeal?.rating || 0);
  const [note, setNote] = useState(editMeal?.note || "");
  const [showAddLoc, setShowAddLoc] = useState(false);
  const customFoodRef = useRef();

  useEffect(() => { if (step === 2) customFoodRef.current?.focus(); }, [step]);

  function toggleFood(f) { setFoods(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]); }
  function addCustomFood() {
    const t = customFood.trim();
    if (t && !foods.includes(t)) setFoods(p => [...p, t]);
    setCustomFood("");
  }

  const canNext1 = location && period;
  const canNext2 = foods.length > 0;
  const stepLabels = isEditing
    ? ["EDIT LOCATION & TIME", "EDIT FOODS", "EDIT RATING & NOTES"]
    : ["WHERE & WHEN", "WHAT DID YOU EAT", "HOW WAS IT"];

  // On desktop, modal is centered and floats
  const desktopModalOverride = isDesktop ? {
    borderRadius: 16, maxWidth: 560, margin: "auto",
    maxHeight: "80vh", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
  } : {};
  const desktopOverlayOverride = isDesktop ? {
    alignItems: "center",
  } : {};

  return (
    <>
      <div style={{ ...overlayStyle, ...desktopOverlayOverride }}>
        <div style={{ ...modalStyle, ...desktopModalOverride }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: "#2774AE", fontWeight: 700, marginBottom: 6 }}>
                {stepLabels[step - 1]}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[1,2,3].map(s => (
                  <div key={s} style={{ width: 24, height: 3, borderRadius: 2,
                    background: s <= step ? "#2774AE" : "#e5e5e5", transition: "background .2s" }} />
                ))}
              </div>
            </div>
            <button onClick={onClose} style={{ ...ghostBtnStyle, fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>

          {step === 1 && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={fieldLabel}>Dining location</div>
              <div style={chipGrid}>
                {allLocations.map(loc => (
                  <button key={loc} onClick={() => setLocation(loc)} style={chipStyle(location === loc)}>{loc}</button>
                ))}
                <button onClick={() => setShowAddLoc(true)} style={chipStyle(false, true)}>+ Add location</button>
              </div>
              <div style={{ ...fieldLabel, marginTop: 20 }}>Meal period</div>
              <div style={chipGrid}>
                {MEAL_PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={chipStyle(period === p)}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={fieldLabel}>Tap what you ate</div>
              <div style={chipGrid}>
                {COMMON_FOODS.map(f => (
                  <button key={f} onClick={() => toggleFood(f)} style={chipStyle(foods.includes(f))}>{f}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input ref={customFoodRef} value={customFood}
                  onChange={e => setCustomFood(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomFood()}
                  placeholder="Something else…"
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addCustomFood} style={addBtnStyle}>Add</button>
              </div>
              {foods.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {foods.map(f => (
                    <span key={f} style={tagStyle}>
                      {f} <span onClick={() => toggleFood(f)} style={{ cursor: "pointer", opacity: .6 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ flex: 1 }}>
              <div style={fieldLabel}>Rate this meal</div>
              <Stars value={rating} onChange={setRating} size={38} />
              <div style={{ ...fieldLabel, marginTop: 20 }}>Notes (optional)</div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Best station, long line, something you'd order again…"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", height: 80, resize: "none" }} />
              <div style={{ marginTop: 14, padding: 14, background: "#f0f7ff", borderRadius: 10, fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                <strong>{location}</strong> · {period}<br />
                {fmtDate(new Date().toISOString())} · {fmtTime(new Date().toISOString())}<br />
                <span style={{ color: "#666" }}>{foods.join(", ")}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ ...ghostBtnStyle, flex: 1, border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "12px 0", fontSize: 14 }}>
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !canNext1 : !canNext2}
                style={{ ...primaryBtnStyle, flex: 2, opacity: (step === 1 ? !canNext1 : !canNext2) ? 0.4 : 1 }}>
                Next →
              </button>
            ) : (
              <button onClick={() => onSave({
                  id: editMeal?.id || Date.now(),
                  timestamp: editMeal?.timestamp || new Date().toISOString(),
                  location, period, foods, rating, note,
                })}
                style={{ ...primaryBtnStyle, flex: 2, background: "#27AE60" }}>
                {isEditing ? "Save changes ✓" : "Save meal ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
      {showAddLoc && (
        <AddLocationModal onClose={() => setShowAddLoc(false)}
          onAdd={name => { onAddLocation(name); setLocation(name); setShowAddLoc(false); }} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal Card
// ─────────────────────────────────────────────────────────────────────────────
function MealCard({ meal, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: "#fff", borderRadius: 12, padding: "13px 15px",
      marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,.07)", cursor: "pointer",
      transition: "box-shadow .15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{meal.location}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
            {meal.period} · {fmtDate(meal.timestamp)} · {fmtTime(meal.timestamp)}
          </div>
        </div>
        <Stars value={meal.rating} size={13} />
      </div>
      {meal.foods.length > 0 && (
        <div style={{ fontSize: 13, color: "#555", marginTop: 7, lineHeight: 1.4 }}>
          {open ? meal.foods.join(", ") : meal.foods.slice(0, 3).join(", ") + (meal.foods.length > 3 ? ` +${meal.foods.length - 3} more` : "")}
        </div>
      )}
      {open && meal.note && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 6, fontStyle: "italic" }}>"{meal.note}"</div>
      )}
      {open && (
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(meal); }}
            style={{ ...ghostBtnStyle, fontSize: 12, color: "#2774AE", fontWeight: 600 }}>✏ Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(meal.id); }}
            style={{ ...ghostBtnStyle, fontSize: 12, color: "#e74c3c" }}>Delete</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal Log Panel
// ─────────────────────────────────────────────────────────────────────────────
function MealLog({ meals, onDelete, onEdit, onLogNew, isDesktop }) {
  const grouped = {};
  meals.forEach(m => {
    const dk = m.timestamp.split("T")[0];
    if (!grouped[dk]) grouped[dk] = [];
    grouped[dk].push(m);
  });
  const sortedDays = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  return (
    <div style={{ position: "relative" }}>
      {sortedDays.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 20px", color: "#bbb" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🍽</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>No meals logged yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Hit the button below to track your first meal</div>
        </div>
      ) : sortedDays.map(dk => (
        <div key={dk}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: .5, margin: "16px 0 8px" }}>
            {fmtDate(dk + "T12:00:00")}
          </div>
          {grouped[dk].map(m => <MealCard key={m.id} meal={m} onDelete={onDelete} onEdit={onEdit} />)}
        </div>
      ))}

      {/* FAB — floats inside panel on desktop, fixed on mobile */}
      <button onClick={onLogNew} style={{
        ...(isDesktop ? {
          display: "flex", alignItems: "center", gap: 8,
          margin: "24px auto 0", position: "static", transform: "none",
          width: "fit-content",
        } : {
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
        }),
        background: "#2774AE", color: "#fff", border: "none", borderRadius: 30,
        padding: "13px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer",
        boxShadow: "0 4px 20px rgba(39,116,174,.45)", whiteSpace: "nowrap", zIndex: 20,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Log a meal
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Panel
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Meal Plan Selector
// ─────────────────────────────────────────────────────────────────────────────
function MealPlanSelector({ currentPlan, onChangePlan }) {
  const premiers = ["19P","14P","11P"];
  const regulars = ["19R","14R","11R"];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
        Select your UCLA dining plan. <strong>Premier</strong> plans let unused meals roll over week-to-week within the quarter. <strong>Regular</strong> plans reset every week with no rollover.
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#2774AE", fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>PREMIER PLANS</div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Unused meals roll over week to week within the quarter</div>
        {premiers.map(id => {
          const p = MEAL_PLANS[id];
          const active = currentPlan === id;
          return (
            <button key={id} onClick={() => onChangePlan(id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "12px 14px", marginBottom: 8,
              border: active ? "2px solid #2774AE" : "1.5px solid #e5e5e5",
              borderRadius: 10, background: active ? "#eef5fb" : "#fff",
              cursor: "pointer", textAlign: "left",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: active ? "#2774AE" : "#222" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{p.weekly} meals/week · rollover ✓</div>
              </div>
              {active && <span style={{ color: "#2774AE", fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>REGULAR PLANS</div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Weekly reset — unused meals do not carry over</div>
        {regulars.map(id => {
          const p = MEAL_PLANS[id];
          const active = currentPlan === id;
          return (
            <button key={id} onClick={() => onChangePlan(id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "12px 14px", marginBottom: 8,
              border: active ? "2px solid #666" : "1.5px solid #e5e5e5",
              borderRadius: 10, background: active ? "#f5f5f5" : "#fff",
              cursor: "pointer", textAlign: "left",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: active ? "#444" : "#222" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{p.weekly} meals/week · no rollover</div>
              </div>
              {active && <span style={{ color: "#666", fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stats({ meals, mealPlan }) {
  const plan = MEAL_PLANS[mealPlan] || MEAL_PLANS[DEFAULT_PLAN];
  const { weekly, premier } = plan;
  const today = new Date();
  const curWeek = getWeekStart(today);
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekUsed = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;

  // Premier: rollover bank + quarter totals
  const rollover = premier ? computeRollover(meals, weekly) : 0;
  const totalAvail = premier ? weekly + rollover : weekly;
  const swipesLeft = Math.max(0, totalAvail - thisWeekUsed);
  const quarterStats = premier ? computeQuarterStats(meals, weekly) : null;

  // Regular: strict weekly
  const regWeekly = !premier ? computeRegularWeekly(meals, weekly) : null;

  const activeQ = getActiveQuarter(today);

  const locRatings = {};
  meals.forEach(m => {
    if (m.rating > 0) {
      if (!locRatings[m.location]) locRatings[m.location] = [];
      locRatings[m.location].push(m.rating);
    }
  });
  const locAvg = Object.entries(locRatings)
    .map(([loc, rs]) => ({ loc, avg: rs.reduce((a,b) => a+b,0)/rs.length, count: rs.length }))
    .sort((a,b) => b.avg - a.avg);

  const byPeriod = {};
  MEAL_PERIODS.forEach(p => byPeriod[p] = meals.filter(m => m.period === p).length);

  const weekHistory = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const wk = getWeekStart(d);
    const wkEnd = new Date(wk); wkEnd.setDate(wkEnd.getDate() + 7);
    const used = meals.filter(m => { const md = new Date(m.timestamp); return md >= new Date(wk) && md < wkEnd; }).length;
    weekHistory.push({ wk, used, label: i === 0 ? "This week" : `${i}w ago` });
  }

  const alertColor = swipesLeft < 3 ? "#e74c3c" : "#2774AE";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {activeQ && (
        <div style={{ fontSize: 12, color: "#2774AE", fontWeight: 600, textAlign: "center", padding: "2px 0" }}>
          {activeQ.name} · ends {fmtDate(activeQ.end + "T12:00:00")} · <span style={{ color: "#888", fontWeight: 400 }}>{plan.label}</span>
        </div>
      )}

      {/* Weekly balance */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
          This week · {premier ? "swipe balance (w/ rollover)" : "swipes remaining"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: alertColor, lineHeight: 1 }}>{swipesLeft}</span>
          <span style={{ fontSize: 13, color: "#aaa" }}>
            left of {totalAvail}
            {premier && rollover > 0 ? ` (incl. ${rollover} rolled over)` : ""}
          </span>
        </div>
        <div style={{ margin: "10px 0 4px", height: 7, background: "#eee", borderRadius: 4 }}>
          <div style={{ height: "100%", borderRadius: 4, background: alertColor,
            width: `${totalAvail ? Math.min(100,(thisWeekUsed/totalAvail)*100) : 0}%`, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#bbb" }}>
          {thisWeekUsed} used this week · {premier ? "resets Monday, surplus rolls over" : "resets Monday — no rollover"}
        </div>
      </div>

      {/* Premier: quarter total */}
      {premier && quarterStats && (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>Quarter total · {quarterStats.quarter.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#2774AE" }}>{quarterStats.remaining}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>remaining</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#555" }}>{quarterStats.used}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>used</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#888" }}>{quarterStats.totalQuarter}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>total</div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 6, background: "#eee", borderRadius: 4 }}>
            <div style={{ height: "100%", borderRadius: 4, background: "#2774AE",
              width: `${(quarterStats.used / quarterStats.totalQuarter) * 100}%`, transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
            All meals expire at quarter end — use them or lose them
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa" }}>Total meals logged</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>{meals.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa" }}>Est. value used</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>${(meals.length * SWIPE_VALUE).toFixed(0)}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>Weekly swipe usage</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {weekHistory.map(({ label, used }) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{used}</div>
              <div style={{ width: "100%", background: "#2774AE", borderRadius: "4px 4px 0 0",
                height: `${Math.max(4, (used / weekly) * 52)}px`, opacity: label === "This week" ? 1 : 0.4 }} />
              <div style={{ fontSize: 10, color: "#bbb" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {locAvg.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>Location rankings</div>
          {locAvg.map(({ loc, avg, count }) => (
            <div key={loc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{loc}</div>
                <div style={{ fontSize: 11, color: "#bbb" }}>{count} visit{count !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Stars value={Math.round(avg)} size={12} />
                <span style={{ fontSize: 12, color: "#666" }}>{avg.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {meals.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>When you eat</div>
          {MEAL_PERIODS.map(p => (
            <div key={p} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span>{p}</span><span style={{ color: "#aaa" }}>{byPeriod[p]}</span>
              </div>
              <div style={{ height: 4, background: "#eee", borderRadius: 2 }}>
                <div style={{ height: "100%", borderRadius: 2, background: "#2774AE",
                  width: `${meals.length ? (byPeriod[p]/meals.length)*100 : 0}%`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Locations Manager
// ─────────────────────────────────────────────────────────────────────────────
function LocationsManager({ customLocations, onAdd, onRemove }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
        Default UCLA dining locations are always available. Add any spot — cafés, trucks, off-campus — and it'll appear when logging meals.
      </div>
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>Default locations</div>
        {DEFAULT_LOCATIONS.map(loc => (
          <div key={loc} style={{ fontSize: 14, padding: "7px 0", borderBottom: "1px solid #f5f5f5", color: "#333" }}>{loc}</div>
        ))}
      </div>
      {customLocations.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>Your locations</div>
          {customLocations.map(loc => (
            <div key={loc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: 14 }}>{loc}</span>
              <button onClick={() => onRemove(loc)} style={{ ...ghostBtnStyle, fontSize: 12, color: "#e74c3c" }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, width: "100%" }}>+ Add a location</button>
      {showAdd && (
        <AddLocationModal onClose={() => setShowAdd(false)} onAdd={name => { onAdd(name); setShowAdd(false); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(load);
  const [showLog, setShowLog] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [tab, setTab] = useState("log");
  const [toast, setToast] = useState(null);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Ranking state
  const [rankQueue, setRankQueue] = useState([]); // items waiting to be ranked
  const [rankingItem, setRankingItem] = useState(null); // current item being ranked

  function update(next) { setData(next); persist(next); }

  function handleSave(meal) {
    const newData = { ...data, meals: [meal, ...data.meals] };
    update(newData);
    setShowLog(false);
    // Queue each food×location combo for ranking (only if has foods)
    const candidates = getCandidatesFromMeal(meal);
    if (candidates.length > 0) {
      // Ensure all candidates exist in rankings before queuing
      const updatedRankings = { ...newData.rankings };
      candidates.forEach(c => {
        if (!updatedRankings[c.key]) {
          updatedRankings[c.key] = { ...c, score: 1000, wins: 0, losses: 0, comparisons: 0 };
        }
      });
      update({ ...newData, rankings: updatedRankings });
      setRankQueue(candidates);
      setRankingItem(candidates[0]);
    } else {
      setToast("Meal logged ✓");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function handleRankDone(updatedRankings) {
    const remaining = rankQueue.slice(1);
    const nextData = { ...data, rankings: updatedRankings };
    update(nextData);
    if (remaining.length > 0) {
      setRankQueue(remaining);
      setRankingItem(remaining[0]);
    } else {
      setRankingItem(null);
      setRankQueue([]);
      setTab("top");
      setToast("Rankings updated ✓");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function handleRankSkip() {
    const remaining = rankQueue.slice(1);
    if (remaining.length > 0) {
      setRankQueue(remaining);
      setRankingItem(remaining[0]);
    } else {
      setRankingItem(null);
      setRankQueue([]);
      setToast("Meal logged ✓");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function handleManualCompare() {
    // Pick two random items for a manual comparison
    const sorted = getSortedRankings(data.rankings || {});
    if (sorted.length < 2) return;
    const a = sorted[Math.floor(Math.random() * sorted.length)];
    setRankingItem(a);
    setRankQueue([a]);
  }

  function handleEdit(meal) { setEditingMeal(meal); }
  function handleUpdate(updatedMeal) {
    update({ ...data, meals: data.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m) });
    setEditingMeal(null);
    setToast("Meal updated ✓");
    setTimeout(() => setToast(null), 2500);
  }
  function handleDelete(id) { update({ ...data, meals: data.meals.filter(m => m.id !== id) }); }
  function handleAddLocation(name) {
    if (!data.customLocations.includes(name) && !DEFAULT_LOCATIONS.includes(name))
      update({ ...data, customLocations: [...data.customLocations, name] });
  }
  function handleRemoveLocation(name) {
    update({ ...data, customLocations: data.customLocations.filter(l => l !== name) });
  }

  const allLocations = [...DEFAULT_LOCATIONS, ...(data.customLocations || [])];
  const mealPlan = data.mealPlan || DEFAULT_PLAN;
  const plan = MEAL_PLANS[mealPlan];
  const { weekly, premier } = plan;
  const rollover = premier ? computeRollover(data.meals, weekly) : 0;
  const curWeek = getWeekStart();
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekUsed = data.meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  const swipesLeft = Math.max(0, (premier ? weekly + rollover : weekly) - thisWeekUsed);

  function handleChangePlan(planId) {
    update({ ...data, mealPlan: planId });
    setToast("Switched to " + MEAL_PLANS[planId].label + " ✓");
    setTimeout(() => setToast(null), 2500);
  }

  const TABS = [
    { id: "log", label: "Meal Log" },
    { id: "top", label: "Top Meals" },
    { id: "stats", label: "Stats" },
    { id: "locations", label: "Locations" },
    { id: "settings", label: "Settings" },
  ];

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#eef2f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        {/* Top nav bar */}
        <div style={{ background: "#2774AE", padding: "0 40px", display: "flex", alignItems: "center",
          justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🍽</span>
            <div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, letterSpacing: 1.5 }}>UCLA DINING</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>My Meals</div>
            </div>
          </div>
          {/* Nav links */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                border: "none", borderRadius: 8, padding: "7px 18px", cursor: "pointer",
                fontSize: 14, fontWeight: 500,
                background: tab === t.id ? "rgba(255,255,255,.2)" : "transparent",
                color: tab === t.id ? "#fff" : "rgba(255,255,255,.65)",
                transition: "all .15s",
              }}>{t.label}</button>
            ))}
          </div>
          {/* Swipe count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{swipesLeft}</div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10 }}>swipes left this week</div>
            </div>
            <button onClick={() => setShowLog(true)} style={{
              background: "#fff", color: "#2774AE", border: "none", borderRadius: 10,
              padding: "9px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginLeft: 8, whiteSpace: "nowrap",
            }}>+ Log a meal</button>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 40px", display: "grid",
          gridTemplateColumns: tab === "log" ? "1fr 380px" : "1fr", gap: 28 }}>

          {tab === "log" && (
            <>
              {/* Left: meal log */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Recent meals</div>
                <MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={true} />
              </div>
              {/* Right: stats sidebar */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>This week</div>
                <Stats meals={data.meals} mealPlan={mealPlan} />
              </div>
            </>
          )}

          {tab === "stats" && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Stats & Trends</div>
              <Stats meals={data.meals} mealPlan={mealPlan} />
            </div>
          )}

          {tab === "locations" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Manage Locations</div>
              <LocationsManager
                customLocations={data.customLocations || []}
                onAdd={handleAddLocation}
                onRemove={handleRemoveLocation}
              />
            </div>
          )}
          {tab === "top" && (
            <div style={{ maxWidth: 700 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>🏆 Top Meals</div>
              <TopMeals rankings={data.rankings || {}} onStartComparison={handleManualCompare} />
            </div>
          )}
          {tab === "settings" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Meal Plan</div>
              <MealPlanSelector currentPlan={mealPlan} onChangePlan={handleChangePlan} />
            </div>
          )}
        </div>

        {showLog && <LogModal onClose={() => setShowLog(false)} onSave={handleSave}
          allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={true} />}
        {editingMeal && <LogModal onClose={() => setEditingMeal(null)} onSave={handleUpdate}
          allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={true} editMeal={editingMeal} />}
        {rankingItem && <RankerModal newItem={rankingItem} rankings={data.rankings || {}} onDone={handleRankDone} onSkip={handleRankSkip} isDesktop={true} />}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  // ── Tablet layout ───────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <div style={{ minHeight: "100vh", background: "#eef2f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ background: "#2774AE", padding: "16px 24px 0", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🍽</span>
              <div>
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: 1.5 }}>UCLA DINING</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>My Meals</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 24 }}>{swipesLeft}</div>
                <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10 }}>swipes left</div>
              </div>
              <button onClick={() => setShowLog(true)} style={{
                background: "#fff", color: "#2774AE", border: "none", borderRadius: 10,
                padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>+ Log</button>
            </div>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? "#2774AE" : "rgba(255,255,255,.75)",
                transition: "all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "20px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
          {tab === "log" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
              <MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={true} />
              <Stats meals={data.meals} mealPlan={mealPlan} />
            </div>
          )}
          {tab === "top" && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>🏆 Top Meals</div>
              <TopMeals rankings={data.rankings || {}} onStartComparison={handleManualCompare} />
            </div>
          )}
          {tab === "stats" && <Stats meals={data.meals} mealPlan={mealPlan} />}
          {tab === "locations" && (
            <LocationsManager customLocations={data.customLocations || []}
              onAdd={handleAddLocation} onRemove={handleRemoveLocation} />
          )}
          {tab === "settings" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Meal Plan</div>
              <MealPlanSelector currentPlan={mealPlan} onChangePlan={handleChangePlan} />
            </div>
          )}
        </div>
        {showLog && <LogModal onClose={() => setShowLog(false)} onSave={handleSave}
          allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={false} />}
        {editingMeal && <LogModal onClose={() => setEditingMeal(null)} onSave={handleUpdate}
          allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={false} editMeal={editingMeal} />}
        {rankingItem && <RankerModal newItem={rankingItem} rankings={data.rankings || {}} onDone={handleRankDone} onSkip={handleRankSkip} isDesktop={false} />}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: "#2774AE", padding: "20px 20px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: 1.5, marginBottom: 3 }}>UCLA DINING</div>
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>My Meals</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{swipesLeft}</div>
            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, marginTop: 2 }}>swipes left</div>
          </div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#2774AE" : "rgba(255,255,255,.75)",
              transition: "all .15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 110px" }}>
        {tab === "log" && (
          <MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={false} />
        )}
        {tab === "stats" && <Stats meals={data.meals} mealPlan={mealPlan} />}
        {tab === "top" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Top Meals</div>
            <TopMeals rankings={data.rankings || {}} onStartComparison={handleManualCompare} />
          </div>
        )}
        {tab === "locations" && (
          <LocationsManager customLocations={data.customLocations || []}
            onAdd={handleAddLocation} onRemove={handleRemoveLocation} />
        )}
        {tab === "settings" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Meal Plan</div>
            <MealPlanSelector currentPlan={mealPlan} onChangePlan={handleChangePlan} />
          </div>
        )}
      </div>

      {showLog && <LogModal onClose={() => setShowLog(false)} onSave={handleSave}
        allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={false} />}
      {editingMeal && <LogModal onClose={() => setEditingMeal(null)} onSave={handleUpdate}
        allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={false} editMeal={editingMeal} />}
      {rankingItem && <RankerModal newItem={rankingItem} rankings={data.rankings || {}} onDone={handleRankDone} onSkip={handleRankSkip} isDesktop={false} />}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      background: "#27AE60", color: "#fff", padding: "10px 22px",
      borderRadius: 22, fontSize: 14, fontWeight: 500,
      boxShadow: "0 4px 12px rgba(0,0,0,.18)", zIndex: 200, whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

