import { useState, useEffect } from "react";
import './MonApp.css';


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

// window.storage est fourni par l'environnement qui héberge l'appli.
// On lui dit à TypeScript : "fais confiance, cet objet existera au moment de l'exécution".
// get() et set() sont des fonctions "async" : elles retournent une Promise,
// ce qui veut dire qu'elles peuvent prendre du temps (ex: accès disque ou réseau).
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

  // useEffect avec [] en 2ème argument = s'exécute UNE SEULE FOIS au chargement de la page.
  // On utilise "async/await" parce que window.storage.get() est asynchrone.
  // JSON.parse() convertit la chaîne de caractères stockée en vrai objet JavaScript.
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

  // JSON.stringify() fait l'inverse : convertit un objet en chaîne de caractères pour le stocker.
  const saveData = async (key: string, data: any) => {
    try {
      await window.storage.set(`sp-${key}`, JSON.stringify(data));
      setSaveStatus("Sauvegardé ✓");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch { }
  };

  // Ces useEffect "regardent" les variables events/goals/settings.
  // Dès qu'une d'elles change, on resauvegarde automatiquement.
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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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
    if (!form.startTime || !form.endTime) return alert("Indique une heure de début et de fin.");
    if (timeToMinutes(form.endTime!) <= timeToMinutes(form.startTime!)) {
      return alert("L'heure de fin doit être après l'heure de début.");
    }
    setEvents([...events, { ...form, id: `e${Date.now()}` } as CalendarEvent]);
    setShowForm(false);
  };

  const deleteEvent = (id: string) => setEvents(events.filter((e: CalendarEvent) => e.id !== id));

  // Durée d'un créneau en minutes (ici 1 heure = 60 min)
  const slotMinutes = 60;

  // On précalcule deux choses pour le rendu du tableau :
  // 1. coveredCells : les cellules qu'on ne doit PAS rendre car elles sont "avalées" par
  //    un événement qui s'étend sur plusieurs lignes (ex: un cours de 2h occupe 2 cases).
  // 2. rowSpanMap : pour chaque cellule "de départ", combien de lignes elle doit fusionner.
  //    C'est l'attribut HTML rowSpan qui permet à une cellule de s'étendre verticalement.
  const coveredCells = new Set<string>();
  const rowSpanMap: Record<string, number> = {};

  events.forEach(ev => {
    // On calcule la durée de l'événement en minutes, puis on en déduit combien de lignes il prend.
    // Math.ceil arrondit vers le haut : un cours de 1h30 prend 2 lignes de 1h.
    const startMin = timeToMinutes(ev.startTime);
    const endMin = timeToMinutes(ev.endTime);
    const span = Math.max(1, Math.ceil((endMin - startMin) / slotMinutes));

    // On cherche l'index du créneau qui correspond à l'heure de début de l'événement.
    const startSlotIdx = timeSlots.findIndex(t => t === ev.startTime);
    if (startSlotIdx === -1) return; // L'heure de début est hors de la plage affichée

    const key = `${ev.day}-${startSlotIdx}`;
    rowSpanMap[key] = span;

    // On marque toutes les cellules suivantes comme "couvertes" pour ne pas les afficher.
    for (let i = 1; i < span; i++) {
      if (startSlotIdx + i < timeSlots.length) {
        coveredCells.add(`${ev.day}-${startSlotIdx + i}`);
      }
    }
  });

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
              {timeSlots.map((time, slotIdx) => (
                <tr key={time}>
                  <td className="cal-td-time">{time}</td>
                  {DAYS_FULL.map(day => {
                    const cellKey = `${day}-${slotIdx}`;

                    // On passe cette cellule, elle est déjà occupée par un événement qui s'étend depuis une ligne précédente
                    if (coveredCells.has(cellKey)) return null;

                    const slotEvents = events.filter(e => e.day === day && e.startTime === time);
                    const span = rowSpanMap[cellKey] ?? 1;

                    return (
                      <td
                        key={cellKey}
                        className="cal-td-cell"
                        rowSpan={span}
                        onClick={() => openForm(day, time)}
                        style={{ verticalAlign: "top", padding: 4 }}
                      >
                        {slotEvents.map(ev => (
                          <div
                            key={ev.id}
                            className="event-badge"
                            style={{
                              backgroundColor: ev.color,
                              height: "100%",
                              minHeight: 24,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div>
                              <div className="event-badge-title">{ev.title}</div>
                              <div className="event-badge-time">{ev.startTime} – {ev.endTime}</div>
                            </div>
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
            <div className="form-group">
              <label className="form-label">Jour</label>
              <select className="form-input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
                {DAYS_FULL.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
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
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Couleur</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EVENT_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 30, height: 30, borderRadius: 6, backgroundColor: c, cursor: "pointer",
                      border: form.color === c ? "3px solid #1A202C" : "3px solid transparent",
                    }}
                  />
                ))}
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

  // Cette fonction est appelée quand on clique sur "Générer plan".
  // "async" signifie qu'elle fait des opérations qui prennent du temps (appel réseau).
  const generateAIPlan = async (goal: Goal) => {
    setGenerating(goal.id); // On affiche "Génération..." sur le bouton
    try {
      // fetch() envoie une requête HTTP vers notre serveur backend (port 3001).
      // On utilise la méthode POST pour envoyer des données (l'objectif de l'utilisateur).
      // "Content-Type: application/json" indique qu'on envoie du JSON.
      // JSON.stringify() convertit l'objet goal en texte pour l'envoyer.
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal)
      });
      // res.json() lit la réponse du serveur et la convertit en objet JavaScript.
      const data = await res.json();
      // On met à jour uniquement l'objectif concerné en gardant les autres intacts.
      setGoals(goals.map((g: Goal) => g.id === goal.id ? { ...g, plan: data.plan } : g));
    } catch (err) { alert("Erreur lors de la génération"); }
    setGenerating(null); // On cache le message "Génération..."
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
