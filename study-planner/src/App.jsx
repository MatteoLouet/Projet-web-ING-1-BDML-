import { useState, useEffect } from "react";
import './MonApp.css';

const EVENT_COLORS = [
  "#FF6B6B", "#00C9A7", "#45B7D1",
  "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE",
];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function AIStudyPlanner() {
  const [view, setView] = useState("schedule");
  const [events, setEvents] = useState([]);
  const [goals, setGoals] = useState([]);
  const [settings, setSettings] = useState({ startHour: 7, endHour: 22, slotMinutes: 60 });
  const [saveStatus, setSaveStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (events.length > 0) saveData("events", events); }, [events]);
  useEffect(() => { if (goals.length > 0) saveData("goals", goals); }, [goals]);
  useEffect(() => { saveData("settings", settings); }, [settings]);

  const loadData = async () => {
    try {
      const e = await window.storage.get("sp-events");
      if (e?.value) setEvents(JSON.parse(e.value));
      const g = await window.storage.get("sp-goals");
      if (g?.value) setGoals(JSON.parse(g.value));
      const s = await window.storage.get("sp-settings");
      if (s?.value) setSettings(JSON.parse(s.value));
    } catch { }
  };

  const saveData = async (key, data) => {
    try {
      await window.storage.set(`sp-${key}`, JSON.stringify(data));
      setSaveStatus("Sauvegardé ✓");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch { }
  };

  const generateSlots = () => {
    const slots = [];
    const step = settings.slotMinutes || 60;
    for (let h = settings.startHour; h < settings.endHour; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (step === 30) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    slots.push(`${String(settings.endHour).padStart(2, "0")}:00`);
    return slots;
  };

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div>
            <h1 className="header-title">AI Study Planner</h1>
            <p className="header-sub">Organise ton apprentissage intelligemment</p>
          </div>
          <div className="header-actions">
            {saveStatus && <span className="save-indicator">{saveStatus}</span>}
            <button className="btn btn-ghost-white" onClick={() => setShowSettings(true)}>
              Paramètres
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn${view === "schedule" ? " active" : ""}`}
            onClick={() => setView("schedule")}
          >
            Emploi du temps
          </button>
          <button
            className={`tab-btn${view === "goals" ? " active" : ""}`}
            onClick={() => setView("goals")}
          >
            Objectifs
          </button>
        </div>

        {/* Views */}
        {view === "schedule" ? (
          <ScheduleView events={events} setEvents={setEvents} timeSlots={generateSlots()} />
        ) : (
          <GoalsView goals={goals} setGoals={setGoals} events={events} setEvents={setEvents} setView={setView} />
        )}

        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={(s) => { setSettings(s); setShowSettings(false); }}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

function ScheduleView({ events, setEvents, timeSlots }) {
  const [showForm, setShowForm] = useState(false);
  const defaultForm = { title: "", day: "Lundi", startTime: "09:00", endTime: "10:00", type: "course", color: "#FF6B6B" };
  const [form, setForm] = useState(defaultForm);

  const openAdd = (day = "Lundi", startTime = "09:00") => {
    const [h, m] = startTime.split(":").map(Number);
    const endH = Math.min(h + 1, 23);
    const endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setForm({ ...defaultForm, day, startTime, endTime });
    setShowForm(true);
  };

  const close = () => setShowForm(false);

  const save = () => {
    if (!form.title.trim()) return;
    if (form.startTime >= form.endTime) {
      alert("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setEvents([...events, {
      id: `e${Date.now()}`,
      title: form.title,
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
      type: form.type,
      color: form.color,
    }]);
    close();
  };

  const removeEvent = (id, e) => {
    e.stopPropagation();
    setEvents(events.filter(ev => ev.id !== id));
  };

  const getEventsInSlot = (day, slotTime, nextSlotTime) =>
    events.filter(ev => {
      if (ev.day !== day) return false;
      if (ev.startTime < slotTime) return false;
      if (nextSlotTime && ev.startTime >= nextSlotTime) return false;
      return true;
    });

  return (
    <>
      <div className="calendar-toolbar">
        <button className="btn btn-primary" onClick={() => openAdd()}>
          + Créer un événement
        </button>
      </div>

      <div className="card">
        <div className="calendar-scroll">
          <table className="calendar-table">
            <thead>
              <tr className="cal-thead-row">
                <th className="cal-th-time"></th>
                {DAYS_FULL.map((d, i) => (
                  <th key={d} className={`cal-th-day${i >= 5 ? " cal-th-day--weekend" : ""}`}>
                    <span className="cal-th-abbr">{DAYS[i]}</span>
                    <span className="cal-th-full">{d}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => {
                const isHour = time.endsWith(":00");
                const nextSlotTime = timeSlots[idx + 1] || null;
                return (
                  <tr key={time}>
                    <td className={`cal-td-time${isHour ? "" : " cal-td-time--half"}`}>
                      {time}
                    </td>
                    {DAYS_FULL.map((day) => {
                      const slotEvents = getEventsInSlot(day, time, nextSlotTime);
                      return (
                        <td
                          key={`${day}-${time}`}
                          className={`cal-td-cell${isHour ? "" : " cal-td-cell--half"}`}
                          onClick={() => openAdd(day, time)}
                        >
                          {slotEvents.map(ev => (
                            <div
                              key={ev.id}
                              className="event-badge"
                              style={{ backgroundColor: ev.color }}
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="event-badge-body">
                                <div className="event-badge-title">{ev.title}</div>
                                {ev.endTime && (
                                  <div className="event-badge-time">
                                    {ev.startTime} – {ev.endTime}
                                  </div>
                                )}
                              </div>
                              <button
                                className="event-badge-remove"
                                onClick={(e) => removeEvent(ev.id, e)}
                              >×</button>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Créer un événement</h2>

            <div className="form-group">
              <label className="form-label">Titre</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Mathématiques, Sport, Réunion..."
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jour</label>
              <select
                className="form-input"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
              >
                {DAYS_FULL.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-row-2 form-row-2--sm form-group">
              <div>
                <label className="form-label">Début</label>
                <input type="time" className="form-input" value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Fin</label>
                <input type="time" className="form-input" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="option-row">
                {[{ v: "course", l: "Cours" }, { v: "activity", l: "Activité" }, { v: "blocked", l: "Bloqué" }]
                  .map(({ v, l }) => (
                    <button
                      key={v}
                      className={`option-btn${form.type === v ? " active" : ""}`}
                      onClick={() => setForm({ ...form, type: v })}
                    >{l}</button>
                  ))}
              </div>
            </div>

            <div className="form-group form-group--lg">
              <label className="form-label">Couleur</label>
              <div className="color-picker">
                {EVENT_COLORS.map((c) => (
                  <div
                    key={c}
                    className={`color-swatch${form.color === c ? " selected" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button className="btn btn-ghost" onClick={close}>Annuler</button>
              <button className="btn btn-primary" onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoalsView({ goals, setGoals, events, setEvents, setView }) {
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);

  const addPlanToCalendar = (plan, weekNumber) => {
    const week = plan.weeks?.find(w => w.weekNumber === weekNumber);
    if (!week || !week.tasks?.length) {
      alert("Aucune tâche à ajouter pour cette semaine.");
      return;
    }

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const newEvents = [];
    let dayIndex = 0;
    let hour = 9;
    let minute = 0;

    const isSlotFree = (day, time) =>
      !events.some(e => e.day === day && e.startTime === time) &&
      !newEvents.some(e => e.day === day && e.startTime === time);

    const findNextFreeSlot = () => {
      while (dayIndex < days.length) {
        const time = `${String(hour).padStart(2, "0")}:${minute === 0 ? "00" : "30"}`;
        if (hour < 20 && isSlotFree(days[dayIndex], time)) return { day: days[dayIndex], time };
        minute += 30;
        if (minute >= 60) { minute = 0; hour++; }
        if (hour >= 20) { dayIndex++; hour = 9; minute = 0; }
      }
      return null;
    };

    for (const task of week.tasks) {
      const slotsNeeded = Math.max(1, Math.round((task.estimatedHours || 1) * 2));
      const colorIndex = newEvents.length % EVENT_COLORS.length;
      for (let s = 0; s < slotsNeeded; s++) {
        const slot = findNextFreeSlot();
        if (!slot) break;
        newEvents.push({
          id: `e${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: task.title,
          day: slot.day,
          startTime: slot.time,
          type: task.type || "course",
          color: EVENT_COLORS[colorIndex],
        });
        minute += 30;
        if (minute >= 60) { minute = 0; hour++; }
        if (hour >= 20) { dayIndex++; hour = 9; minute = 0; }
      }
    }

    if (newEvents.length === 0) {
      alert("Aucun créneau libre disponible dans le calendrier.");
      return;
    }
    setEvents([...events, ...newEvents]);
    setView("schedule");
    setViewPlan(null);
  };

  const handleGenerate = async (g) => {
    setGenerating(g.id);
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: g.title, level: g.level, hoursPerWeek: g.hoursPerWeek,
          learningType: g.learningType, deadline: g.deadline || null,
          duration: g.duration || null, constraints: g.constraints || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de la génération du plan");
      setGoals(goals.map(x => x.id === g.id ? { ...x, plan: data.plan, planGeneratedAt: new Date().toISOString() } : x));
    } catch (e) {
      alert(`Erreur de génération: ${e.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const deleteGoal = (id) => {
    if (confirm("Supprimer cet objectif ?")) setGoals(goals.filter(x => x.id !== id));
  };

  const levelLabel = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };
  const typeLabel = { theoretical: "Théorique", practical: "Pratique", mixed: "Mixte" };

  return (
    <div className="goals-view">
      <div className="card goals-header-card">
        <div>
          <h2 className="goals-title">Mes Objectifs</h2>
          <p className="goals-meta">
            {goals.length} objectif{goals.length !== 1 ? "s" : ""} · {goals.filter(g => g.plan).length} planifié{goals.filter(g => g.plan).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEdit(null); setShowForm(true); }}>
          + Nouvel objectif
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">Aucun objectif pour l'instant</h3>
          <p className="empty-state-text">Crée ton premier objectif et génère un plan d'apprentissage personnalisé.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Créer mon premier objectif
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((g) => (
            <div key={g.id} className="goal-card">
              <div className="goal-card-header">
                <h3 className="goal-card-title">{g.title}</h3>
                <span className={`goal-status${g.plan ? " goal-status--planned" : " goal-status--not-planned"}`}>
                  {g.plan ? "✓ Planifié" : "Non planifié"}
                </span>
              </div>

              <div className="goal-tags">
                {[
                  { text: levelLabel[g.level] || g.level },
                  { text: typeLabel[g.learningType] || g.learningType },
                  { text: `${g.hoursPerWeek}h/sem` },
                  g.deadline && { text: new Date(g.deadline).toLocaleDateString("fr-FR") },
                  g.duration && { text: g.duration },
                ].filter(Boolean).map(({ text }, i) => (
                  <span key={i} className="goal-tag">{text}</span>
                ))}
              </div>

              {g.constraints && <p className="goal-constraints">{g.constraints}</p>}

              <div className="goal-actions">
                <button
                  className={`btn-generate${g.plan ? " btn-generate--regen" : ""}${generating === g.id ? " btn-generate--loading" : ""}`}
                  onClick={() => handleGenerate(g)}
                  disabled={generating === g.id}
                >
                  {generating === g.id ? "Génération..." : g.plan ? "Régénérer" : "Générer plan"}
                </button>
                {g.plan && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setViewPlan(g)}>Voir</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setEdit(g); setShowForm(true); }}>Édit.</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteGoal(g.id)}>Suppr.</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm
          initialData={edit}
          onClose={() => { setShowForm(false); setEdit(null); }}
          onSave={(data) => {
            if (edit) {
              setGoals(goals.map(x => x.id === edit.id ? { ...data, id: edit.id, plan: edit.plan } : x));
            } else {
              setGoals([...goals, { ...data, id: `g${Date.now()}` }]);
            }
            setShowForm(false);
            setEdit(null);
          }}
        />
      )}

      {viewPlan && <PlanModal goal={viewPlan} onClose={() => setViewPlan(null)} onAddToCalendar={addPlanToCalendar} />}
    </div>
  );
}

function GoalForm({ initialData, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState(initialData || {
    title: "", deadline: "", duration: "", durationType: "weeks",
    hoursPerWeek: 5, level: "beginner", learningType: "mixed", constraints: "",
  });

  const next = () => {
    if (step === 1 && !d.title.trim()) return;
    if (step < 3) setStep(step + 1);
  };

  const submit = () => onSave({
    ...d,
    duration: d.duration ? `${d.duration} ${d.durationType}` : null,
    createdAt: new Date().toISOString(),
    status: "active",
    progress: 0,
  });

  const stepLabels = ["Objectif", "Disponibilité", "Préférences"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--medium" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title" style={{ fontSize: 22 }}>
          {initialData ? "Modifier l'objectif" : "Nouvel objectif"}
        </h2>

        {/* Step indicator */}
        <div className="step-indicator">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="step-item">
              <div className={`step-dot${step >= s ? " active" : ""}`}>{s}</div>
              <span className={`step-label${step >= s ? " active" : ""}`}>{stepLabels[i]}</span>
              {i < 2 && <div className={`step-connector${step > s ? " active" : ""}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label">Titre de l'objectif *</label>
              <input className="form-input" value={d.title}
                onChange={(e) => setD({ ...d, title: e.target.value })}
                placeholder="Ex: Apprendre React, Maîtriser Excel..." autoFocus />
            </div>
            <div className="form-row-2">
              <div>
                <label className="form-label">Date limite</label>
                <input type="date" className="form-input" value={d.deadline}
                  onChange={(e) => setD({ ...d, deadline: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Durée</label>
                <div className="form-inline">
                  <input type="number" className="form-input form-input--flex" value={d.duration}
                    onChange={(e) => setD({ ...d, duration: e.target.value })} placeholder="12" />
                  <select className="form-input form-input--flex-sm" value={d.durationType}
                    onChange={(e) => setD({ ...d, durationType: e.target.value })}>
                    <option value="weeks">Sem.</option>
                    <option value="months">Mois</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group">
              <label className="form-label">Temps disponible: {d.hoursPerWeek}h / semaine</label>
              <input type="range" min="1" max="40" value={d.hoursPerWeek}
                className="form-range"
                onChange={(e) => setD({ ...d, hoursPerWeek: parseInt(e.target.value) })} />
              <div className="range-labels">
                <span>1h</span><span>20h</span><span>40h</span>
              </div>
            </div>
            <div>
              <label className="form-label">Niveau actuel</label>
              {["beginner", "intermediate", "advanced"].map((l) => (
                <div key={l} className={`radio-option${d.level === l ? " active" : ""}`}
                  onClick={() => setD({ ...d, level: l })}>
                  <div className={`radio-dot${d.level === l ? " active" : ""}`} />
                  <div>
                    <div className="radio-label">
                      {l === "beginner" ? "Débutant" : l === "intermediate" ? "Intermédiaire" : "Avancé"}
                    </div>
                    <div className="radio-sub">
                      {l === "beginner" ? "Je commence de zéro" : l === "intermediate" ? "J'ai quelques bases" : "Je veux approfondir"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="form-group">
              <label className="form-label">Style d'apprentissage</label>
              {["theoretical", "practical", "mixed"].map((t) => (
                <div key={t} className={`radio-option${d.learningType === t ? " active" : ""}`}
                  onClick={() => setD({ ...d, learningType: t })}>
                  <div className={`radio-dot${d.learningType === t ? " active" : ""}`} />
                  <div>
                    <div className="radio-label">
                      {t === "theoretical" ? "Théorique" : t === "practical" ? "Pratique" : "Mixte"}
                    </div>
                    <div className="radio-sub">
                      {t === "theoretical" ? "Cours, lectures, concepts" : t === "practical" ? "Projets, exercices, labs" : "Équilibre théorie & pratique"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="form-label">Contexte & contraintes (optionnel)</label>
              <textarea className="form-textarea" value={d.constraints}
                onChange={(e) => setD({ ...d, constraints: e.target.value })}
                placeholder="Ex: Je veux apprendre pour mon travail, je préfère les vidéos..." />
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost"
            onClick={step === 1 ? onClose : () => setStep(step - 1)}>
            {step === 1 ? "Annuler" : "← Retour"}
          </button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={next}>Suivant →</button>
          ) : (
            <button className="btn btn-primary" onClick={submit}>
              {initialData ? "Enregistrer" : "Créer l'objectif"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanModal({ goal, onClose, onAddToCalendar }) {
  const [addedWeeks, setAddedWeeks] = useState([]);
  const plan = goal.plan;
  if (!plan) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ marginBottom: 4 }}>Plan : {goal.title}</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              {plan.overview?.totalWeeks} semaines · {plan.overview?.totalHours}h au total
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Fermer</button>
        </div>

        {plan.overview?.approach && (
          <div className="plan-approach">{plan.overview.approach}</div>
        )}

        {plan.milestones?.length > 0 && (
          <div>
            <p className="plan-section-title">Jalons clés</p>
            <div className="milestones-row">
              {plan.milestones.map((m, i) => (
                <div key={i} className="milestone-badge">S{m.week}: {m.title}</div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="plan-section-title">Programme semaine par semaine</p>
          <div className="weeks-list">
            {plan.weeks?.slice(0, 6).map((w, i) => (
              <div key={i} className="week-row">
                <div className="week-row-header">
                  <span className="week-row-title">Semaine {w.weekNumber}: {w.theme}</span>
                  <div className="week-row-meta">
                    <span className="week-task-count">{w.tasks?.length} tâches</span>
                    {onAddToCalendar && (
                      <button
                        className={`btn btn-xs ${addedWeeks.includes(w.weekNumber) ? "btn-ghost" : "btn-primary"}`}
                        style={{ opacity: addedWeeks.includes(w.weekNumber) ? 0.6 : 1 }}
                        disabled={addedWeeks.includes(w.weekNumber)}
                        onClick={() => { onAddToCalendar(plan, w.weekNumber); setAddedWeeks([...addedWeeks, w.weekNumber]); }}
                      >
                        {addedWeeks.includes(w.weekNumber) ? "Ajouté" : "Ajouter"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="objectives-row">
                  {w.objectives?.map((o, j) => (
                    <span key={j} className="objective-tag">— {o}</span>
                  ))}
                </div>
              </div>
            ))}
            {plan.weeks?.length > 6 && (
              <p className="more-weeks">+ {plan.weeks.length - 6} semaines supplémentaires...</p>
            )}
          </div>
        </div>

        {plan.tips?.length > 0 && (
          <div>
            <p className="plan-section-title">Conseils</p>
            <ul className="tips-list">
              {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [s, setS] = useState(settings);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--narrow" onClick={(e) => e.stopPropagation()}>
        <h2 className="settings-title">Paramètres</h2>

        <div className="form-group">
          <label className="form-label">Plage horaire du calendrier</label>
          <div className="settings-grid">
            {["startHour", "endHour"].map((key) => (
              <div key={key}>
                <label className="form-label">{key === "startHour" ? "Début" : "Fin"}</label>
                <select className="form-input" value={s[key]}
                  onChange={(e) => setS({ ...s, [key]: parseInt(e.target.value) })}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group form-group--lg">
          <label className="form-label">Granularité des créneaux</label>
          <div className="slot-row">
            {[{ v: 60, l: "1 heure" }, { v: 30, l: "30 minutes" }].map(({ v, l }) => (
              <button
                key={v}
                className={`slot-btn${(s.slotMinutes || 60) === v ? " active" : ""}`}
                onClick={() => setS({ ...s, slotMinutes: v })}
              >{l}</button>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary"
            onClick={() => {
              if (s.startHour >= s.endHour) { alert("L'heure de début doit être avant la fin"); return; }
              onSave(s);
            }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
