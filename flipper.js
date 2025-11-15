// flipper.js
import * as UI from './ui.js';

// Flipper Zero BLE Serial UUIDs
const FLIPPER_SERVICE_UUID = '8fe5b3d5-2e7f-4a98-2a48-7acc60fe0000';
const FLIPPER_TX_CHAR = '19ed82ae-ed21-4c9d-4145-228e61fe0000'; // Write
const FLIPPER_RX_CHAR = '19ed82ae-ed21-4c9d-4145-228e62fe0000'; // Notify

let device, rxCharacteristic, txCharacteristic;

/**
 * Verarbeitet eingehende Daten vom Flipper.
 */
function handleData(event) {
    const value = new TextDecoder().decode(event.target.value);
    UI.log(value, 'data');
}

/**
 * Wird aufgerufen, wenn die GATT-Verbindung getrennt wird.
 */
function onDisconnected() {
    UI.setConnectedState(false);
    // Referenzen freigeben
    device = null;
    rxCharacteristic = null;
    txCharacteristic = null;
}

/**
 * Startet den Verbindungs- und Scan-Vorgang.
 */
export async function connect() {
    if (!navigator.bluetooth) {
        UI.log("Web Bluetooth wird nicht unterstützt!", 'error');
        return;
    }

    try {
        UI.log("Suche Flipper via Service-UUID...", 'info');
        UI.debug("Requesting device with service: " + FLIPPER_SERVICE_UUID);

        // ### DER FIX (Robust) ###
        // Filtert direkt nach dem Service, was am robustesten ist.
        device = await navigator.bluetooth.requestDevice({
            filters: [{
                services: [FLIPPER_SERVICE_UUID]
            }]
        });
        
        device.addEventListener('gattserverdisconnected', onDisconnected);

        UI.log("Verbinde mit GATT-Server...", 'info');
        const server = await device.gatt.connect();
        UI.debug("GATT-Server verbunden.");
        
        UI.log("Hole Primary Service...", 'info');
        const service = await server.getPrimaryService(FLIPPER_SERVICE_UUID);
        UI.debug("Service erhalten: " + service.uuid);
        
        UI.log("Hole RX Characteristic...", 'info');
        rxCharacteristic = await service.getCharacteristic(FLIPPER_RX_CHAR);
        UI.debug("RX Characteristic erhalten: " + rxCharacteristic.uuid);
        
        UI.log("Hole TX Characteristic...", 'info');
        txCharacteristic = await service.getCharacteristic(FLIPPER_TX_CHAR);
        UI.debug("TX Characteristic erhalten: " + txCharacteristic.uuid);

        UI.debug("Starte Notifications...");
        await rxCharacteristic.startNotifications();
        rxCharacteristic.addEventListener('characteristicvaluechanged', handleData);

        UI.setConnectedState(true, device.name);
        
        // CLI aufwecken
        UI.debug("Sende initialen CR (Wake-Up)");
        send('\r'); 

    } catch (e) {
        UI.log(`[FEHLER] ${e.name}: ${e.message}`, 'error');
        UI.debug(`Fehlerdetails: ${e.stack}`);
        
        if (e.name === 'NotSupportedError' || e.name === 'NotFoundError' || e.name === 'NetworkError') {
            UI.log("\n>>> WICHTIG: Cache-Fehler vermutet. Bitte Flipper in den Bluetooth-Einstellungen 'ENTFERNEN' und Bluetooth neu starten! <<<", 'warn');
        }
    }
}

/**
 * Sendet einen Befehl an den Flipper.
 */
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
        UI.debug(`TX Fehlerdetails: ${e.stack}`);
    }
}
 
