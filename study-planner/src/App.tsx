import { useState, useEffect } from "react";
import './MonApp.css';

/**
 * --- TYPES (TYPESCRIPT) ---
 * Les interfaces définissent la "forme" de nos données.
 * C'est comme un contrat qui dit : "Une tâche doit avoir un id, un titre, etc."
 */

interface StudyTask {
  id: string;
  title: string;
  description?: string;
  estimatedHours: number;
  difficulty: "easy" | "medium" | "hard";
  type: "theoretical" | "practical";
}

interface StudyWeek {
  weekNumber: number;
  theme: string;
  objectives: string[];
  tasks: StudyTask[];
}

interface Milestone {
  week: number;
  title: string;
}

interface StudyPlan {
  overview: {
    totalWeeks: number;
    totalHours: number;
    approach: string;
  };
  weeks: StudyWeek[];
  milestones: Milestone[];
  tips: string[];
}

interface Goal {
  id: string;
  title: string;
  deadline?: string | null;
  duration?: string | null;
  hoursPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  learningType: "theoretical" | "practical" | "mixed";
  constraints?: string;
  plan?: StudyPlan;
}

interface CalendarEvent {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  type: string;
  color: string;
}

interface Settings {
  startHour: number;
  endHour: number;
  slotMinutes: 30 | 60;
}

// Extension pour l'objet window (stockage par le navigateur)
declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

/** --- CONSTANTES --- **/

