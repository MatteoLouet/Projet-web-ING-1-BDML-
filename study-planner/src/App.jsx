import React, { useState } from 'react';
import './MonApp.css';

export default function StudyPlanner() {
  // State pour les événements
  const [events, setEvents] = useState([]);
  
  // State pour le modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  
  // State pour le formulaire
  const [formData, setFormData] = useState({
    title: '',
    type: 'course',
    color: '#FF6B6B'
  });

  // State pour les paramètres
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    startHour: 0,
    endHour: 23
  });

  // Générer les heures selon les paramètres
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < settings.endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Fonction pour ouvrir le modal
  const handleCellClick = (day, time) => {
    setSelectedCell({ day, time });
    setIsModalOpen(true);
  };

  // Fonction pour fermer le modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
    setFormData({
      title: '',
      type: 'course',
      color: '#FF6B6B'
    });
  };

  // Fonction pour sauvegarder l'événement
  const saveEvent = () => {
    if (!formData.title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    const newEvent = {
      id: `evt-${Date.now()}`,
      title: formData.title,
      day: selectedCell.day,
      startTime: selectedCell.time,
      type: formData.type,
      color: formData.color
    };

    setEvents([...events, newEvent]);
    closeModal();
  };

  // Fonction pour vérifier si un événement existe sur une cellule
  const getEventForCell = (day, time) => {
    return events.find(evt => evt.day === day && evt.startTime === time);
  };

  // Fonction pour sauvegarder les paramètres
  const saveSettings = (newSettings) => {
    if (newSettings.startHour >= newSettings.endHour) {
      alert('L\'heure de début doit être inférieure à l\'heure de fin');
      return;
    }
    setSettings(newSettings);
    setShowSettings(false);
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <div className="header-container">
          <h1 className="main-title">AI Study Planner</h1>
          <button className="settings-button" onClick={() => setShowSettings(true)}>
            ⚙️ Paramètres
          </button>
        </div>

        {/* Container du calendrier avec scroll */}
        <div className="calendar-container">
          <div className="calendar-grid">
            {/* Header avec les jours */}
            <div className="calendar-header">
              <div className="time-column-header">Heure</div>
              {daysOfWeek.map(day => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier */}
            <div className="time-rows-container">
              {timeSlots.map((time) => (
                <div 
                  key={time} 
                  className={`time-row ${time.endsWith(':00') ? 'hour-border' : 'half-hour-border'}`}
                >
                  {/* Colonne des heures */}
                  <div className={`time-label ${time.endsWith(':00') ? 'hour' : ''}`}>
                    {time.endsWith(':00') ? time : ''}
                  </div>

                  {/* Cellules pour chaque jour */}
                  {daysOfWeek.map((day) => {
                    const event = getEventForCell(day, time);
                    return (
                      <div 
                        key={`${day}-${time}`} 
                        className="calendar-cell"
                        onClick={() => handleCellClick(day, time)}
                        style={{
                          backgroundColor: event ? event.color : 'transparent'
                        }}
                      >
                        {event && (
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {event.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info en bas */}
        <div className="info-box">
          📅 Calendrier hebdomadaire • 48 créneaux de 30 minutes par jour • Cliquez sur une cellule pour ajouter un événement
        </div>
      </div>

      {/* Modal d'ajout d'événement */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Ajouter un événement</h2>
            
            <div className="modal-info">
              <strong>{selectedCell?.day}</strong> à <strong>{selectedCell?.time}</strong>
            </div>

            <div className="form-group">
              <label>Titre</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Cours de Mathématiques"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="form-select"
              >
                <option value="course">Cours</option>
                <option value="activity">Activité</option>
                <option value="blocked">Bloqué</option>
              </select>
            </div>

            <div className="form-group">
              <label>Couleur</label>
              <div className="color-picker">
                {['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'].map(color => (
                  <div
                    key={color}
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({...formData, color: color})}
                  />
                ))}
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={closeModal}>
                Annuler
              </button>
              <button className="btn-save" onClick={saveEvent}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Page de paramètres */}
      {showSettings && <SettingsPage settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// Composant Settings Page
function SettingsPage({ settings, onSave, onClose }) {
  const [tempSettings, setTempSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState('customization');

  const handleSave = () => {
    onSave(tempSettings);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Paramètres</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'customization' ? 'active' : ''}`}
            onClick={() => setActiveTab('customization')}
          >
            Personnalisation
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'customization' && (
            <div className="customization-panel">
              <h3>Plage horaire du calendrier</h3>
              <p className="setting-description">
                Définissez les heures de début et de fin à afficher sur votre calendrier
              </p>

              <div className="time-range-selector">
                <div className="time-input-group">
                  <label>Heure de début</label>
                  <select 
                    value={tempSettings.startHour}
                    onChange={(e) => setTempSettings({...tempSettings, startHour: parseInt(e.target.value)})}
                    className="time-select"
                  >
                    {Array.from({length: 24}, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div className="time-input-group">
                  <label>Heure de fin</label>
                  <select 
                    value={tempSettings.endHour}
                    onChange={(e) => setTempSettings({...tempSettings, endHour: parseInt(e.target.value)})}
                    className="time-select"
                  >
                    {Array.from({length: 24}, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="preview-info">
                📊 Le calendrier affichera de <strong>{tempSettings.startHour}h</strong> à <strong>{tempSettings.endHour}h</strong>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-save" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}