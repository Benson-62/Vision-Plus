import React, { useState, useEffect } from 'react';
import bleService from '../utils/bleService';
import { Bluetooth, BluetoothConnected, Battery, RefreshCw, Unplug, AlertCircle } from 'lucide-react';
import '../styles/BleAttendance.css';

const BleAttendance = () => {
    const [devices, setDevices] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Subscribe to BLE service state changes
        const unsubscribe = bleService.subscribe((updatedDevices) => {
            setDevices([...updatedDevices]);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleConnect = async () => {
        try {
            setError(null);
            setIsConnecting(true);
            await bleService.connectDevice();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to parse Bluetooth device/connection");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async (deviceId) => {
        try {
            await bleService.disconnectDevice(deviceId);
        } catch (err) {
            console.error(`Failed to disconnect device ${deviceId}`, err);
        }
    };

    const getStatusBadgeClass = (state) => {
        switch (state) {
            case 'Connected': return 'badge-success';
            case 'Reconnecting': return 'badge-warning';
            case 'Disconnected': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };

    return (
        <div className="ble-container">
            <div className="ble-header">
                <h1>BLE Smart Attendance Gateways</h1>
                <p className="subtitle">Manage Bluetooth Low Energy entry points and monitor real-time check-in events safely</p>
            </div>

            {error && (
                <div className="error-alert">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="alert-close">&times;</button>
                </div>
            )}

            <div className="ble-actions">
                <button
                    className="btn-primary"
                    onClick={handleConnect}
                    disabled={isConnecting}
                >
                    {isConnecting ? (
                        <><RefreshCw className="spin" size={20} /> Scanning...</>
                    ) : (
                        <><Bluetooth size={20} /> Scan & Connect Device</>
                    )}
                </button>
            </div>

            <div className="device-list">
                {devices.length === 0 ? (
                    <div className="empty-state">
                        <Bluetooth size={48} color="#ccc" />
                        <p>No devices connected</p>
                        <p className="hint">Ensure your ESP32 device is powered on and advertising.</p>
                    </div>
                ) : (
                    devices.map((device) => (
                        <div key={device.id} className="device-card">
                            <div className="card-header">
                                <div>
                                    <h3 className="device-name">{device.name}</h3>
                                    <span className="device-id">{device.id}</span>
                                </div>
                                <div className={`status-badge ${getStatusBadgeClass(device.state)}`}>
                                    {device.state === 'Connected' && <BluetoothConnected size={14} />}
                                    {device.state === 'Reconnecting' && <RefreshCw size={14} className="spin" />}
                                    {device.state === 'Disconnected' && <Unplug size={14} />}
                                    {device.state}
                                </div>
                            </div>

                            <div className="card-body">
                                <div className="stat-row">
                                    <div className="stat-label"><Battery size={16} /> Battery Level</div>
                                    <div className="stat-value">
                                        {device.batteryLevel !== null && device.batteryLevel !== undefined
                                            ? `${device.batteryLevel}%`
                                            : 'N/A'
                                        }
                                    </div>
                                </div>

                                <div className="events-log">
                                    <h4>Last Event Logs</h4>
                                    {device.lastEvent ? (
                                        <div className="log-entry">
                                            <span className="log-time">{new Date().toLocaleTimeString()}</span>
                                            <span className={`log-event ${device.lastEvent.event}`}>
                                                {device.lastEvent.event.toUpperCase()}
                                            </span>
                                            {device.lastEvent.timestamp && (
                                                <span className="log-raw">{device.lastEvent.timestamp}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="no-logs">Waiting for events...</div>
                                    )}
                                </div>
                            </div>

                            <div className="card-actions">
                                <button
                                    className="btn-danger"
                                    onClick={() => handleDisconnect(device.id)}
                                >
                                    <Unplug size={16} /> Disconnect
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BleAttendance;
