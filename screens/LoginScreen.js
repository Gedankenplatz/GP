import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  

  const login = async () => {
  if (!email || !password) {
    Alert.alert('Fehler', 'Bitte gib E-Mail und Passwort ein.');
    return;
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log('Login erfolgreich:', signInData?.user);

  if (signInError) {
    console.error('❌ Login fehlgeschlagen:', signInError.message);
    Alert.alert('Fehler', signInError.message);
    setPassword(''); // Passwordfeld leeren
    return;
  }

  const user = signInData?.user;
    // Admin-Flag (optional, wie gehabt)
  if (email === 's-urbanik@gmx.de') {
    
    const { error: updateError } = await supabase
     .from('profiles')
     .update({ is_admin: true })
     .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Fehler beim Setzen der Adminrolle:', updateError.message);
    }
  }
}; 

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anmelden</Text>
      <TextInput
        placeholder="E-Mail"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Passwort"
        placeholderTextColor="#aaa"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Noch kein Konto? Jetzt registrieren</Text>
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
