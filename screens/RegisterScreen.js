import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const register = async () => {
    if (!email || !password || !nickname) {
      Alert.alert('Fehler', 'Bitte gib E-Mail, Passwort und Nickname ein.');
      return;
    }

    // 👉 Supabase Registrierung
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Fehler bei der Registrierung', error.message);
      return;
    }

    // User-ID holen (falls sofort vorhanden)
    const userId = data?.user?.id;

    // E-Mail muss ggf. bestätigt werden!
    if (!userId) {
      Alert.alert(
        'Bestätigung notwendig',
        'Registrierung fast abgeschlossen. Bitte bestätige deine E-Mail und logge dich dann ein.'
      );
      navigation.navigate('Login');
      return;
    }

    // Admin-Flag setzen, wenn du der Boss bist
    const isAdmin = email === 's-urbanik@gmx.de';

    // 👉 Profil anlegen
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      nickname: nickname,
      status: 'Hey, ich bin neu hier!',
      emoji: '👋',
      color: '#88ccee',
      role: isAdmin ? 'admin' : 'user',
    });

    if (profileError) {
      console.error('❌ Fehler beim Speichern des Profils:', profileError.message);
      Alert.alert('Fehler beim Speichern des Profils', profileError.message);
      return;
    }

    Alert.alert('Erfolg', 'Registrierung erfolgreich! Du wirst jetzt eingeloggt.');
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Konto erstellen</Text>

      <TextInput
        placeholder="E-Mail"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Passwort"
        placeholderTextColor="#aaa"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        placeholder="Nickname"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
      />

      <TouchableOpacity style={styles.button} onPress={register}>
        <Text style={styles.buttonText}>Registrieren</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Zurück zum Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#4a90e2',
    textAlign: 'center',
    fontSize: 16,
  },
});

