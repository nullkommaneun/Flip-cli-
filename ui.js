// ui.js

// ### DEBUGGER ###
// Setze dies auf 'true', um detaillierte Debug-Meldungen in der Konsole zu sehen.
const DEBUG = true;

let termEl, statusEl, connectBtnEl;

const colorMap = {
    'data': '#00e5ff',
    'info': '#888',
    'success': '#00ff41',
    'error': '#f44336',
    'warn': '#ff8c00',
    'debug': '#ff00ff' // Eigene Farbe für Debug-Logs im Terminal
};

/**
 * Initialisiert das UI-Modul mit den notwendigen DOM-Elementen.
 */
export function init(term, status, btn) {
    termEl = term;
    statusEl = status;
    connectBtnEl = btn;
}

/**
 * Schreibt eine Nachricht in das Terminal-Fenster.
 */
export function log(text, type = 'data') {
    if (!termEl) return;
    
    // Debug-Meldungen nur im Terminal anzeigen, wenn DEBUG true ist
    if (type === 'debug' && !DEBUG) return;

    termEl.innerHTML += `<span style="color:${colorMap[type] || '#fff'}">${text}</span>`;
    if (type !== 'data') termEl.innerHTML += '\n'; // Zeilenumbruch für Nicht-Daten-Logs
    termEl.scrollTop = termEl.scrollHeight; // Auto-Scroll
}

/**
 * Loggt eine Debug-Nachricht. Wird nur angezeigt, wenn DEBUG = true.
 */
export function debug(text) {
    if (DEBUG) {
        console.log(`[DEBUG] ${text}`);
        log(`[DEBUG] ${text}`, 'debug'); // Auch ins Terminal loggen
    }
}

/**
 * Aktualisiert den Verbindungsstatus in der UI.
 */
export function setConnectedState(isConnected, deviceName = '') {
    if (!statusEl || !connectBtnEl) return;
    
    if (isConnected) {
        statusEl.innerText = "Verbunden: " + (deviceName || 'Flipper');
        statusEl.style.color = "#00ff41";
        connectBtnEl.style.display = 'none';
        log(">>> VERBINDUNG AKTIV <<<\n", 'success');
    } else {
        statusEl.innerText = "Getrennt";
        statusEl.style.color = "#666";
        connectBtnEl.style.display = 'block';
        log("\n>>> VERBINDUNG UNTERBROCHEN <<<\n", 'warn');
    }
}
 
