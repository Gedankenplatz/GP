import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode as atob, encode as btoa } from 'base-64';

const EMOJI_LIST = ['🙂','😎','🤖','😴','🧠','🔥','👽','🐱‍👤','😇','🥳','😭','🤩','😡','🤔','🐲','🦄','👾','🐱','😜','🥺','🤠'];

export default function ProfileScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  // Media-Berechtigung beim Start abfragen
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube Zugriff auf deine Fotos.');
      }
    })();
  }, []);

  // Profil-Daten laden
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert('Nicht eingeloggt');
        navigation.replace('Login');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.user_metadata?.role === 'admin');
      const uid = session.user.id;
      setUserId(uid);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Fehler beim Laden:', fetchError.message);
        Alert.alert('Fehler beim Laden des Profils');
      }

      if (data) {
        setStatus(data.status || '');
        setEmoji(data.emoji || '🙂');
        setAvatarUrl(data.avatar_url ? `${data.avatar_url}?t=${Date.now()}` : null);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  // Helper: Bild in Base64 konvertieren und zu Supabase hochladen
  const uploadToSupabase = async (fileUri, filePath) => {
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return await supabase
      .storage
      .from('profile-photos')
      .upload(filePath, byteArray, { upsert: true, contentType: 'image/jpeg' });
  };

  // Bild auswählen, umkopieren (Android), hochladen, URL setzen
  const pickAndUploadImage = async () => {
    try {
      setUploading(true);

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        let fileUri = asset.uri;
        const filePath = `avatars/${userId}.jpg`;

        // Android: content:// zu file:// kopieren
        if (fileUri.startsWith('content://')) {
          const dest = FileSystem.cacheDirectory + `${userId}.jpg`;
          await FileSystem.copyAsync({ from: fileUri, to: dest });
          fileUri = dest;
        }

        // Helper nutzen!
        const { error: uploadError } = await uploadToSupabase(fileUri, filePath);

        if (uploadError) {
          Alert.alert('Fehler beim Upload', uploadError.message);
          setUploading(false);
          return;
        }

        // Avatar-URL auslesen und setzen (Cache-Busting mit ?t=...)
        const { data: publicUrlData } = supabase
          .storage
          .from('profile-photos')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
          setEmoji('');
          Alert.alert('Profilbild aktualisiert!');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Fehler beim Bild-Upload', e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  // Profil speichern
  const saveProfile = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, status, emoji, avatar_url: avatarUrl });

    if (error) {
      Alert.alert('Speicherfehler', error.message);
    } else {
      Alert.alert('Profil gespeichert');
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dein Profil</Text>
      {isAdmin && <Text style={{ color: 'red', marginBottom: 10 }}>ADMIN</Text>}

      {/* Profilbild oder Emoji */}
      <TouchableOpacity style={styles.avatarBox} onPress={pickAndUploadImage} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator size="large" color="#4a90e2" />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarEmoji}>{emoji || '🙂'}</Text>
        )}
        <Text style={styles.avatarEdit}>Profilbild ändern</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.emojiBtn} onPress={() => setShowEmojiModal(true)}>
        <Text>Anderes Emoji wählen</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Status:</Text>
      <TextInput
        style={styles.input}
        value={status}
        onChangeText={setStatus}
        placeholder="Was geht gerade ab?"
        placeholderTextColor="#999"
        maxLength={64}
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={uploading}>
        <Text style={styles.saveButtonText}>{uploading ? 'Speichert...' : 'Speichern'}</Text>
      </TouchableOpacity>

      {/* Emoji Picker Modal */}
      <Modal visible={showEmojiModal} transparent animationType="fade" onRequestClose={() => setShowEmojiModal(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Emoji wählen</Text>
            <FlatList
              data={EMOJI_LIST}
              numColumns={5}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.emojiBox,
                    emoji === item && styles.selectedEmoji
                  ]}
                  onPress={() => { setEmoji(item); setAvatarUrl(null); setShowEmojiModal(false); }}
                >
                  <Text style={{ fontSize: 32 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.saveButton, { marginTop: 16, backgroundColor: '#bbb' }]} onPress={() => setShowEmojiModal(false)}>
              <Text>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles --- (unverändert)
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: '#e8f7fa', 
    alignItems: 'center' 
  },

  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },

  avatarBox: { 
    alignItems: 'center', 
    marginBottom: 18 
  },

  avatarImage: { 
    width: 92, 
    height: 92, 
    borderRadius: 46, 
    borderWidth: 2, 
    borderColor: '#007AFF' 
  },

  avatarEmoji: { 
    fontSize: 62,
    marginBottom: 6 
  },

  avatarEdit: { 
    color: '#007AFF', 
    fontSize: 14, 
    marginTop: 8 
  },

  emojiBtn: { 
    marginBottom: 10, 
    marginTop: -6 
  },

  label: { 
    alignSelf: 'flex-start', 
    fontWeight: 'bold', 
    fontSize: 15, 
    marginTop: 10 
  },

  input: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 10, 
    fontSize: 16, 
    marginVertical: 6, 
    width: 260 
  },

  saveButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 8, 
    padding: 12, 
    marginTop: 16, 
    alignItems: 'center', 
    width: 160, 
    alignSelf: 'center' 
  },

  saveButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  modalBackground: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.14)' 
  },

  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 18, 
    alignItems: 'center', 
    width: 265 
  },

  emojiBox: { 
    margin: 7, 
    padding: 8, 
    borderRadius: 6 
  },

  selectedEmoji: { 
    backgroundColor: '#b9f6ff' 
  }
});
