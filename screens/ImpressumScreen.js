import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';


export default function ImpressumScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Impressum</Text>

      <Text style={styles.heading}>Angaben gemäß § 5 TMG</Text>
      <Text style={styles.text}>
        GEDANKENPLATZ{'\n'}
        Sebastian Urbanik{'\n'}
        Pettendorfer Straße 13a{'\n'}
        D - 93186 Pettendorf{'\n'}
        https://www.gedanken-platz.com
      </Text>

      <Text style={styles.heading}>Kontakt</Text>
      <Text style={styles.text}>
        Telefon: +49 160 / 577 30 60{'\n'}
        E-Mail: gedankenplatz@gmx.de
      </Text>

      <Text style={styles.heading}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</Text>
      <Text style={styles.text}>
        GEDANKENPLATZ{'\n'}
        Sebastian Urbanik{'\n'}
        Pettendorfer Straße 13a{'\n'}
        D - 93186 Pettendorf{'\n'}
        https://www.gedanken-platz.com
      </Text>

      <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')}>
        <Text style={styles.link}>Nutzungsbedingungen (Terms of Use)</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
        <Text style={styles.link}>Datenschutzerklärung (Privacy Policy)</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>© {new Date().getFullYear()} Gedankenplatz</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
    padding: 45,
   
  },

  link: {
    color: '#007aff',
    marginTop:45,
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
    marginTop: 35,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a90e2',
    marginTop: 45,
    marginBottom: 5,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#222',
  },
  footer: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
    color: '#888',
  },
});
