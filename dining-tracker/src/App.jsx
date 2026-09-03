import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UCLA Academic Calendar (Quarter system)
// ─────────────────────────────────────────────────────────────────────────────
const QUARTERS = [
  { name: "Fall 2026",   start: "2026-09-21", end: "2026-12-11" },
  { name: "Winter 2027", start: "2027-01-04", end: "2027-03-19" },
  { name: "Spring 2027", start: "2027-03-24", end: "2027-06-11" },
  { name: "Fall 2027",   start: "2027-09-20", end: "2027-12-10" },
  { name: "Winter 2028", start: "2028-01-04", end: "2028-03-17" },
  { name: "Spring 2028", start: "2028-03-22", end: "2028-06-09" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UC Berkeley Academic Calendar (Semester system)
// ─────────────────────────────────────────────────────────────────────────────
const SEMESTERS = [
  { name: "Fall 2026",   start: "2026-08-19", end: "2026-12-18" },
  { name: "Spring 2027", start: "2027-01-12", end: "2027-05-14" },
  { name: "Fall 2027",   start: "2027-08-18", end: "2027-12-17" },
  { name: "Spring 2028", start: "2028-01-11", end: "2028-05-12" },
];

const SWIPE_VALUE = 16.50;

// ─────────────────────────────────────────────────────────────────────────────
// Meal Plans
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_PLANS = {
  // UCLA plans
  "19P": { label: "19 Premier", weekly: 19, premier: true  },
  "19R": { label: "19 Regular", weekly: 19, premier: false },
  "14P": { label: "14 Premier", weekly: 14, premier: true  },
  "14R": { label: "14 Regular", weekly: 14, premier: false },
  "11P": { label: "11 Premier", weekly: 11, premier: true  },
  "11R": { label: "11 Regular", weekly: 11, premier: false },
  // UC Berkeley plans (semester-based, no rollover)
  "BG":  { label: "Blue & Gold", weekly: 14,  premier: false },
  "BU":  { label: "Ultimate",    weekly: 999, premier: false }, // unlimited — modeled as 999
};
const DEFAULT_PLAN = "19P";

// ─────────────────────────────────────────────────────────────────────────────
// Schools
// ─────────────────────────────────────────────────────────────────────────────
const SCHOOLS = {
  ucla: {
    id: "ucla",
    name: "UCLA",
    fullName: "University of California, Los Angeles",
    color: "#2774AE",
    calType: "quarter",
    plans: ["19P","19R","14P","14R","11P","11R"],
    locations: [
      "De Neve","Epicuria at Covel","Bruin Plate","Rendezvous",
      "The Study at Hedrick","Bruin Café","Café 1919",
      "Epic at Ackerman","Northern Lights Café","Anderson Café","Luvalle Commons",
    ],
  },
  berkeley: {
    id: "berkeley",
    name: "UC Berkeley",
    fullName: "University of California, Berkeley",
    color: "#003262",
    calType: "semester",
    plans: ["BG","BU"],
    locations: [
      // Residential Dining Commons (swipe-eligible)
      "Café 3","Clark Kerr","Crossroads","Foothill",
      // Campus Eateries
      "Brown's","The Golden Bear Café","The Eateries at MLK",
      "Gateway Café","Qualcomm Café","Free Speech Movement Café",
      // Convenience & Markets
      "Bear Market","Cub Market","The Den",
    ],
  },
};
const DEFAULT_SCHOOL = "ucla";

const MEAL_PERIODS = ["Breakfast", "Lunch", "Dinner", "Late Night", "Snack"];

const COMMON_FOODS = [
  "Pizza","Pasta","Salad","Burger","Tacos","Sushi",
  "Stir Fry","Soup","Sandwich","Grilled Chicken",
  "Veggie Bowl","Ramen","Waffles","Omelette","Steak",
  "Smoothie","Coffee","Bagel","Acai Bowl","Fries",
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles (UCLA blue is fine here — these are static defaults)
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
const chipStyle = (active, color = "#2774AE", dashed = false) => ({
  border: dashed ? "1.5px dashed #bbb" : active ? "2px solid " + color : "1.5px solid #e5e5e5",
  background: active ? color + "18" : "#fff",
  color: active ? color : dashed ? "#888" : "#444",
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
// Hooks & Utilities
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

// Returns the active period (quarter or semester) for a given school object
function getActivePeriod(date = new Date(), school = null) {
  const ds = dateStr(date);
  const cal = school?.calType === "semester" ? SEMESTERS : QUARTERS;
  return cal.find(p => ds >= p.start && ds <= p.end) || null;
}

// UCLA-only alias used by rollover logic
function getActiveQuarter(date = new Date()) {
  const ds = dateStr(date);
  return QUARTERS.find(q => ds >= q.start && ds <= q.end) || null;
}

function weeksInPeriod(period) {
  const weeks = [];
  const end = new Date(period.end);
  let cur = new Date(getWeekStart(new Date(period.start)));
  while (cur <= end) {
    weeks.push(cur.toISOString().split("T")[0]);
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}
// Keep alias so rollover logic works unchanged
function weeksInQuarter(quarter) { return weeksInPeriod(quarter); }

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

function computeRegularWeekly(meals, weeklySwipes) {
  const curWeek = getWeekStart();
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const used = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  return { used, left: Math.max(0, weeklySwipes - used) };
}

const STORAGE_KEY = "swipes_v1";
function load() {
  try {
    let raw = localStorage.getItem("swipes_v1")
      || localStorage.getItem("ucla_dining_v4")
      || localStorage.getItem("ucla_dining_v3")
      || localStorage.getItem("ucla_dining_v2");
    if (!raw) return { meals: [], customLocations: [], mealPlan: DEFAULT_PLAN, rankings: {}, school: DEFAULT_SCHOOL };
    const parsed = JSON.parse(raw);
    if (!parsed.mealPlan) parsed.mealPlan = DEFAULT_PLAN;
    if (!parsed.rankings) parsed.rankings = {};
    if (!parsed.school) parsed.school = DEFAULT_SCHOOL;
    // If stored plan is invalid for stored school, reset to that school's first plan
    const storedSchool = SCHOOLS[parsed.school] || SCHOOLS[DEFAULT_SCHOOL];
    if (!storedSchool.plans.includes(parsed.mealPlan)) {
      parsed.mealPlan = storedSchool.plans[0];
    }
    return parsed;
  } catch { return { meals: [], customLocations: [], mealPlan: DEFAULT_PLAN, rankings: {}, school: DEFAULT_SCHOOL }; }
}
function persist(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
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

function LogModal({ onClose, onSave, allLocations, onAddLocation, isDesktop, editMeal = null, schoolColor = "#2774AE" }) {
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
  const canSave = foods.length > 0;
  const stepLabels = isEditing
    ? ["EDIT LOCATION & TIME", "EDIT FOODS & NOTES"]
    : ["WHERE & WHEN", "WHAT DID YOU EAT"];

  const desktopModalOverride = isDesktop ? {
    borderRadius: 16, maxWidth: 560, margin: "auto",
    maxHeight: "80vh", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
  } : {};
  const desktopOverlayOverride = isDesktop ? { alignItems: "center" } : {};

  return (
    <>
      <div style={{ ...overlayStyle, ...desktopOverlayOverride }}>
        <div style={{ ...modalStyle, ...desktopModalOverride }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: schoolColor, fontWeight: 700, marginBottom: 6 }}>
                {stepLabels[step - 1]}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[1,2].map(s => (
                  <div key={s} style={{ width: 32, height: 3, borderRadius: 2,
                    background: s <= step ? schoolColor : "#e5e5e5", transition: "background .2s" }} />
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
                  <button key={loc} onClick={() => setLocation(loc)} style={chipStyle(location === loc, schoolColor)}>{loc}</button>
                ))}
                <button onClick={() => setShowAddLoc(true)} style={chipStyle(false, schoolColor, true)}>+ Add location</button>
              </div>
              <div style={{ ...fieldLabel, marginTop: 20 }}>Meal period</div>
              <div style={chipGrid}>
                {MEAL_PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={chipStyle(period === p, schoolColor)}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={fieldLabel}>Tap what you ate</div>
              <div style={chipGrid}>
                {COMMON_FOODS.map(f => (
                  <button key={f} onClick={() => toggleFood(f)} style={chipStyle(foods.includes(f), schoolColor)}>{f}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input ref={customFoodRef} value={customFood}
                  onChange={e => setCustomFood(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomFood()}
                  placeholder="Something else…"
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addCustomFood} style={{ ...addBtnStyle, background: schoolColor }}>Add</button>
              </div>
              {foods.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {foods.map(f => (
                    <span key={f} style={{ ...tagStyle, background: schoolColor + "18", color: schoolColor }}>
                      {f} <span onClick={() => toggleFood(f)} style={{ cursor: "pointer", opacity: .6 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ ...fieldLabel, marginTop: 16 }}>Notes (optional)</div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Best station, long line, something you'd order again…"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", height: 72, resize: "none" }} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ ...ghostBtnStyle, flex: 1, border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "12px 0", fontSize: 14 }}>
                ← Back
              </button>
            )}
            {step < 2 ? (
              <button onClick={() => setStep(2)}
                disabled={!canNext1}
                style={{ ...primaryBtnStyle, flex: 2, background: schoolColor, opacity: canNext1 ? 1 : 0.4 }}>
                Next →
              </button>
            ) : (
              <button
                disabled={!canSave}
                onClick={() => onSave({
                  id: editMeal?.id || Date.now(),
                  timestamp: editMeal?.timestamp || new Date().toISOString(),
                  location, period, foods, note,
                })}
                style={{ ...primaryBtnStyle, flex: 2, background: "#27AE60", opacity: canSave ? 1 : 0.4 }}>
                {isEditing ? "Save changes ✓" : "Save & Rank →"}
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

function MealCard({ meal, onDelete, onEdit, schoolColor = "#2774AE" }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: "#fff", borderRadius: 12, padding: "13px 15px",
      marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,.07)", cursor: "pointer",
      transition: "box-shadow .15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{meal.location}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
            {meal.period} · {fmtDate(meal.timestamp)} · {fmtTime(meal.timestamp)}
          </div>
        </div>
      </div>
      {meal.foods.length > 0 && (
        <div style={{ fontSize: 13, color: "#555", marginTop: 7, lineHeight: 1.4 }}>
          {open ? meal.foods.join(", ") : meal.foods.slice(0, 3).join(", ") + (meal.foods.length > 3 ? " +" + (meal.foods.length - 3) + " more" : "")}
        </div>
      )}
      {open && meal.note && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 6, fontStyle: "italic" }}>"{meal.note}"</div>
      )}
      {open && (
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(meal); }}
            style={{ ...ghostBtnStyle, fontSize: 12, color: schoolColor, fontWeight: 600 }}>✏ Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(meal.id); }}
            style={{ ...ghostBtnStyle, fontSize: 12, color: "#e74c3c" }}>Delete</button>
        </div>
      )}
    </div>
  );
}

function MealLog({ meals, onDelete, onEdit, onLogNew, isDesktop, schoolColor = "#2774AE" }) {
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
          {grouped[dk].map(m => <MealCard key={m.id} meal={m} onDelete={onDelete} onEdit={onEdit} schoolColor={schoolColor} />)}
        </div>
      ))}
      <button onClick={onLogNew} style={{
        ...(isDesktop ? {
          display: "flex", alignItems: "center", gap: 8,
          margin: "24px auto 0", position: "static", transform: "none",
          width: "fit-content",
        } : {
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
        }),
        background: schoolColor, color: "#fff", border: "none", borderRadius: 30,
        padding: "13px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer",
        boxShadow: `0 4px 20px ${schoolColor}70`, whiteSpace: "nowrap", zIndex: 20,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Log a meal
      </button>
    </div>
  );
}

function itemKey(food, location) { return food + "||" + location; }

function getSortedRankings(rankings) {
  return Object.values(rankings).sort((a, b) => b.score - a.score);
}

function applyComparison(rankings, newItemKey, opponentKey, newWon) {
  const K = 32;
  const next = { ...rankings };
  const a = { ...next[newItemKey] };
  const b = { ...next[opponentKey] };
  const ea = 1 / (1 + Math.pow(10, (b.score - a.score) / 400));
  const eb = 1 - ea;
  if (newWon) {
    a.score = Math.round(a.score + K * (1 - ea));
    b.score = Math.round(b.score + K * (0 - eb));
    a.wins = (a.wins || 0) + 1; b.losses = (b.losses || 0) + 1;
  } else {
    a.score = Math.round(a.score + K * (0 - ea));
    b.score = Math.round(b.score + K * (1 - eb));
    a.losses = (a.losses || 0) + 1; b.wins = (b.wins || 0) + 1;
  }
  a.comparisons = (a.comparisons || 0) + 1;
  b.comparisons = (b.comparisons || 0) + 1;
  next[newItemKey] = a;
  next[opponentKey] = b;
  return next;
}

function getCandidatesFromMeal(meal) {
  return (meal.foods || []).map(food => ({
    food, location: meal.location, key: itemKey(food, meal.location)
  }));
}

function RankerModal({ newItem, rankings, onDone, onSkip, isDesktop, schoolColor = "#2774AE" }) {
  const sorted = getSortedRankings(rankings).filter(r => r.key !== newItem.key);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(sorted.length);
  const [currentRankings, setCurrentRankings] = useState(() => {
    if (!rankings[newItem.key]) {
      return { ...rankings, [newItem.key]: { ...newItem, score: 1000, wins: 0, losses: 0, comparisons: 0 } };
    }
    return rankings;
  });
  const [done, setDone] = useState(sorted.length === 0);

  const midIdx = Math.floor((lo + hi) / 2);
  const opponent = sorted[midIdx];
  const totalSteps = Math.max(1, Math.ceil(Math.log2(sorted.length + 1)));
  const currentStep = totalSteps - Math.ceil(Math.log2(Math.max(1, hi - lo + 1)));

  function handleChoice(newWon) {
    const updated = applyComparison(currentRankings, newItem.key, opponent.key, newWon);
    setCurrentRankings(updated);
    const newLo = newWon ? lo : midIdx + 1;
    const newHi = newWon ? midIdx : hi;
    if (newLo >= newHi) {
      setDone(true);
      onDone(updated);
    } else {
      setLo(newLo);
      setHi(newHi);
    }
  }

  const centerStyle = isDesktop ? { alignItems: "center" } : {};
  const modalOverride = isDesktop ? { borderRadius: 16, maxWidth: 500, margin: "auto" } : {};

  if (done || sorted.length === 0) {
    const finalSorted = getSortedRankings(currentRankings);
    const rank = finalSorted.findIndex(r => r.key === newItem.key) + 1;
    const total = finalSorted.length;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🍽";
    return (
      <div style={{ ...overlayStyle, ...centerStyle }}>
        <div style={{ ...modalStyle, ...modalOverride, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{medal}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{newItem.food}</div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{newItem.location}</div>
          <div style={{ fontSize: 15, color: "#555", marginBottom: 20 }}>
            Ranked <strong style={{ color: schoolColor }}>#{rank}</strong> of {total}
          </div>
          {rank <= 3 && (
            <div style={{ background: schoolColor + "18", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: schoolColor }}>
              {rank === 1 ? "🔥 New #1 — your top pick!" : rank === 2 ? "⭐ Top 3 — strong choice." : "👍 Top 3!"}
            </div>
          )}
          <button onClick={() => onDone(currentRankings)} style={{ ...primaryBtnStyle, width: "100%", background: schoolColor }}>
            See rankings →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...overlayStyle, ...centerStyle }}>
      <div style={{ ...modalStyle, ...modalOverride }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: schoolColor, fontWeight: 700, marginBottom: 8 }}>RANK THIS MEAL</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>
            Comparison {Math.min(currentStep + 1, totalSteps)} of ~{totalSteps}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%",
                background: i <= currentStep ? schoolColor : "#e0e0e0" }} />
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 12 }}>Which do you prefer?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <button onClick={() => handleChoice(true)} style={{
            border: "2px solid #e5e5e5", borderRadius: 14, padding: "18px 12px",
            background: "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = schoolColor; e.currentTarget.style.background = schoolColor + "12"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.background = "#fff"; }}
          >
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>JUST HAD</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#222", marginBottom: 4 }}>{newItem.food}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{newItem.location}</div>
          </button>
          <button onClick={() => handleChoice(false)} style={{
            border: "2px solid #e5e5e5", borderRadius: 14, padding: "18px 12px",
            background: "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#e74c3c"; e.currentTarget.style.background = "#fff5f5"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.background = "#fff"; }}
          >
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>COMPARED TO</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#222", marginBottom: 4 }}>{opponent.food}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{opponent.location}</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
              #{getSortedRankings(currentRankings).findIndex(r => r.key === opponent.key) + 1} ranked
            </div>
          </button>
        </div>
        <button onClick={onSkip} style={{
          ...ghostBtnStyle, width: "100%", border: "1.5px solid #e5e5e5",
          borderRadius: 10, padding: "11px 0", fontSize: 13,
        }}>
          Skip ranking
        </button>
      </div>
    </div>
  );
}

function TopMeals({ rankings, meals, onStartComparison, onDeleteRanking, schoolColor = "#2774AE" }) {
  const [filter, setFilter] = useState("all");
  const sorted = getSortedRankings(rankings);
  const locations = [...new Set(sorted.map(r => r.location))];
  const filtered = filter === "all" ? sorted : sorted.filter(r => r.location === filter);

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "70px 20px", color: "#bbb" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>No rankings yet</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Log a meal and rank it to build your list</div>
      </div>
    );
  }

  const medal = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <div>
      {locations.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => setFilter("all")} style={chipStyle(filter === "all", schoolColor)}>All</button>
          {locations.map(loc => (
            <button key={loc} onClick={() => setFilter(loc)} style={chipStyle(filter === loc, schoolColor)}>{loc}</button>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((item) => {
          const globalRank = sorted.findIndex(r => r.key === item.key);
          const m = medal(globalRank);
          const barWidth = sorted[0].score > 0 ? (item.score / sorted[0].score) * 100 : 0;
          return (
            <div key={item.key} style={{
              background: "#fff", borderRadius: 12, padding: "13px 16px",
              boxShadow: globalRank < 3 ? `0 2px 8px ${schoolColor}20` : "0 1px 4px rgba(0,0,0,.07)",
              border: globalRank === 0 ? "2px solid #FFB800" : globalRank < 3 ? "1.5px solid #e0eaf5" : "1.5px solid transparent",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 36, textAlign: "center" }}>
                  {m ? <span style={{ fontSize: 24 }}>{m}</span>
                     : <span style={{ fontSize: 15, fontWeight: 700, color: "#bbb" }}>#{globalRank + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.food}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{item.location}</div>
                  <div style={{ marginTop: 6, height: 3, background: "#eee", borderRadius: 2 }}>
                    <div style={{ height: "100%", borderRadius: 2,
                      background: globalRank === 0 ? "#FFB800" : schoolColor,
                      width: barWidth + "%", transition: "width .4s" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: globalRank === 0 ? "#FFB800" : schoolColor }}>{item.score}</div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{item.wins || 0}W {item.losses || 0}L</div>
                  <button onClick={e => { e.stopPropagation(); onDeleteRanking(item); }}
                    style={{ ...ghostBtnStyle, fontSize: 10, color: "#e74c3c", marginTop: 4, display: "block" }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length >= 2 && (
        <button onClick={onStartComparison} style={{ ...primaryBtnStyle, width: "100%", marginTop: 20, background: schoolColor }}>
          ⚔️ Run a new comparison
        </button>
      )}
    </div>
  );
}

function SchoolSelector({ currentSchool, onChangeSchool }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
        Select your school. More schools are coming soon — locations and meal plans update automatically.
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#2774AE", fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>
          SUPPORTED SCHOOLS
        </div>
        {Object.values(SCHOOLS).map(school => {
          const active = currentSchool === school.id;
          return (
            <button key={school.id} onClick={() => onChangeSchool(school.id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "14px 16px", marginBottom: 8,
              border: active ? "2px solid " + school.color : "1.5px solid #e5e5e5",
              borderRadius: 12, background: active ? school.color + "12" : "#fff",
              cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: school.color, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 700,
                }}>
                  {school.name.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: active ? school.color : "#222" }}>
                    {school.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{school.fullName}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>
                    {school.locations.length} locations · {school.plans.length} meal plans
                  </div>
                </div>
              </div>
              {active && <span style={{ color: school.color, fontSize: 20 }}>✓</span>}
            </button>
          );
        })}
      </div>
      <div style={{ ...cardStyle, background: "#f9f9f9", border: "1.5px dashed #e0e0e0" }}>
        <div style={{ fontSize: 12, color: "#aaa", fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
          COMING SOON
        </div>
        {["SJSU", "UC Irvine", "Caltech"].map(name => (
          <div key={name} style={{ fontSize: 14, color: "#ccc", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

function MealPlanSelector({ currentPlan, onChangePlan, school }) {
  const availablePlans = school?.plans || Object.keys(MEAL_PLANS);
  const schoolColor = school?.color || "#2774AE";
  const isBerkeley = school?.calType === "semester";

  if (isBerkeley) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
          Select your dining plan. Weekly swipes reset every Monday. Unused swipes do not carry over.
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: schoolColor, fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>AVAILABLE PLANS</div>
          {availablePlans.map(id => {
            const p = MEAL_PLANS[id];
            if (!p) return null;
            const active = currentPlan === id;
            const isUnlimited = p.weekly >= 999;
            return (
              <button key={id} onClick={() => onChangePlan(id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 14px", marginBottom: 8,
                border: active ? "2px solid " + schoolColor : "1.5px solid #e5e5e5",
                borderRadius: 10, background: active ? schoolColor + "12" : "#fff",
                cursor: "pointer", textAlign: "left",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: active ? schoolColor : "#222" }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                    {isUnlimited ? "Unlimited swipes/week · 1 per 30 min" : `${p.weekly} swipes/week`} · no rollover
                  </div>
                </div>
                {active && <span style={{ color: schoolColor, fontSize: 18 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // UCLA-style (premier / regular split)
  const premiers = availablePlans.filter(id => MEAL_PLANS[id]?.premier);
  const regulars  = availablePlans.filter(id => MEAL_PLANS[id] && !MEAL_PLANS[id].premier);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
        Select your dining plan. <strong>Premier</strong> plans let unused meals roll over week-to-week within the quarter. <strong>Regular</strong> plans reset every week with no rollover.
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: schoolColor, fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>PREMIER PLANS</div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Unused meals roll over week to week within the quarter</div>
        {premiers.map(id => {
          const p = MEAL_PLANS[id];
          const active = currentPlan === id;
          return (
            <button key={id} onClick={() => onChangePlan(id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "12px 14px", marginBottom: 8,
              border: active ? "2px solid " + schoolColor : "1.5px solid #e5e5e5",
              borderRadius: 10, background: active ? schoolColor + "12" : "#fff",
              cursor: "pointer", textAlign: "left",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: active ? schoolColor : "#222" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{p.weekly} meals/week · rollover ✓</div>
              </div>
              {active && <span style={{ color: schoolColor, fontSize: 18 }}>✓</span>}
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

function Stats({ meals, mealPlan, school }) {
  const plan = MEAL_PLANS[mealPlan] || MEAL_PLANS[DEFAULT_PLAN];
  const { weekly, premier } = plan;
  const isUnlimited = weekly >= 999;
  const schoolColor = school?.color || "#2774AE";
  const periodLabel = school?.calType === "semester" ? "Semester" : "Quarter";
  const today = new Date();
  const curWeek = getWeekStart(today);
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekUsed = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  const rollover = premier ? computeRollover(meals, weekly) : 0;
  const totalAvail = isUnlimited ? Infinity : (premier ? weekly + rollover : weekly);
  const swipesLeft = isUnlimited ? Infinity : Math.max(0, totalAvail - thisWeekUsed);
  const activePeriod = getActivePeriod(today, school);
  const quarterStats = premier && !isUnlimited ? computeQuarterStats(meals, weekly) : null;
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
  const displayLeft = isUnlimited ? "∞" : swipesLeft;
  const alertColor = (isUnlimited || swipesLeft >= 3) ? schoolColor : "#e74c3c";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {activePeriod && (
        <div style={{ fontSize: 12, color: schoolColor, fontWeight: 600, textAlign: "center", padding: "2px 0" }}>
          {activePeriod.name} · ends {fmtDate(activePeriod.end + "T12:00:00")} · <span style={{ color: "#888", fontWeight: 400 }}>{plan.label}</span>
        </div>
      )}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
          {isUnlimited
            ? "Unlimited plan · meals this week"
            : premier ? "This week · swipe balance (w/ rollover)" : "This week · swipes remaining"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: alertColor, lineHeight: 1 }}>
            {isUnlimited ? thisWeekUsed : displayLeft}
          </span>
          <span style={{ fontSize: 13, color: "#aaa" }}>
            {isUnlimited
              ? "meals logged this week"
              : `left of ${totalAvail}${premier && rollover > 0 ? ` (incl. ${rollover} rolled over)` : ""}`}
          </span>
        </div>
        {!isUnlimited && (
          <div style={{ margin: "10px 0 4px", height: 7, background: "#eee", borderRadius: 4 }}>
            <div style={{ height: "100%", borderRadius: 4, background: alertColor,
              width: `${totalAvail ? Math.min(100,(thisWeekUsed/totalAvail)*100) : 0}%`, transition: "width .4s" }} />
          </div>
        )}
        <div style={{ fontSize: 11, color: "#bbb" }}>
          {isUnlimited
            ? "1 swipe every 30 min · resets Monday"
            : premier ? "resets Monday, surplus rolls over" : "resets Monday — no rollover"}
        </div>
      </div>
      {premier && quarterStats && (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>{periodLabel} total · {quarterStats.quarter.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: schoolColor }}>{quarterStats.remaining}</div>
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
            <div style={{ height: "100%", borderRadius: 4, background: schoolColor,
              width: `${(quarterStats.used / quarterStats.totalQuarter) * 100}%`, transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
            All meals expire at {periodLabel.toLowerCase()} end — use them or lose them
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
          {weekHistory.map(({ label, used }) => {
            const barRef = isUnlimited ? Math.max(...weekHistory.map(w => w.used), 1) : weekly;
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{used}</div>
                <div style={{ width: "100%", background: schoolColor, borderRadius: "4px 4px 0 0",
                  height: `${Math.max(4, (used / barRef) * 52)}px`, opacity: label === "This week" ? 1 : 0.4 }} />
                <div style={{ fontSize: 10, color: "#bbb" }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
      {meals.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>When you eat</div>
          {MEAL_PERIODS.map(p => (
            <div key={p} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span>{p}</span><span style={{ color: "#aaa" }}>{byPeriod[p]}</span>
              </div>
              <div style={{ height: 4, background: "#eee", borderRadius: 2 }}>
                <div style={{ height: "100%", borderRadius: 2, background: schoolColor,
                  width: `${meals.length ? (byPeriod[p]/meals.length)*100 : 0}%`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationsManager({ defaultLocations, customLocations, onAdd, onRemove, schoolColor = "#2774AE" }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
        Your school's dining locations are always available. Add any spot — cafés, trucks, off-campus — and it'll appear when logging meals.
      </div>
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>Default locations</div>
        {defaultLocations.map(loc => (
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
      <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, width: "100%", background: schoolColor }}>+ Add a location</button>
      {showAdd && (
        <AddLocationModal onClose={() => setShowAdd(false)} onAdd={name => { onAdd(name); setShowAdd(false); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(load);
  const [showLog, setShowLog] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [tab, setTab] = useState("log");
  const [toast, setToast] = useState(null);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [rankQueue, setRankQueue] = useState([]);
  const [rankingItem, setRankingItem] = useState(null);

  function update(next) { setData(next); persist(next); }

  function handleSave(meal) {
    const newData = { ...data, meals: [meal, ...data.meals] };
    update(newData);
    setShowLog(false);
    const candidates = getCandidatesFromMeal(meal);
    if (candidates.length > 0) {
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

  function handleDeleteRanking(item) {
    const { food, location, key } = item;
    const updatedRankings = { ...data.rankings };
    delete updatedRankings[key];
    const updatedMeals = data.meals.filter(m =>
      !(m.location === location && (m.foods || []).includes(food))
    );
    update({ ...data, rankings: updatedRankings, meals: updatedMeals });
    setToast("Removed from rankings and log");
    setTimeout(() => setToast(null), 2500);
  }

  function handleManualCompare() {
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
  function handleDelete(id) {
    const meal = data.meals.find(m => m.id === id);
    const remainingMeals = data.meals.filter(m => m.id !== id);
    let updatedRankings = { ...data.rankings };
    if (meal) {
      getCandidatesFromMeal(meal).forEach(({ key, food, location }) => {
        const stillExists = remainingMeals.some(m =>
          m.location === location && (m.foods || []).includes(food)
        );
        if (!stillExists) delete updatedRankings[key];
      });
    }
    update({ ...data, meals: remainingMeals, rankings: updatedRankings });
  }
  function handleAddLocation(name) {
    if (!data.customLocations.includes(name) && !school.locations.includes(name))
      update({ ...data, customLocations: [...data.customLocations, name] });
  }
  function handleRemoveLocation(name) {
    update({ ...data, customLocations: data.customLocations.filter(l => l !== name) });
  }

  // ── School-aware derived state ──────────────────────────────────────────────
  const school = SCHOOLS[data.school || DEFAULT_SCHOOL];
  const allLocations = [...school.locations, ...(data.customLocations || [])];
  const mealPlan = data.mealPlan || DEFAULT_PLAN;
  const plan = MEAL_PLANS[mealPlan] || MEAL_PLANS[DEFAULT_PLAN];
  const { weekly, premier } = plan;
  const isUnlimited = weekly >= 999;
  const rollover = premier ? computeRollover(data.meals, weekly) : 0;
  const curWeek = getWeekStart();
  const weekEnd = new Date(curWeek); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekUsed = data.meals.filter(m => {
    const d = new Date(m.timestamp);
    return d >= new Date(curWeek) && d < weekEnd;
  }).length;
  const swipesLeft = isUnlimited
    ? "∞"
    : Math.max(0, (premier ? weekly + rollover : weekly) - thisWeekUsed);
  const sc = school.color; // shorthand for inline styles below

  function handleChangeSchool(schoolId) {
    const newSchool = SCHOOLS[schoolId];
    const currentPlanValid = newSchool.plans.includes(data.mealPlan);
    const newPlan = currentPlanValid ? data.mealPlan : newSchool.plans[0];
    // Clear custom locations when switching schools (they were school-specific)
    update({ ...data, school: schoolId, mealPlan: newPlan, customLocations: [] });
    setToast("Switched to " + newSchool.name + " ✓");
    setTimeout(() => setToast(null), 2500);
  }
  function handleChangePlan(planId) {
    update({ ...data, mealPlan: planId });
    setToast("Switched to " + MEAL_PLANS[planId].label + " ✓");
    setTimeout(() => setToast(null), 2500);
  }

  const TABS = [
    { id: "log", label: "Meal Log" },
    { id: "top", label: "Top Meals" },
    { id: "stats", label: "Stats" },
    { id: "settings", label: "Settings" },
  ];

  const settingsContent = (fontSize) => (
    <div style={{ display: "grid", gap: fontSize > 16 ? 32 : fontSize > 14 ? 28 : 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize, marginBottom: 4 }}>School</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: fontSize > 14 ? 16 : 12 }}>Sets your default locations and meal plan options.</div>
        <SchoolSelector currentSchool={data.school || DEFAULT_SCHOOL} onChangeSchool={handleChangeSchool} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize, marginBottom: 4 }}>Meal Plan</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: fontSize > 14 ? 16 : 12 }}>Controls your weekly swipe budget and rollover.</div>
        <MealPlanSelector currentPlan={mealPlan} onChangePlan={handleChangePlan} school={school} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize, marginBottom: 4 }}>Locations</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: fontSize > 14 ? 16 : 12 }}>Add off-campus spots or custom locations.</div>
        <LocationsManager
          defaultLocations={school.locations}
          customLocations={data.customLocations || []}
          onAdd={handleAddLocation}
          onRemove={handleRemoveLocation}
          schoolColor={sc}
        />
      </div>
    </div>
  );

  const modals = (isDesk) => (<>
    {showLog && <LogModal onClose={() => setShowLog(false)} onSave={handleSave}
      allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={isDesk} schoolColor={sc} />}
    {editingMeal && <LogModal onClose={() => setEditingMeal(null)} onSave={handleUpdate}
      allLocations={allLocations} onAddLocation={handleAddLocation} isDesktop={isDesk} editMeal={editingMeal} schoolColor={sc} />}
    {rankingItem && <RankerModal newItem={rankingItem} rankings={data.rankings || {}} onDone={handleRankDone} onSkip={handleRankSkip} isDesktop={isDesk} schoolColor={sc} />}
    {toast && <Toast msg={toast} />}
  </>);

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#eef2f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ background: sc, padding: "0 40px", display: "flex", alignItems: "center",
          justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🍽</span>
            <div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, letterSpacing: 1.5 }}>SWIPES</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>Swipes {school.name}</div>
            </div>
          </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{swipesLeft}</div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10 }}>
                {isUnlimited ? "unlimited plan" : "swipes left this week"}
              </div>
            </div>
            <button onClick={() => setShowLog(true)} style={{
              background: "#fff", color: sc, border: "none", borderRadius: 10,
              padding: "9px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginLeft: 8, whiteSpace: "nowrap",
            }}>+ Log a meal</button>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 40px", display: "grid",
          gridTemplateColumns: tab === "log" ? "1fr 380px" : "1fr", gap: 28 }}>
          {tab === "log" && (<>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Recent meals</div>
              <MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={true} schoolColor={sc} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>This week</div>
              <Stats meals={data.meals} mealPlan={mealPlan} school={school} />
            </div>
          </>)}
          {tab === "stats" && <div style={{ maxWidth: 800 }}><div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Stats & Trends</div><Stats meals={data.meals} mealPlan={mealPlan} school={school} /></div>}
          {tab === "top" && <div style={{ maxWidth: 700 }}><div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>🏆 Top Meals</div><TopMeals rankings={data.rankings || {}} meals={data.meals} onStartComparison={handleManualCompare} onDeleteRanking={handleDeleteRanking} schoolColor={sc} /></div>}
          {tab === "settings" && <div style={{ maxWidth: 600 }}>{settingsContent(20)}</div>}
        </div>
        {modals(true)}
      </div>
    );
  }

  // ── Tablet layout ───────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <div style={{ minHeight: "100vh", background: "#eef2f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ background: sc, padding: "16px 24px 0", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🍽</span>
              <div>
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: 1.5 }}>SWIPES</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>Swipes {school.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 24 }}>{swipesLeft}</div>
                <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10 }}>
                  {isUnlimited ? "unlimited" : "swipes left"}
                </div>
              </div>
              <button onClick={() => setShowLog(true)} style={{
                background: "#fff", color: sc, border: "none", borderRadius: 10,
                padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>+ Log</button>
            </div>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? sc : "rgba(255,255,255,.75)",
                transition: "all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "20px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
          {tab === "log" && <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}><MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={true} schoolColor={sc} /><Stats meals={data.meals} mealPlan={mealPlan} school={school} /></div>}
          {tab === "top" && <div><div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>🏆 Top Meals</div><TopMeals rankings={data.rankings || {}} meals={data.meals} onStartComparison={handleManualCompare} onDeleteRanking={handleDeleteRanking} schoolColor={sc} /></div>}
          {tab === "stats" && <Stats meals={data.meals} mealPlan={mealPlan} school={school} />}
          {tab === "settings" && <div style={{ maxWidth: 600 }}>{settingsContent(18)}</div>}
        </div>
        {modals(false)}
      </div>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: sc, padding: "20px 20px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: 1.5, marginBottom: 3 }}>SWIPES</div>
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>Swipes {school.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{swipesLeft}</div>
            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, marginTop: 2 }}>
              {isUnlimited ? "unlimited" : "swipes left"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? sc : "rgba(255,255,255,.75)",
              transition: "all .15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 16px 110px" }}>
        {tab === "log" && <MealLog meals={data.meals} onDelete={handleDelete} onEdit={handleEdit} onLogNew={() => setShowLog(true)} isDesktop={false} schoolColor={sc} />}
        {tab === "stats" && <Stats meals={data.meals} mealPlan={mealPlan} school={school} />}
        {tab === "top" && <div><div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Top Meals</div><TopMeals rankings={data.rankings || {}} meals={data.meals} onStartComparison={handleManualCompare} onDeleteRanking={handleDeleteRanking} schoolColor={sc} /></div>}
        {tab === "settings" && settingsContent(16)}
      </div>
      {modals(false)}
    </div>
  );
}

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
