// flipper.js
import * as UI from './ui.js';

// Flipper Zero BLE Serial UUIDs
const FLIPPER_SERVICE_UUID = '8fe5b3d5-2e7f-4a98-2a48-7acc60fe0000';
const FLIPPER_TX_CHAR = '19ed82ae-ed21-4c9d-4145-228e61fe0000'; // Write
const FLIPPER_RX_CHAR = '19ed82ae-ed21-4c9d-4145-228e62fe0000'; // Notify

let device, rxCharacteristic, txCharacteristic;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function handleData(event) {
    const value = new TextDecoder().decode(event.target.value);
    UI.log(value, 'data');
}

function onDisconnected() {
    UI.setConnectedState(false);
    device = null;
    rxCharacteristic = null;
    txCharacteristic = null;
}

export async function connect() {
    if (!navigator.bluetooth) {
        UI.log("Web Bluetooth wird nicht unterstützt!", 'error');
        return;
    }

    try {
        UI.log("Suche Flipper (Alle Geräte anzeigen)...", 'info');
        UI.debug("Requesting device with acceptAllDevices: true");

        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [FLIPPER_SERVICE_UUID]
        });

        UI.log(`Gerät ausgewählt: ${device.name || 'Unbekannt'}`, 'info');
        UI.debug(`Verbinde mit Gerät-ID: ${device.id}`);
        
        device.addEventListener('gattserverdisconnected', onDisconnected);

        UI.log("Verbinde mit GATT-Server...", 'info');
        const server = await device.gatt.connect();
        UI.debug("GATT-Server verbunden.");
        
        UI.log("Hole Primary Service...", 'info');
        const service = await server.getPrimaryService(FLIPPER_SERVICE_UUID);
        UI.debug("Service erhalten: " + service.uuid);
        
        // ### ÄNDERUNG: Reihenfolge getauscht ###
        
        UI.log("Hole TX Characteristic (Write)...", 'info');
        txCharacteristic = await service.getCharacteristic(FLIPPER_TX_CHAR);
        UI.debug("TX Characteristic erhalten: " + txCharacteristic.uuid);
        
        UI.log("Hole RX Characteristic (Notify)...", 'info');
        rxCharacteristic = await service.getCharacteristic(FLIPPER_RX_CHAR);
        UI.debug("RX Characteristic erhalten: " + rxCharacteristic.uuid);
        
        // ### ENDE ÄNDERUNG ###

        // Kurze Pause, sicherheitshalber
        UI.debug("Warte 50ms...");
        await delay(50); 

        UI.debug("Starte Notifications...");
        await rxCharacteristic.startNotifications();
        UI.debug("Notifications gestartet!"); // Diesen Log sollten wir jetzt sehen

        rxCharacteristic.addEventListener('characteristicvaluechanged', handleData);

        UI.setConnectedState(true, device.name);
        
        UI.debug("Sende initialen CR (Wake-Up)");
        send('\r'); 

    } catch (e) {
        UI.log(`[FEHLER] ${e.name}: ${e.message}`, 'error');
        UI.debug(`Fehlerdetails: ${e.stack || e.message}`);
        
        if (e.name === 'NotFoundError') {
             UI.log("\n>>> FEHLER: Das ausgewählte Gerät ist kein Flipper (Service nicht gefunden). Bitte das richtige Gerät wählen. <<<", 'error');
        }
        
        if (e.name === 'NotSupportedError' || e.name === 'NetworkError') {
            UI.log("\n>>> CACHE-FEHLER ODER KONFLIKT (z.B. Offizielle App?). Bitte 'Harten Reset' durchführen. <<<", 'warn');
        }
    }
}

export async function send(cmd) {
    if (!txCharacteristic) {
        UI.log("Senden fehlgeschlagen: Nicht verbunden.", 'error');
        return;
    }
    try {
        UI.debug(`Sende Kommando: ${cmd}`);
        const data = new TextEncoder().encode(cmd + "\r");
        await txCharacteristic.writeValue(data);
    } catch (e) {
        UI.log(`[TX ERROR] ${e.message}`, 'error');
        UI.debug(`TX Fehlerdetails: ${e.stack || e.message}`);
    }
}
