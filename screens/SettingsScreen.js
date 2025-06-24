import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';


export default function SettingsScreen({ route }) {
  const navigation = useNavigation();
  const isAdmin = route?.params?.isAdmin || false;

  const [warnOnOffline, setWarnOnOffline] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Lade Einstellung (Offline-Warnung)
    const loadWarn = async () => {
      try {
        const value = await AsyncStorage.getItem('warnOnOffline');
        setWarnOnOffline(value === 'true');
      } catch (e) {}
    };
    loadWarn();
  }, []);

  useEffect(() => {
    // Offline-Warnung bei Bedarf
    if (warnOnOffline) {
      const unsubscribe = NetInfo.addEventListener(state => {
        if (!state.isConnected) {
          Alert.alert('Offline-Warnung', 'Du bist aktuell offline!');
        }
      });
      return () => unsubscribe();
    }
  }, [warnOnOffline]);

  // UserId für Push
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const toggleWarnOffline = async () => {
    const newVal = !warnOnOffline;
    setWarnOnOffline(newVal);
    await AsyncStorage.setItem('warnOnOffline', newVal.toString());
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // --- Push Notification Funktion ---
  async function enablePushNotifications(userId) {
    if (!userId) {
      console.error('❌ Keine gültige userId!');
      return;
    }
    try {
      console.log('Starte Push-Registrierung…');

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Berechtigung nicht erteilt');
        Alert.alert('Benachrichtigungen', 'Berechtigung wurde nicht erteilt.');
        return false;
      }

      const token = await messaging().getToken();
      console.log('Push-Token:', token);
      console.log("userId:", userId);

      const { error } = await supabase
        .from('push_tokens')
        .upsert([{ user_id: userId, token }], { onConflict: 'user_id' });

      if (error) {
        console.error('Token-Speicherfehler:', error);
        Alert.alert('Fehler', 'Token konnte nicht gespeichert werden.');
        return false;
      }

      Alert.alert('Benachrichtigungen', 'Benachrichtigungen sind jetzt aktiviert!');
      return true;
    } catch (err) {
      console.error('Fehler bei der Push-Registrierung:', err); // <-- Hier fehlt oft das Logging!
      Alert.alert('Fehler', 'Push-Registrierung fehlgeschlagen.');
      return false;
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>

      <Text style={styles.heading}>Komfort</Text>
      <View style={styles.switchRow}>
        <Text>Offline-Warnung</Text>
        <Switch value={warnOnOffline} onValueChange={toggleWarnOffline} />
      </View>

      {/* PUSH-BUTTON */}
      <View style={{ marginVertical: 12 }}>
        <Button
          title="Benachrichtigungen aktivieren"
          color="#007AFF"
          onPress={() => {
            if (userId) {
              enablePushNotifications(userId);
            } else {
              Alert.alert('Fehler', 'User-ID nicht gefunden.');
            }
          }}
        />
      </View>

      <Text style={styles.heading}>Info & Rechtliches</Text>
      <Button title="Impressum" onPress={() => navigation.navigate('Impressum')} />
      <Button title="Datenschutz" onPress={() => navigation.navigate('PrivacyPolicy')} />
      <Button title="Nutzungsbedingungen" onPress={() => navigation.navigate('TermsOfUse')} />

      {isAdmin && (
        <>
          <Text style={styles.heading}>Adminfunktionen</Text>
          <Button title="Benutzerübersicht" onPress={() => navigation.navigate('UserList')} />
        </>
      )}

      <Text style={styles.heading}>Konto</Text>
      <Button title="Logout" color="gray" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
   
  },
  heading: {
    fontSize: 20,
    marginTop: 30,
    marginBottom: 10,
    fontWeight: '600',
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
});
