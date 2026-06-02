import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Clock, 
  Activity, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Info
} from 'lucide-react';
import './App.css';

// Helper function to format seconds to HH:MM:SS
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Helper to format session times (e.g., 04:30:15 PM)
function formatSessionTime(timestamp) {
  if (!timestamp) return '...';
  const date = new Date(timestamp);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

// Helper to format durations for report (e.g. 2h 14m 5s)
function formatTimeForReport(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  let timeString = "";
  if (h > 0) timeString += `${h}h `;
  if (m > 0 || h > 0) timeString += `${m}m `;
  timeString += `${s}s`;

  return timeString || "0s";
}

export default function App() {
  // Projects state
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('timeTrackerDataReact');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [taskName, setTaskName] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [ticker, setTicker] = useState(0);

  // Clocks states
  const [clockTime, setClockTime] = useState(new Date());

  // Save projects to localstorage whenever they change
  useEffect(() => {
    localStorage.setItem('timeTrackerDataReact', JSON.stringify(projects));
  }, [projects]);

  // Clock tick & Live timer update tick
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setClockTime(new Date());
    }, 100);

    const tickerInterval = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(tickerInterval);
    };
  }, []);

  // Handle storage sync across tabs
  useEffect(() => {
    const syncStorage = (e) => {
      if (e.key === 'timeTrackerDataReact') {
        const newData = JSON.parse(e.newValue) || [];
        setProjects(newData);
      }
    };
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, []);

  // Add a task
  const addProject = () => {
    const name = taskName.trim();
    if (!name) {
      alert("Please enter a task name!");
      return;
    }
    const newProject = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      name: name,
      timeInSeconds: 0,
      isRunning: false,
      lastStarted: null,
      sessions: [] // detailed list of runs: { startedAt, endedAt, duration }
    };
    setProjects([...projects, newProject]);
    setTaskName('');
  };

  // Toggle dynamic timer with background accuracy
  const toggleTimer = (id) => {
    const now = Date.now();
    setProjects(prevProjects => {
      return prevProjects.map(proj => {
        if (proj.id === id) {
          if (!proj.isRunning) {
            // Start this project
            const newSession = {
              startedAt: now,
              endedAt: null,
              duration: 0
            };
            return {
              ...proj,
              isRunning: true,
              lastStarted: now,
              sessions: [...(proj.sessions || []), newSession]
            };
          } else {
            // Pause this project
            const elapsed = Math.floor((now - proj.lastStarted) / 1000);
            const updatedSessions = (proj.sessions || []).map((sess, idx) => {
              if (idx === proj.sessions.length - 1 && sess.endedAt === null) {
                return {
                  ...sess,
                  endedAt: now,
                  duration: elapsed
                };
              }
              return sess;
            });
            return {
              ...proj,
              isRunning: false,
              timeInSeconds: proj.timeInSeconds + elapsed,
              lastStarted: null,
              sessions: updatedSessions
            };
          }
        } else {
          // Pause any other running project
          if (proj.isRunning) {
            const elapsed = Math.floor((now - proj.lastStarted) / 1000);
            const updatedSessions = (proj.sessions || []).map((sess, idx) => {
              if (idx === proj.sessions.length - 1 && sess.endedAt === null) {
                return {
                  ...sess,
                  endedAt: now,
                  duration: elapsed
                };
              }
              return sess;
            });
            return {
              ...proj,
              isRunning: false,
              timeInSeconds: proj.timeInSeconds + elapsed,
              lastStarted: null,
              sessions: updatedSessions
            };
          }
          return proj;
        }
      });
    });
  };

  // Delete project
  const deleteProject = (id) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  // Clear all projects
  const clearAll = () => {
    if (window.confirm("Clear all logs and session history?")) {
      setProjects([]);
    }
  };

  // Toggle sessions list dropdown
  const toggleSessionsView = (id) => {
    setExpandedSessions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Compute live current elapsed time for rendering
  const getElapsedTime = (proj) => {
    if (proj.isRunning && proj.lastStarted) {
      const liveElapsed = Math.floor((Date.now() - proj.lastStarted) / 1000);
      return proj.timeInSeconds + liveElapsed;
    }
    return proj.timeInSeconds;
  };

  // Generate Report: Pauses all first
  const generateReport = () => {
    const now = Date.now();
    // Pause any running
    setProjects(prev => {
      return prev.map(proj => {
        if (proj.isRunning) {
          const elapsed = Math.floor((now - proj.lastStarted) / 1000);
          const updatedSessions = (proj.sessions || []).map((sess, idx) => {
            if (idx === proj.sessions.length - 1 && sess.endedAt === null) {
              return {
                ...sess,
                endedAt: now,
                duration: elapsed
              };
            }
            return sess;
          });
          return {
            ...proj,
            isRunning: false,
            timeInSeconds: proj.timeInSeconds + elapsed,
            lastStarted: null,
            sessions: updatedSessions
          };
        }
        return proj;
      });
    });
    setShowReport(true);
  };

  // Calculate hands rotations
  const hr = clockTime.getHours();
  const min = clockTime.getMinutes();
  const sec = clockTime.getSeconds();
  const ms = clockTime.getMilliseconds();
  const hr_rotation = (30 * hr) + (min / 2);
  const min_rotation = (6 * min) + (sec / 10);
  const sec_rotation = (6 * sec) + (6 * ms / 1000);

  // Digital clock text
  let hours = clockTime.getHours();
  const minutesStr = String(clockTime.getMinutes()).padStart(2, '0');
  const secondsStr = String(clockTime.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const displayHours = String(hours).padStart(2, '0');
  const digitalTimeStr = `${displayHours}:${minutesStr}:${secondsStr} ${ampm}`;

  // Date
  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = clockTime.toLocaleDateString('en-US', dateOptions);

  // Total elapsed overall
  const totalOverall = projects.reduce((acc, p) => acc + getElapsedTime(p), 0);

  return (
    <main className="dashboard-container">
      {/* Left side panel */}
      <section className="dashboard-clock-panel">
        <header>
          <h1>WorkLog Tracker Pro</h1>
          <p className="subtitle">
            <span className="pulse-dot"></span>
            <span>React Edition • Ultimate Accuracy</span>
          </p>
        </header>

        <div className="clocks-container">
          {/* Analog Clock */}
          <div className="analog-clock">
            <div className="face">
              <div className="marker marker-12"><span className="marker-text">12</span></div>
              <div className="marker marker-3"><span className="marker-text">3</span></div>
              <div className="marker marker-6"><span className="marker-text">6</span></div>
              <div className="marker marker-9"><span className="marker-text">9</span></div>
              
              <div className="hand hour-hand" style={{ transform: `rotate(${hr_rotation}deg)` }}></div>
              <div className="hand minute-hand" style={{ transform: `rotate(${min_rotation}deg)` }}></div>
              <div className="hand second-hand" style={{ transform: `rotate(${sec_rotation}deg)` }}></div>
              <div className="center-cap"></div>
            </div>
          </div>

          {/* Digital Clock */}
          <div className="digital-clock-widget">
            <div className="digital-time">{digitalTimeStr}</div>
            <div className="digital-date">{dateStr}</div>
          </div>

          {/* Phone access instructions */}
          <div className="network-info-widget">
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} /> Mobile Phone Access:
            </span>
            <span>1. Connect your phone & laptop to same Wi-Fi.</span>
            <span>2. Open Network URL shown in command line:</span>
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-all' }}>
              http://{"<your-laptop-ip>"}:5173
            </code>
          </div>
        </div>
      </section>

      {/* Right side panel */}
      <section className="dashboard-tasks-panel">
        <div className="panel-header">
          <h2 className="panel-title">Tasks & Projects</h2>
          {projects.length > 0 && (
            <button className="clear-btn" onClick={clearAll}>Clear All</button>
          )}
        </div>

        {/* Input form */}
        <div className="add-project-container">
          <input 
            type="text" 
            placeholder="What task are you working on?" 
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProject()}
          />
          <button className="btn-add" onClick={addProject}>
            <Plus size={16} strokeWidth={2.5} />
            Add Task
          </button>
        </div>

        {/* Projects list */}
        <div className="project-list">
          {projects.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '13px' }}>
              No tasks added yet. Start by entering a task above!
            </p>
          ) : (
            projects.map(proj => {
              const elapsed = getElapsedTime(proj);
              const isExpanded = !!expandedSessions[proj.id];
              return (
                <div key={proj.id} className={`project-card ${proj.isRunning ? 'running' : ''}`}>
                  <div className="project-card-main">
                    <div className="project-info">
                      <div className="project-name" title={proj.name}>{proj.name}</div>
                      <div className="project-time">{formatTime(elapsed)}</div>
                    </div>
                    <div className="project-controls">
                      <button 
                        className={`btn-toggle ${proj.isRunning ? 'pause' : 'start'}`}
                        onClick={() => toggleTimer(proj.id)}
                      >
                        {proj.isRunning ? (
                          <>
                            <Pause size={12} fill="currentColor" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play size={12} fill="currentColor" />
                            Play
                          </>
                        )}
                      </button>
                      <button className="btn-delete" onClick={() => deleteProject(proj.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Sessions trigger and list */}
                  {proj.sessions && proj.sessions.length > 0 && (
                    <>
                      <button className="project-sessions-trigger" onClick={() => toggleSessionsView(proj.id)}>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {proj.sessions.length} {proj.sessions.length === 1 ? 'session' : 'sessions'} logged
                      </button>
                      
                      {isExpanded && (
                        <div className="project-sessions-list">
                          {proj.sessions.map((sess, index) => {
                            // Compute live duration if session is running
                            const sessDur = (sess.endedAt === null && proj.isRunning) 
                              ? Math.floor((Date.now() - sess.startedAt) / 1000)
                              : (sess.duration || 0);

                            return (
                              <div key={index} className="session-item">
                                <span>{formatSessionTime(sess.startedAt)} - {sess.endedAt ? formatSessionTime(sess.endedAt) : 'Active'}</span>
                                <span className="session-duration">{formatTime(sessDur)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Generate Report button */}
        <div className="bottom-actions">
          <button className="report-btn" onClick={generateReport}>
            <FileText size={16} strokeWidth={2.5} />
            Generate Final Report & Summary
          </button>
        </div>
      </section>

      {/* Modal Report Overlay */}
      {showReport && (
        <div className="modal">
          <div className="modal-content">
            <h2>End of Day Summary</h2>
            
            <div className="accuracy-badge">
              <Sparkles size={14} />
              Session background tracking active & verified accurate.
            </div>

            <div id="reportData">
              {projects.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>
                  No work logged today.
                </p>
              ) : (
                <>
                  {projects.map(p => (
                    <div key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 0' }}>
                      <div className="report-item" style={{ borderBottom: 'none', padding: 0 }}>
                        <strong>{p.name}</strong>
                        <span style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace', fontWeight: 700 }}>
                          {formatTimeForReport(p.timeInSeconds)}
                        </span>
                      </div>
                      
                      {/* Detailed sessions breakdown in report */}
                      {p.sessions && p.sessions.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '8px' }}>
                          {p.sessions.map((sess, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span>Session {idx + 1}: {formatSessionTime(sess.startedAt)} - {sess.endedAt ? formatSessionTime(sess.endedAt) : 'Ended'}</span>
                              <span style={{ fontFamily: 'monospace' }}>{formatTimeForReport(sess.duration || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="report-item total-row">
                    <strong>TOTAL TIME LOGGED</strong>
                    <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace', fontSize: '16px' }}>
                      {formatTimeForReport(totalOverall)}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <button className="close-modal" onClick={() => setShowReport(false)}>
              Close Window
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
