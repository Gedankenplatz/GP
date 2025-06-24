import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function TermsOfUseScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nutzungsbedingungen</Text>

      <Text style={styles.paragraph}>
        Willkommen bei Gedankenplatz. Mit der Nutzung dieser App erklärst du dich mit den folgenden Bedingungen einverstanden.
      </Text>

      <Text style={styles.heading}>1. Allgemeines</Text>
      <Text style={styles.paragraph}>
        Diese App dient der anonymen Kommunikation. Alle Nutzer verpflichten sich zu einem respektvollen und verantwortungsbewussten Umgang.
      </Text>

      <Text style={styles.heading}>2. Keine Garantie</Text>
      <Text style={styles.paragraph}>
        Wir übernehmen keine Garantie für die Verfügbarkeit oder Funktionalität der App. Die Nutzung erfolgt auf eigene Verantwortung.
      </Text>

      <Text style={styles.heading}>3. Inhalte</Text>
      <Text style={styles.paragraph}>
        Du trägst die Verantwortung für alle Inhalte, die du über diese App veröffentlichst. Rassistische, beleidigende oder strafbare Inhalte sind untersagt.
      </Text>

      <Text style={styles.heading}>4. Datenschutz</Text>
      <Text style={styles.paragraph}>
        Es werden nur notwendige Daten gespeichert. Genauere Informationen findest du in unserer Datenschutzerklärung.
      </Text>

      <Text style={styles.heading}>5. Änderungen</Text>
      <Text style={styles.paragraph}>
        Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Es gilt jeweils die aktuelle Version.
      </Text>

      <Text style={styles.heading}>6. Kontakt</Text>
      <Text style={styles.paragraph}>
        Bei Fragen oder Beschwerden kontaktiere uns bitte über die im Impressum angegebene Adresse.
      </Text>

      <Text style={styles.footer}>Stand: Juni 2025</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 50,
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
   
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    marginTop: 35,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#555',
  },
  paragraph: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  footer: {
    fontSize: 14,
    marginTop: 30,
    textAlign: 'center',
    color: '#888',
  },
});
