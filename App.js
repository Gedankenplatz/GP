import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { supabase } from './lib/supabase';
import messaging from '@react-native-firebase/messaging';
import MainNavigator from './MainNavigator';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session-Handling
  useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setLoading(false);

    // Push-Token NUR bei erfolgreichem Login registrieren!
    if (session?.user?.id) {
      registerForPushNotifications(session.user.id);
    }
  });

  // Initial fetch on mount
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setLoading(false);

    if (data.session?.user?.id) {
      registerForPushNotifications(data.session.user.id);
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);

  async function registerForPushNotifications(userId) {
    if (!userId) {
      console.error('❌ Keine gültige userId!');
      return;
    }

    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
 
      if (!enabled) {
        console.log('❌ Push-Berechtigung nicht erteilt');
        return;
      }

      const token = await messaging().getToken();
      console.log('📲 FCM-Push-Token:', token);
      console.log("userId:", userId);
      
      const { error } = await supabase
        .from('push_tokens')
        .upsert([{ user_id: userId, token }], { onConflict: 'user_id' });

      if (error) {
        console.error('❌ Fehler beim Speichern des Push-Tokens:', error.message);
      }
    } catch (e) {
      console.error('❌ Fehler bei Push-Registrierung:', e.message);
    }
  }


  // Push Listener – NUR EINMAL definieren!
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'Benachrichtigung',
        remoteMessage.notification?.body || 'Du hast eine neue Nachricht.'
      );
    });
    // (Optional) Background Handler – nicht unsubscribable
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Kann leer bleiben, wird aber benötigt
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Debug-Ausgabe
  console.log('Aktuelle Supabase-Session:', session);

  return (
    <NavigationContainer>
      {session?.user ? (
        <MainNavigator session={session} />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
