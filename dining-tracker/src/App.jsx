import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UCLA Academic Calendar — quarter date ranges (used for rollover resets)
// Swipes are 19/week within a quarter; unused roll over week-to-week.
// Between quarters the rollover bank carries forward unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const QUARTERS = [
  { name: "Fall 2026",   start: "2026-09-21", end: "2026-12-11" },
  { name: "Winter 2027", start: "2027-01-04", end: "2027-03-19" },
  { name: "Spring 2027", start: "2027-03-24", end: "2027-06-11" },
  { name: "Fall 2027",   start: "2027-09-20", end: "2027-12-10" },
  { name: "Winter 2028", start: "2028-01-04", end: "2028-03-17" },
  { name: "Spring 2028", start: "2028-03-22", end: "2028-06-09" },
];

const WEEK_SWIPES = 19;
const SWIPE_VALUE = 16.50;

// Default dining locations (can be extended by user)
const DEFAULT_LOCATIONS = [
  "De Neve",
  "Epicuria at Covel",
  "Bruin Plate",
  "Rendezvous",
  "The Study at Hedrick",
  "Bruin Café",
  "Café 1919",
  "Epic at Ackerman",
  "Northern Lights Café",
  "Anderson Café",
  "Luvalle Commons",
];

const MEAL_PERIODS = ["Breakfast", "Lunch", "Dinner", "Late Night"];

const COMMON_FOODS = [
  "Pizza","Pasta","Salad","Burger","Tacos","Sushi",
  "Stir Fry","Soup","Sandwich","Grilled Chicken",
  "Veggie Bowl","Ramen","Waffles","Omelette","Steak",
  "Smoothie","Coffee","Bagel","Acai Bowl","Fries",
];

// ─────────────────────────────────────────────────────────────────────────────
// Calendar helpers
// ─────────────────────────────────────────────────────────────────────────────

// Returns the Monday (ISO week start we'll use) of a given date
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
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

// Returns all ISO week-start strings (Monday) within a quarter
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

