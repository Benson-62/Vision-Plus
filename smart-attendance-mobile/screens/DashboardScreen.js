import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back</Text>
            <View style={styles.grid}>
                <Button title="Check-In / Out" onPress={() => navigation.navigate('CheckInOut')} />
                <Button title="Attendance History" onPress={() => navigation.navigate('AttendanceHistory')} />
                <Button title="Leave Apply" onPress={() => navigation.navigate('LeaveApply')} />
                <Button title="Chat" onPress={() => navigation.navigate('Chat')} />
                <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
            </View>
            <Button title="Logout" color="red" onPress={logout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    grid: { gap: 10, marginVertical: 20 }
});
