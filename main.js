// main.js
import * as UI from './ui.js';
import * as Flipper from './flipper.js';

// DOM-Elemente holen, einmal beim Start
const dom = {
    term: document.getElementById('term'),
    status: document.getElementById('status'),
    connectBtn: document.getElementById('btn-conn'),
    cmdInput: document.getElementById('cmd'),
    sendBtn: document.getElementById('btn-send'),
    dashBtns: document.querySelectorAll('.d-btn')
};

// UI-Modul initialisieren und DOM-Elemente übergeben
UI.init(dom.term, dom.status, dom.connectBtn);

// --- Event-Listener zuweisen ---

// Verbinden-Button
dom.connectBtn.addEventListener('click', Flipper.connect);

// Senden-Button (CLI)
dom.sendBtn.addEventListener('click', sendInputHandler);

// Enter-Taste im Eingabefeld
dom.cmdInput.addEventListener("keyup", e => {
    if (e.key === "Enter") sendInputHandler();
});

// Dashboard-Buttons (alle auf einmal)
dom.dashBtns.forEach(btn => {
    const cmd = btn.getAttribute('data-cmd');
    if (cmd) {
        btn.addEventListener('click', () => Flipper.send(cmd));
    }
});

/**
 * Handler für das Senden von der Input-Box
 */
function sendInputHandler() {
    const cmd = dom.cmdInput.value;
    if (cmd) {
        Flipper.send(cmd);
        dom.cmdInput.value = ''; // Input-Feld leeren
    }
}

// Startnachricht
UI.log("Warte auf Verbindung...", 'info');
UI.debug("main.js geladen und Event-Listener angehängt.");