// ─────────────────────────────────────────────────────────────────────────────
// Rollover calculator
// Given all meals, compute the rollover bank going into the current week.
// Logic: for each past week in past quarters (chronologically), tally swipes
// used vs 19 + previous rollover. Accumulate surplus.
// ─────────────────────────────────────────────────────────────────────────────
function computeRollover(meals) {
  const today = new Date();
  const curWeek = getWeekStart(today);
  let bank = 0;

  // Walk every quarter chronologically
  for (const quarter of QUARTERS) {
    const weeks = weeksInQuarter(quarter);
    for (const weekStart of weeks) {
      if (weekStart >= curWeek) break; // don't process current or future weeks
      // meals in this week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const used = meals.filter(m => {
        const d = new Date(m.timestamp);
        return d >= new Date(weekStart) && d < weekEnd;
      }).length;
      const available = WEEK_SWIPES + bank;
      const surplus = Math.max(0, available - used);
      bank = surplus;
    }
    // If quarter ended before today, bank carries into next quarter unchanged
    if (new Date(quarter.end) < today) continue;
    break; // we've reached the current quarter
  }

  return bank;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "ucla_dining_v2";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { meals: [], customLocations: [] };
    return JSON.parse(raw);
  } catch { return { meals: [], customLocations: [] }; }
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
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
      <div style={{ ...modalStyle, padding: "28px 20px 24px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Add a location</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
          Café, food truck, off-campus spot — anything works.
        </div>
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
// Log Meal Modal  (3-step)
// ─────────────────────────────────────────────────────────────────────────────
function LogModal({ onClose, onSave, allLocations, onAddLocation }) {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState("");
  const [period, setPeriod] = useState(() => {
    const h = new Date().getHours();
    if (h < 11) return "Breakfast";
    if (h < 15) return "Lunch";
    if (h < 20) return "Dinner";
    return "Late Night";
  });
  const [foods, setFoods] = useState([]);
  const [customFood, setCustomFood] = useState("");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [showAddLoc, setShowAddLoc] = useState(false);
  const customFoodRef = useRef();

  useEffect(() => { if (step === 2) customFoodRef.current?.focus(); }, [step]);

  function toggleFood(f) {
    setFoods(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  }
  function addCustomFood() {
    const t = customFood.trim();
    if (t && !foods.includes(t)) setFoods(p => [...p, t]);
    setCustomFood("");
  }

  const canNext1 = location && period;
  const canNext2 = foods.length > 0;

  const stepLabels = ["WHERE & WHEN", "WHAT DID YOU EAT", "HOW WAS IT"];

  return (
    <>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          {/* Header */}
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

          {/* Step 1 */}
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

          {/* Step 2 */}
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

          {/* Step 3 */}
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

          {/* Nav */}
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
              <button onClick={() => onSave({ id: Date.now(), timestamp: new Date().toISOString(), location, period, foods, rating, note })}
                style={{ ...primaryBtnStyle, flex: 2, background: "#27AE60" }}>
                Save meal ✓
              </button>
            )}
          </div>
        </div>
      </div>

      {showAddLoc && (
        <AddLocationModal
          onClose={() => setShowAddLoc(false)}
          onAdd={name => {
            onAddLocation(name);
            setLocation(name);
            setShowAddLoc(false);
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal Card
// ─────────────────────────────────────────────────────────────────────────────
function MealCard({ meal, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: "#fff", borderRadius: 14, padding: "13px 15px",
      marginBottom: 9, boxShadow: "0 1px 5px rgba(0,0,0,.07)", cursor: "pointer",
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
        <button onClick={e => { e.stopPropagation(); onDelete(meal.id); }}
          style={{ ...ghostBtnStyle, fontSize: 12, color: "#e74c3c", marginTop: 8 }}>Delete meal</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────
function Stats({ meals }) {
  const today = new Date();
  const curWeek = getWeekStart(today);
  const rollover = computeRollover(meals);
  const thisWeekMeals = meals.filter(m => getWeekStart(new Date(m.timestamp)) === curWeek);
  const swipesUsed = thisWeekMeals.length;
  const totalAvail = WEEK_SWIPES + rollover;
  const swipesLeft = Math.max(0, totalAvail - swipesUsed);
  const activeQ = getActiveQuarter(today);

  // Location ratings
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

  // Rollover history — last 4 weeks
  const weekHistory = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const wk = getWeekStart(d);
    const wkEnd = new Date(wk);
    wkEnd.setDate(wkEnd.getDate() + 7);
    const used = meals.filter(m => {
      const md = new Date(m.timestamp);
      return md >= new Date(wk) && md < wkEnd;
    }).length;
    weekHistory.push({ wk, used, label: i === 0 ? "This week" : `${i}w ago` });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Quarter badge */}
      {activeQ && (
        <div style={{ fontSize: 12, color: "#2774AE", fontWeight: 600, textAlign: "center", padding: "4px 0" }}>
          {activeQ.name} · ends {fmtDate(activeQ.end + "T12:00:00")}
        </div>
      )}

      {/* Swipe balance */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>This week · swipe balance</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: swipesLeft < 4 ? "#e74c3c" : "#2774AE", lineHeight: 1 }}>
            {swipesLeft}
          </span>
          <span style={{ fontSize: 13, color: "#aaa" }}>
            left of {totalAvail}{rollover > 0 ? ` (incl. ${rollover} rolled over)` : ""}
          </span>
        </div>
        <div style={{ margin: "10px 0 4px", height: 7, background: "#eee", borderRadius: 4 }}>
          <div style={{ height: "100%", borderRadius: 4, background: swipesLeft < 4 ? "#e74c3c" : "#2774AE",
            width: `${totalAvail ? Math.min(100,(swipesUsed/totalAvail)*100) : 0}%`, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#bbb" }}>{swipesUsed} used · resets next Monday</div>
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa" }}>Total meals</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>{meals.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa" }}>Est. value used</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>${(meals.length * SWIPE_VALUE).toFixed(0)}</div>
        </div>
      </div>

      {/* Weekly usage last 4 weeks */}
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>Weekly swipe usage</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {weekHistory.map(({ label, used }) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{used}</div>
              <div style={{ width: "100%", background: "#2774AE", borderRadius: "4px 4px 0 0",
                height: `${Math.max(4, (used / WEEK_SWIPES) * 52)}px`, transition: "height .4s",
                opacity: label === "This week" ? 1 : 0.45 }} />
              <div style={{ fontSize: 10, color: "#bbb" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Location rankings */}
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

      {/* Period breakdown */}
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
// Locations Manager (settings tab)
// ─────────────────────────────────────────────────────────────────────────────
function LocationsManager({ customLocations, onAdd, onRemove }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
        Default UCLA dining locations are always available. Add any spot — cafés, trucks, off-campus — and it'll show up when logging meals.
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

      <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, width: "100%" }}>
        + Add a location
      </button>

      {showAdd && (
        <AddLocationModal
          onClose={() => setShowAdd(false)}
          onAdd={name => { onAdd(name); setShowAdd(false); }}
        />
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
  const [tab, setTab] = useState("log");
  const [toast, setToast] = useState(null);

  function update(next) { setData(next); persist(next); }

  function handleSave(meal) {
    update({ ...data, meals: [meal, ...data.meals] });
    setShowLog(false);
    setToast("Meal logged ✓");
    setTimeout(() => setToast(null), 2500);
  }

  function handleDelete(id) {
    update({ ...data, meals: data.meals.filter(m => m.id !== id) });
  }

  function handleAddLocation(name) {
    if (!data.customLocations.includes(name) && !DEFAULT_LOCATIONS.includes(name)) {
      update({ ...data, customLocations: [...data.customLocations, name] });
    }
  }

  function handleRemoveLocation(name) {
    update({ ...data, customLocations: data.customLocations.filter(l => l !== name) });
  }

  const allLocations = [...DEFAULT_LOCATIONS, ...(data.customLocations || [])];

  const rollover = computeRollover(data.meals);
  const curWeek = getWeekStart();
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekUsed = data.meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  const swipesLeft = Math.max(0, WEEK_SWIPES + rollover - thisWeekUsed);

  // Group meals by date
  const grouped = {};
  data.meals.forEach(m => {
    const dk = m.timestamp.split("T")[0];
    if (!grouped[dk]) grouped[dk] = [];
    grouped[dk].push(m);
  });
  const sortedDays = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  const TABS = [
    { id: "log", label: "Meal Log" },
    { id: "stats", label: "Stats" },
    { id: "locations", label: "Locations" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
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
        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#2774AE" : "rgba(255,255,255,.75)",
              transition: "all .15s", borderRadius: tab === t.id ? "6px 6px 0 0" : 0,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 110px" }}>
        {tab === "log" && (
          sortedDays.length === 0 ? (
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
              {grouped[dk].map(m => <MealCard key={m.id} meal={m} onDelete={handleDelete} />)}
            </div>
          ))
        )}
        {tab === "stats" && <Stats meals={data.meals} />}
        {tab === "locations" && (
          <LocationsManager
            customLocations={data.customLocations || []}
            onAdd={handleAddLocation}
            onRemove={handleRemoveLocation}
          />
        )}
      </div>

      {/* FAB — only on log tab */}
      {tab !== "locations" && (
        <button onClick={() => setShowLog(true)} style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#2774AE", color: "#fff", border: "none", borderRadius: 30,
          padding: "14px 34px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(39,116,174,.5)",
          display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", zIndex: 20,
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Log a meal
        </button>
      )}

      {showLog && (
        <LogModal
          onClose={() => setShowLog(false)}
          onSave={handleSave}
          allLocations={allLocations}
          onAddLocation={handleAddLocation}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#27AE60", color: "#fff", padding: "10px 22px",
          borderRadius: 22, fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,.18)", zIndex: 30, whiteSpace: "nowrap",
        }}>{toast}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
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