const EVENT_COLORS = ["#FF6B6B", "#00C9A7", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** --- COMPOSANT PRINCIPAL --- **/

export default function AIStudyPlanner() {
  // useState permet de mémoriser des données qui font changer l'affichage quand elles sont modifiées
  const [view, setView] = useState<"schedule" | "goals">("schedule");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<Settings>({ startHour: 7, endHour: 22, slotMinutes: 60 });
  const [saveStatus, setSaveStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // useEffect s'exécute à des moments précis (ici au chargement de la page)
  useEffect(() => {
    const load = async () => {
      try {
        const e = await window.storage.get("sp-events");
        if (e?.value) setEvents(JSON.parse(e.value));
        const g = await window.storage.get("sp-goals");
        if (g?.value) setGoals(JSON.parse(g.value));
        const s = await window.storage.get("sp-settings");
        if (s?.value) setSettings(JSON.parse(s.value));
      } catch (err) { console.error("Erreur chargement:", err); }
    };
    load();
  }, []);

  // On sauvegarde automatiquement quand les données changent
  const saveData = async (key: string, data: any) => {
    try {
      await window.storage.set(`sp-${key}`, JSON.stringify(data));
      setSaveStatus("Sauvegardé ✓");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch { }
  };

  useEffect(() => { if (events.length > 0) saveData("events", events); }, [events]);
  useEffect(() => { if (goals.length > 0) saveData("goals", goals); }, [goals]);
  useEffect(() => { saveData("settings", settings); }, [settings]);

  // Génère les heures affichées dans le calendrier
  const generateSlots = () => {
    const slots: string[] = [];
    for (let h = settings.startHour; h < settings.endHour; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (settings.slotMinutes === 30) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    slots.push(`${String(settings.endHour).padStart(2, "0")}:00`);
    return slots;
  };

  return (
    <div className="app">
      <div className="container">
        {/* En-tête de l'application */}
        <div className="header">
          <div>
            <h1 className="header-title">AI Study Planner</h1>
            <p className="header-sub">Organise ton apprentissage avec l'IA</p>
          </div>
          <div className="header-actions">
            {saveStatus && <span className="save-indicator">{saveStatus}</span>}
            <button className="btn btn-ghost-white" onClick={() => setShowSettings(true)}>Paramètres</button>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="tabs">
          <button className={`tab-btn ${view === "schedule" ? "active" : ""}`} onClick={() => setView("schedule")}>
            Emploi du temps
          </button>
          <button className={`tab-btn ${view === "goals" ? "active" : ""}`} onClick={() => setView("goals")}>
            Objectifs
          </button>
        </div>

        {/* Contenu principal selon l'onglet actif */}
        {view === "schedule" ? (
          <ScheduleView events={events} setEvents={setEvents} timeSlots={generateSlots()} />
        ) : (
          <GoalsView goals={goals} setGoals={setGoals} events={events} setEvents={setEvents} setView={setView} />
        )}

        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={(s: Settings) => { setSettings(s); setShowSettings(false); }}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

/** --- VUE EMPLOI DU TEMPS --- **/

function ScheduleView({ events, setEvents, timeSlots }: { events: CalendarEvent[], setEvents: any, timeSlots: string[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CalendarEvent>>({
    title: "", day: "Lundi", startTime: "09:00", endTime: "10:00", type: "course", color: "#FF6B6B"
  });

  const openForm = (day = "Lundi", start = "09:00") => {
    const hour = parseInt(start.split(":")[0]);
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    setForm({ ...form, title: "", day, startTime: start, endTime: end });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title) return alert("Donne un titre à ton événement !");
    setEvents([...events, { ...form, id: `e${Date.now()}` } as CalendarEvent]);
    setShowForm(false);
  };

  const deleteEvent = (id: string) => setEvents(events.filter(e => e.id !== id));

  return (
    <>
      <div className="calendar-toolbar">
        <button className="btn btn-primary" onClick={() => openForm()}>+ Créer un événement</button>
      </div>

      <div className="card">
        <div className="calendar-scroll">
          <table className="calendar-table">
            <thead>
              <tr>
                <th className="cal-th-time"></th>
                {DAYS_FULL.map(d => <th key={d} className="cal-th-day">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={time}>
                  <td className="cal-td-time">{time}</td>
                  {DAYS_FULL.map(day => {
                    const slotEvents = events.filter(e => e.day === day && e.startTime === time);
                    return (
                      <td key={`${day}-${time}`} className="cal-td-cell" onClick={() => openForm(day, time)}>
                        {slotEvents.map(ev => (
                          <div key={ev.id} className="event-badge" style={{ backgroundColor: ev.color }} onClick={e => e.stopPropagation()}>
                            <div className="event-badge-title">{ev.title}</div>
                            <div className="event-badge-time">{ev.startTime} - {ev.endTime}</div>
                            <button className="event-badge-remove" onClick={() => deleteEvent(ev.id)}>×</button>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nouvel événement</h2>
            <div className="form-group">
              <label className="form-label">Titre</label>
              <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-row-2">
              <div>
                <label className="form-label">Début</label>
                <input type="time" className="form-input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Fin</label>
                <input type="time" className="form-input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** --- VUE OBJECTIFS --- **/

function GoalsView({ goals, setGoals, events, setEvents, setView }: any) {
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<Goal | null>(null);

  const generateAIPlan = async (goal: Goal) => {
    setGenerating(goal.id);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal)
      });
      const data = await res.json();
      setGoals(goals.map((g: Goal) => g.id === goal.id ? { ...g, plan: data.plan } : g));
    } catch (err) { alert("Erreur IA"); }
    setGenerating(null);
  };

  const addWeekToCalendar = (plan: StudyPlan, weekIdx: number) => {
    const week = plan.weeks[weekIdx];
    const newEvents: CalendarEvent[] = [];
    let currentDayIdx = 0; // Lundi
    let currentHour = 9;

    week.tasks.forEach(task => {
      // On place les tâches une par une à partir de 9h
      newEvents.push({
        id: `e-${Date.now()}-${Math.random()}`,
        title: task.title,
        day: DAYS_FULL[currentDayIdx],
        startTime: `${String(currentHour).padStart(2, "0")}:00`,
        endTime: `${String(currentHour + 1).padStart(2, "0")}:00`,
        color: EVENT_COLORS[currentDayIdx],
        type: "course"
      });
      currentHour++;
      if (currentHour > 17) { currentHour = 9; currentDayIdx++; }
    });

    setEvents([...events, ...newEvents]);
    setView("schedule");
    setActivePlan(null);
  };

  return (
    <div className="goals-view">
      <div className="card goals-header-card">
        <h2 className="goals-title">Mes Objectifs d'apprentissage</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nouvel objectif</button>
      </div>

      <div className="goals-grid">
        {goals.map((g: Goal) => (
          <div key={g.id} className="goal-card">
            <h3>{g.title}</h3>
            <p className="goal-tag">{g.level} • {g.hoursPerWeek}h/semaine</p>
            <div className="goal-actions">
              <button className="btn-generate" onClick={() => generateAIPlan(g)} disabled={generating === g.id}>
                {generating === g.id ? "Génération..." : g.plan ? "Régénérer" : "Générer plan IA"}
              </button>
              {g.plan && <button className="btn btn-ghost" onClick={() => setActivePlan(g)}>Voir le plan</button>}
              <button className="btn btn-danger btn-sm" onClick={() => setGoals(goals.filter((x: any) => x.id !== g.id))}>Suppr.</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <GoalForm onClose={() => setShowForm(false)} onSave={(g: any) => { setGoals([...goals, g]); setShowForm(false); }} />
      )}

      {activePlan && (
        <PlanModal goal={activePlan} onClose={() => setActivePlan(null)} onAddWeek={addWeekToCalendar} />
      )}
    </div>
  );
}

/** --- FORMULAIRE OBJECTIF --- **/

function GoalForm({ onClose, onSave }: any) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("beginner");
  const [hours, setHours] = useState(5);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Nouvel objectif</h2>
        <div className="form-group">
          <label className="form-label">Que veux-tu apprendre ?</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: React, Japonais..." />
        </div>
        <div className="form-group">
          <label className="form-label">Niveau</label>
          <select className="form-input" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Heures par semaine : {hours}h</label>
          <input type="range" min="1" max="40" value={hours} className="form-range" onChange={e => setHours(parseInt(e.target.value))} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave({ title, level, hoursPerWeek: hours, id: `g${Date.now()}` })}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

/** --- MODALE DU PLAN IA --- **/

function PlanModal({ goal, onClose, onAddWeek }: any) {
  const plan: StudyPlan = goal.plan;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Plan pour {goal.title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
        <p className="plan-approach">{plan.overview.approach}</p>
        <div className="weeks-list">
          {plan.weeks.map((w, i) => (
            <div key={i} className="week-row">
              <div className="week-row-header">
                <span className="week-row-title">Semaine {w.weekNumber}: {w.theme}</span>
                <button className="btn btn-xs btn-primary" onClick={() => onAddWeek(plan, i)}>Ajouter au calendrier</button>
              </div>
              <ul className="tips-list">
                {w.tasks.slice(0, 3).map((t, j) => <li key={j}>{t.title} ({t.estimatedHours}h)</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** --- MODALE PARAMÈTRES --- **/

function SettingsModal({ settings, onSave, onClose }: any) {
  const [s, setS] = useState(settings);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--narrow" onClick={e => e.stopPropagation()}>
        <h2 className="settings-title">Paramètres</h2>
        <div className="form-group">
          <label className="form-label">Plage horaire</label>
          <div className="settings-grid">
            <div>
              <label className="form-label">Début</label>
              <input type="number" className="form-input" value={s.startHour} onChange={e => setS({ ...s, startHour: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="form-label">Fin</label>
              <input type="number" className="form-input" value={s.endHour} onChange={e => setS({ ...s, endHour: parseInt(e.target.value) })} />
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(s)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
