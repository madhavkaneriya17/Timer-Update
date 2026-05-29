/**
 * Core business logic for WorkLog Tracker.
 * Designed to support background tab accuracy and unit testing.
 */

/**
 * Calculates the current total elapsed time for a project,
 * accounting for real time elapsed since the project was started.
 * This ensures 100% accuracy in background tabs or when the PC goes to sleep.
 * 
 * @param {Object} project - The project object.
 * @returns {number} The elapsed time in seconds.
 */
function getProjectElapsedTime(project) {
    if (project.isRunning && project.lastStarted) {
        const elapsed = Math.floor((Date.now() - project.lastStarted) / 1000);
        return project.timeInSeconds + elapsed;
    }
    return project.timeInSeconds;
}

/**
 * Formats time in HH:MM:SS format.
 * 
 * @param {number} totalSeconds - The total time in seconds.
 * @returns {string} The formatted time string.
 */
function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats time for final report (e.g., 2h 14m 5s).
 * 
 * @param {number} totalSeconds - The total time in seconds.
 * @returns {string} The formatted report time string.
 */
function formatTimeForReport(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    let timeString = "";
    if (h > 0) timeString += `${h}h `;
    if (m > 0 || h > 0) timeString += `${m}m `;
    timeString += `${s}s`;

    return timeString;
}

/**
 * Class representing the Tracker state and operations.
 */
class TimeTracker {
    constructor(projects = []) {
        this.projects = projects;
    }

    /**
     * Adds a new project.
     * 
     * @param {string} name - The name of the project.
     * @returns {Object} The newly created project.
     */
    addProject(name) {
        const cleanName = name ? name.trim() : "";
        if (cleanName === "") {
            throw new Error("Please enter a project name!");
        }

        const newProject = {
            id: Date.now() + Math.floor(Math.random() * 1000000),
            name: cleanName,
            timeInSeconds: 0,
            isRunning: false,
            lastStarted: null
        };

        this.projects.push(newProject);
        return newProject;
    }

    /**
     * Pauses a specific project, accumulating its current elapsed run time.
     * 
     * @param {Object} project - The project to pause.
     */
    pauseProject(project) {
        if (project.isRunning) {
            project.timeInSeconds = getProjectElapsedTime(project);
            project.isRunning = false;
            project.lastStarted = null;
        }
    }

    /**
     * Toggles a timer on or off. Automatically pauses all other active timers.
     * 
     * @param {number} id - The ID of the project.
     * @returns {Object|null} The toggled project.
     */
    toggleTimer(id) {
        const projectToToggle = this.projects.find(p => p.id === id);
        if (!projectToToggle) return null;

        if (!projectToToggle.isRunning) {
            // First pause all other projects
            this.projects.forEach(p => {
                if (p.id !== id && p.isRunning) {
                    this.pauseProject(p);
                }
            });
            // Start this project
            projectToToggle.isRunning = true;
            projectToToggle.lastStarted = Date.now();
        } else {
            // Pause this project
            this.pauseProject(projectToToggle);
        }

        return projectToToggle;
    }

    /**
     * Deletes a project by its ID.
     * 
     * @param {number} id - The ID of the project.
     */
    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
    }

    /**
     * Pauses all running projects. Useful for report generation or shutdowns.
     */
    pauseAll() {
        this.projects.forEach(p => {
            if (p.isRunning) {
                this.pauseProject(p);
            }
        });
    }

    /**
     * Gets the sum of elapsed seconds across all projects.
     * 
     * @returns {number} The total elapsed seconds.
     */
    getTotalElapsedSeconds() {
        return this.projects.reduce((total, p) => total + getProjectElapsedTime(p), 0);
    }
}

// Export for Node environments (for unit testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getProjectElapsedTime,
        formatTime,
        formatTimeForReport,
        TimeTracker
    };
}
