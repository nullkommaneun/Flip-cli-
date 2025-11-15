// flipper.js
import ** as UI from './ui.js';

// Flipper Zero BLE Serial UUIDs
const FLIPPER_SERVICE_UUID = '8fe5b3d5-2e7f-4a98-2a48-7acc60fe0000';
const FLIPPER_TX_CHAR = '19ed82ae-ed21-4c9d-4145-228e61fe0000'; // Write
const FLIPPER_RX_CHAR = '19ed82ae-ed21-4c9d-4145-228e62fe0000'; // Notify

// Standard Bluetooth UUID für den Client Characteristic Configuration Descriptor
const CCCD_UUID = '00002902-0000-1000-8000-00805f9b34fb';

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
        
        UI.log("Hole TX Characteristic (Write)...", 'info');
        txCharacteristic = await service.getCharacteristic(FLIPPER_TX_CHAR);
        UI.debug("TX Characteristic erhalten: " + txCharacteristic.uuid);
        
        UI.log("Hole RX Characteristic (Notify)...", 'info');
        rxCharacteristic = await service.getCharacteristic(FLIPPER_RX_CHAR);
        UI.debug("RX Characteristic erhalten: " + rxCharacteristic.uuid);
        
        // ### ÄNDERUNG: MANUELLE NOTIFICATION-AKTIVIERUNG ###
        // Wir rufen NICHT mehr rxCharacteristic.startNotifications() auf.
        
        UI.debug("Hole CCCD (0x2902) für RX-Characteristic...");
        const cccd = await rxCharacteristic.getDescriptor(CCCD_UUID);
        
        if (!cccd) {
            UI.log("[FEHLER] Konnte CCCD (0x2902) nicht finden. Abbruch.", 'error');
            UI.debug("Gerät scheint Notifications auf RX nicht zu unterstützen.");
            return;
        }
        UI.debug("CCCD gefunden.");

        // Registriere den Listener, *bevor* wir den Flipper anweisen zu senden.
        rxCharacteristic.addEventListener('characteristicvaluechanged', handleData);
        UI.debug("Event-Listener 'characteristicvaluechanged' registriert.");

        // Schreibe 0x0100 (Little-Endian) in den CCCD, um Notifications zu aktivieren.
        UI.debug("Schreibe 0x0100 (Enable Notifications) in CCCD...");
        await cccd.writeValue(new Uint8Array([0x01, 0x00]));
        
        UI.debug("Notifications manuell aktiviert!");
        // ### ENDE ÄNDERUNG ###

        UI.setConnectedState(true, device.name);
        
        UI.debug("Warte 100ms nach Aktivierung...");
        await delay(100);

        UI.debug("Sende initialen CR (Wake-Up)");
        send('\r'); 

    } catch (e) {
        UI.log(`[FEHLER] ${e.name}: ${e.message}`, 'error');
        UI.debug(`Fehlerdetails: ${e.stack || e.message}`);
        
        if (e.name === 'NotFoundError') {
             UI.log("\n>>> FEHLER: Das ausgewählte Gerät ist kein Flipper (Service/Char/CCCD nicht gefunden). <<<", 'error');
        }
        
        if (e.name === 'NotSupportedError' || e.name === 'NetworkError') {
            UI.log("\n>>> FEHLER: 'NotSupported' beim manuellen Schreiben. Das OS blockiert den Zugriff. <<<", 'warn');
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
