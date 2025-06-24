import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';


export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Datenschutzerklärung</Text>

      <Text style={styles.text}>
        Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Personenbezogene Daten werden vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung behandelt.
      </Text>

      <Text style={styles.heading}>1. Datenerhebung</Text>
      <Text style={styles.text}>
        Es werden nur Daten erhoben, die für die Nutzung der App notwendig sind, z.B. Nickname, Chatnachrichten und optionale Profildaten.
      </Text>

      <Text style={styles.heading}>2. Datenverwendung</Text>
      <Text style={styles.text}>
        Die Daten werden ausschließlich zur Bereitstellung und Verbesserung der App genutzt. Eine Weitergabe an Dritte erfolgt nicht ohne ausdrückliche Einwilligung.
      </Text>

      <Text style={styles.heading}>3. Datensicherheit</Text>
      <Text style={styles.text}>
        Ihre Daten werden mit aktuellen Sicherheitsstandards gespeichert und verarbeitet. Bei Verdacht auf Missbrauch behalten wir uns Maßnahmen zum Schutz der Nutzer vor.
      </Text>

      <Text style={styles.heading}>4. Rechte der Nutzer</Text>
      <Text style={styles.text}>
        Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer gespeicherten Daten. Bei Fragen oder Anfragen wenden Sie sich bitte an den Betreiber.
      </Text>

      <Text style={styles.heading}>5. Änderungen</Text>
      <Text style={styles.text}>
        Diese Datenschutzerklärung kann jederzeit angepasst werden. Die aktuelle Version ist stets in der App einsehbar.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 75,
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
    marginBottom: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 35,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 6,
  },
  text: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
});
