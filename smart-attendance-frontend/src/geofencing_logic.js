import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Define the name of the background task
const GEOFENCE_TASK_NAME = 'GEOFENCE_ATTENDANCE_TASK';

// Backend Base URL
const BASE_URL = 'http://127.0.0.1:8000'; // Change to actual backend IP

// 1. Define the Background Task outside of any component
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }) => {
    if (error) {
        console.error("Geofence task error:", error.message);
        return;
    }

    // We need the user's email to send the request. In a real app,
    // this might be retrieved from SecureStore or AsyncStorage.
    // For demonstration, replacing with a placeholder.
    const userEmail = "employee@example.com"; // TODO: Retrieve from local storage

    if (eventType === Location.GeofencingEventType.Enter) {
        console.log("You've entered region:", region);
        try {
            await fetch(`${BASE_URL}/attendance/return-detected`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, exit_time: null })
            });
            console.log("Returned to office marked successfully");
        } catch (err) {
            console.error("Failed to mark return", err);
        }
    } else if (eventType === Location.GeofencingEventType.Exit) {
        console.log("You've left region:", region);
        try {
            await fetch(`${BASE_URL}/attendance/exit-detected`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, exit_time: new Date().toISOString() })
            });
            console.log("Exit marked, 15m grace period started");
        } catch (err) {
            console.error("Failed to mark exit", err);
        }
    }
});

// 2. Setup Function (Call this after successful login/check-in)
export async function startGeofenceMonitoring(email) {
    try {
        // 1. Request Permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            console.warn("Foreground location permission required");
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.warn("Background location permission required for geofencing");
            return false;
        }

        // 2. Fetch Office Config from Backend
        const configRes = await fetch(`${BASE_URL}/config/office-location`);
        if (!configRes.ok) throw new Error("Could not fetch office config");

        const officeConfig = await configRes.json();

        // Store email temporarily if needed for the background task
        // AsyncStorage.setItem('userEmail', email);

        // 3. Start Geofencing
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
            {
                identifier: 'OfficeBoundary',
                latitude: officeConfig.latitude,
                longitude: officeConfig.longitude,
                radius: officeConfig.radius,
                notifyOnEnter: true,
                notifyOnExit: true,
            }
        ]);

        console.log(`Geofence started for ${email} at ${officeConfig.latitude}, ${officeConfig.longitude} with radius ${officeConfig.radius}m`);
        return true;

    } catch (error) {
        console.error("Error starting geofence:", error);
        return false;
    }
}

// 3. Cleanup Function (Call this on Checkout or Logout)
export async function stopGeofenceMonitoring() {
    const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (hasStarted) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log("Geofence monitoring stopped");
    }
}
