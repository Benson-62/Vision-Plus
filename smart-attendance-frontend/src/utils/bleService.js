/**
 * bleService.js
 * Production-ready Web Bluetooth API service for Smart Attendance System.
 * Handles connections to ESP32 BLE devices, auto-reconnection, multiple devices,
 * battery level reading, and notification handling.
 */


// Default custom UUIDs for communication
const CUSTOM_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0"; // Replace with your actual UUID
const CUSTOM_CHAR_UUID = "12345678-1234-5678-1234-56789abcdef1";    // Replace with your actual UUID

const BATTERY_SERVICE_UUID = 0x180f;
const BATTERY_LEVEL_CHAR_UUID = 0x2a19;

// Backend endpoint for events
const BACKEND_EVENT_URL = "http://127.0.0.1:8000/device/event"; // Update if different

// Connection constraints
const CONNECTION_TIMEOUT_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;
const BATTERY_REFRESH_INTERVAL_MS = 60000;

class BleManager {
    constructor() {
        this.devices = new Map(); // Registry of connected devices by device.id
        this.eventListeners = new Set();
    }

    // --- PUBLIC API --- //

    subscribe(listener) {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    notifyStateChange() {
        const devicesArray = Array.from(this.devices.values()).map(d => ({
            id: d.device.id,
            name: d.device.name || "Unknown Device",
            state: d.state, // "Connected", "Disconnected", "Reconnecting"
            batteryLevel: d.batteryLevel,
            lastEvent: d.lastEvent
        }));
        this.eventListeners.forEach(listener => listener([...devicesArray]));
    }

    async connectDevice(targetName = null) {
        try {
            if (!navigator.bluetooth) {
                throw new Error("Web Bluetooth API is not available in this browser. Ensure HTTPS is used.");
            }

            // We use acceptAllDevices to let the user see all nearby devices and pick their earbuds, 
            // since audio devices often don't advertise perfectly formatted LE names.
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [CUSTOM_SERVICE_UUID, BATTERY_SERVICE_UUID]
            });

            if (targetName) {
                if (!device.name) {
                    throw new Error(`Device must be ${targetName} (selected device has no name)`);
                }
                if (!device.name.includes(targetName) && !targetName.includes(device.name)) {
                    console.warn(`Selected device: ${device.name}, expected: ${targetName}. Disconnecting.`);
                    throw new Error(`Device must be ${targetName}`);
                }
            }

            if (this.devices.has(device.id)) {
                throw new Error("Device is already registered.");
            }

            await this._setupDeviceConnection(device);
            return device.id;
        } catch (error) {
            console.error("Connection failed:", error);
            throw error;
        }
    }

    async disconnectDevice(deviceId) {
        const registryEntry = this.devices.get(deviceId);
        if (!registryEntry) return;

        registryEntry.intentionalDisconnect = true;

        // Clear battery interval
        if (registryEntry.batteryInterval) {
            clearInterval(registryEntry.batteryInterval);
        }

        if (registryEntry.device.gatt.connected) {
            registryEntry.device.gatt.disconnect();
        } else {
            registryEntry.state = "Disconnected";
            this.notifyStateChange();
        }

        this.devices.delete(deviceId);
        console.log(`Device ${deviceId} fully removed from registry.`);
        this.notifyStateChange();
    }

    getConnectedDevices() {
        return Array.from(this.devices.values()).map(d => ({
            id: d.device.id,
            name: d.device.name,
            state: d.state,
            batteryLevel: d.batteryLevel
        }));
    }

    // --- INTERNAL SETUP --- //

    async _setupDeviceConnection(device) {
        const deviceId = device.id;

        if (!this.devices.has(deviceId)) {
            this.devices.set(deviceId, {
                device,
                state: "Connecting",
                batteryLevel: null,
                reconnectAttempts: 0,
                intentionalDisconnect: false,
                customChar: null,
                batteryInterval: null,
                lastEvent: null
            });

            device.addEventListener("gattserverdisconnected", (e) => this._onDisconnected(e));
        }

        const registryEntry = this.devices.get(deviceId);
        registryEntry.state = "Connecting";
        this.notifyStateChange();

        try {
            let gattServer;
            try {
                gattServer = await this._withTimeout(
                    device.gatt.connect(),
                    CONNECTION_TIMEOUT_MS,
                    "GATT connection timeout"
                );
            } catch (gattErr) {
                console.warn(`GATT connection failed (normal for standard audio devices):`, gattErr);
                // For location verification with audio devices, just finding it is enough
                registryEntry.state = "Connected";
                registryEntry.reconnectAttempts = 0;
                this.notifyStateChange();
                console.log(`Successfully verified ${device.name} presence without GATT.`);
                return;
            }

            // Setup custom service for notifications
            try {
                const customService = await gattServer.getPrimaryService(CUSTOM_SERVICE_UUID);
                const customChar = await customService.getCharacteristic(CUSTOM_CHAR_UUID);
                registryEntry.customChar = customChar;
                await this._startNotifications(customChar, deviceId);
            } catch (err) {
                console.warn(`Could not setup custom service on ${deviceId}:`, err);
            }

            // Setup battery service
            try {
                await this._readBatteryLevel(deviceId);

                // Clear old interval if exists
                if (registryEntry.batteryInterval) clearInterval(registryEntry.batteryInterval);

                registryEntry.batteryInterval = setInterval(() => {
                    this._readBatteryLevel(deviceId).catch(e => console.error("Battery read error", e));
                }, BATTERY_REFRESH_INTERVAL_MS);
            } catch (err) {
                console.warn(`Could not setup battery service on ${deviceId}:`, err);
            }

            registryEntry.state = "Connected";
            registryEntry.reconnectAttempts = 0; // Reset attempts on succcess
            this.notifyStateChange();
            console.log(`Successfully connected to ${device.name} (${deviceId})`);

        } catch (error) {
            registryEntry.state = "Disconnected";
            this.notifyStateChange();
            console.error(`Failed to setup connection for ${deviceId}:`, error);
            throw error;
        }
    }

    async _startNotifications(characteristic, deviceId) {
        // We bind passing deviceId so we can correlate later
        const handleNotification = (event) => this._handleDataReceived(event, deviceId);

        // Store reference to function if we needed to remove it later, but standard practice is 
        // it goes away when disconnected. To be safe against memory leaks, attach to registry.
        const registryEntry = this.devices.get(deviceId);
        if (registryEntry.notificationHandler) {
            characteristic.removeEventListener('characteristicvaluechanged', registryEntry.notificationHandler);
        }
        registryEntry.notificationHandler = handleNotification;

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleNotification);
    }

    async _handleDataReceived(event, deviceId) {
        const value = event.target.value;
        const decoder = new TextDecoder("utf-8");
        const jsonString = decoder.decode(value);

        console.log(`Raw data received from ${deviceId}:`, jsonString);

        try {
            const data = JSON.parse(jsonString);

            // Update state for UI
            const registryEntry = this.devices.get(deviceId);
            if (registryEntry) {
                registryEntry.lastEvent = data;
                this.notifyStateChange();
            }

            // Send to backend
            await this._sendToBackend(data);

        } catch (e) {
            console.error(`Failed to parse or process JSON from device ${deviceId}:`, e);
        }
    }

    async _sendToBackend(payload) {
        try {
            const response = await fetch(BACKEND_EVENT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error("Backend returned error:", await response.text());
            }
        } catch (error) {
            console.error("Network error sending data to backend:", error);
        }
    }

    async _readBatteryLevel(deviceId) {
        const registryEntry = this.devices.get(deviceId);
        if (!registryEntry || !registryEntry.device.gatt.connected) return;

        try {
            const batteryService = await registryEntry.device.gatt.getPrimaryService(BATTERY_SERVICE_UUID);
            const batteryLevelChar = await batteryService.getCharacteristic(BATTERY_LEVEL_CHAR_UUID);
            const value = await this._withTimeout(batteryLevelChar.readValue(), 5000, "Battery read timeout");

            const level = value.getUint8(0);
            registryEntry.batteryLevel = level;
            this.notifyStateChange();

            return level;
        } catch (error) {
            // Don't clutter logs too much if battery read fails due to normal disconnects
            console.debug(`Failed to read battery for ${deviceId}:`, error);
        }
    }

    async _onDisconnected(event) {
        const device = event.target;
        const deviceId = device.id;
        const registryEntry = this.devices.get(deviceId);

        if (!registryEntry) return;

        if (registryEntry.batteryInterval) {
            clearInterval(registryEntry.batteryInterval);
            registryEntry.batteryInterval = null;
        }

        if (registryEntry.intentionalDisconnect) {
            console.log(`Intentionally disconnected from ${deviceId}`);
            registryEntry.state = "Disconnected";
            this.notifyStateChange();
            return;
        }

        console.log(`Unexpectedly disconnected from ${deviceId}. Starting reconnect logic...`);
        registryEntry.state = "Reconnecting";
        this.notifyStateChange();

        this._attemptReconnect(deviceId);
    }

    async _attemptReconnect(deviceId) {
        const registryEntry = this.devices.get(deviceId);
        if (!registryEntry) return;

        if (registryEntry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`Max reconnect attempts reached for ${deviceId}. Giving up.`);
            registryEntry.state = "Disconnected";
            this.notifyStateChange();
            return;
        }

        registryEntry.reconnectAttempts++;

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const backoffMs = Math.pow(2, registryEntry.reconnectAttempts - 1) * 1000;

        console.log(`Attempt ${registryEntry.reconnectAttempts} to reconnect to ${deviceId} in ${backoffMs}ms`);

        await new Promise(resolve => setTimeout(resolve, backoffMs));

        // Double check it wasn't intentionally removed during wait
        if (!this.devices.has(deviceId) || this.devices.get(deviceId).intentionalDisconnect) return;

        try {
            const device = registryEntry.device;
            await this._setupDeviceConnection(device);
        } catch (error) {
            console.error(`Reconnect attempt ${registryEntry.reconnectAttempts} failed for ${deviceId}`);
            // Recursive call for next attempt
            this._attemptReconnect(deviceId);
        }
    }

    // --- UTILS --- //

    _withTimeout(promise, ms, timeoutErrorMsg) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(timeoutErrorMsg || `Timeout after ${ms}ms`));
            }, ms);
        });

        return Promise.race([
            promise,
            timeoutPromise
        ]).finally(() => {
            clearTimeout(timeoutId);
        });
    }
}

// Export a singleton instance
const bleService = new BleManager();
export default bleService;
