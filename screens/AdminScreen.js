import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet, Modal, ActivityIndicator
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../lib/supabase';

export default function AdminScreen() {
  // States
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [stats, setStats] = useState({ users: 0, rooms: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ visible: false, action: null, data: null });

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Daten laden
  const fetchData = async () => {
    setLoading(true);
    // User laden
    const { data: userList } = await supabase.from('profiles').select('id, email, nickname, status, is_admin, blocked');
    setUsers(userList || []);
    // Räume laden
    const { data: roomList } = await supabase.from('rooms').select('id, name, created_at');
    setRooms(roomList || []);
    // Stats laden
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: roomCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
    const { count: messageCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
    setStats({ users: userCount || 0, rooms: roomCount || 0, messages: messageCount || 0 });
    setLoading(false);
  };

  // Adminrechte ändern
  const setAdmin = async (userId, adminFlag) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ is_admin: adminFlag }).eq('id', userId);
    if (error) Alert.alert('Fehler', error.message);
    fetchData();
  };

  // User sperren/freischalten
  const setBlocked = async (userId, blockedFlag) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ blocked: blockedFlag }).eq('id', userId);
    if (error) Alert.alert('Fehler', error.message);
    fetchData();
  };

  // Raum anlegen
  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const { error } = await supabase.from('rooms').insert([{ name: newRoomName }]);
    if (error) Alert.alert('Fehler', error.message);
    setNewRoomName('');
    fetchData();
  };

  // Raum löschen (nur mit Bestätigung)
  const confirmDeleteRoom = (roomId, name) => {
    setConfirmModal({
      visible: true,
      action: () => deleteRoom(roomId),
      data: { text: `Raum "${name}" wirklich löschen?` },
    });
  };
  const deleteRoom = async (roomId) => {
    setConfirmModal({ visible: false, action: null, data: null });
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) Alert.alert('Fehler', error.message);
    fetchData();
  };

  const sendTestPush = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      Alert.alert('Nicht eingeloggt');
      return;
    }

    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single();

    if (error || !data?.token) {
      Alert.alert('Kein Token gefunden', error?.message || 'Kein Token vorhanden');
      return;
    }

    try {
      const res = await fetch('https://qimpgchqxrducbmbvfaz.functions.supabase.co/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbXBnY2hxeHJkdWNibWJ2ZmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODA3ODksImV4cCI6MjA2NDM1Njc4OX0.Ou6jsTxE2XSGL56TFRVt6ZENfCS4crzY2Y2Ny7vfKQM'
        },
        body: JSON.stringify({
          token: data.token,
          title: 'Push-Test erfolgreich!',
          body: 'Diese Nachricht kommt direkt vom Adminbereich 🎯'
        })
      });

      if (res.ok) {
        Alert.alert('Push gesendet', 'Check dein Gerät 📲');
      } else {
        const text = await res.text();
        Alert.alert('Fehler beim Push', text);
      }
    } catch (err) {
      Alert.alert('Fehler', err.message);
    }
  };

  // User filtern nach Suche
  const filteredUsers = users.filter(u =>
    u.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adminbereich</Text>
      {loading ? <ActivityIndicator size="large" color="#007AFF" /> : null}

      {/* Statistiken */}
      <View style={styles.statsContainer}>
        <View style={styles.statsBox}><Text style={styles.statsNum}>{stats.users}</Text><Text style={styles.statsLabel}>User</Text></View>
        <View style={styles.statsBox}><Text style={styles.statsNum}>{stats.rooms}</Text><Text style={styles.statsLabel}>Räume</Text></View>
        <View style={styles.statsBox}><Text style={styles.statsNum}>{stats.messages}</Text><Text style={styles.statsLabel}>Nachrichten</Text></View>
      </View>

      <TouchableOpacity
        onPress={sendTestPush}
        style={{
          backgroundColor: '#00b894',
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          marginBottom: 14,
          marginTop: 6
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>📬 Test-Push an mich senden</Text>
      </TouchableOpacity>

      {/* Userliste */}
      <Text style={styles.section}>Nutzerverwaltung</Text>
      <TextInput
        style={styles.input}
        placeholder="User suchen..."
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        style={{ maxHeight: 180 }}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.nickname || item.email}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{item.email}</Text>
              <Text style={{ fontSize: 12 }}>Status: {item.status}</Text>
              <Text style={{ fontSize: 12, color: item.blocked ? 'red' : '#888' }}>
                {item.blocked ? 'GESPERRT' : 'AKTIV'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.adminButton, item.is_admin && { backgroundColor: '#007AFF' }]}
              onPress={() => setAdmin(item.id, !item.is_admin)}
            >
              <MaterialIcons name="admin-panel-settings" size={22} color={item.is_admin ? '#fff' : '#007AFF'} />
              <Text style={[styles.adminButtonText, item.is_admin && { color: '#fff' }]}>
                {item.is_admin ? 'Admin entziehen' : 'Admin geben'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, item.blocked && { backgroundColor: '#c00' }]}
              onPress={() => setBlocked(item.id, !item.blocked)}
            >
              <MaterialIcons name={item.blocked ? "lock-open" : "block"} size={22} color={item.blocked ? '#fff' : '#c00'} />
              <Text style={[styles.adminButtonText, item.blocked && { color: '#fff' }]}>
                {item.blocked ? 'Entsperren' : 'Sperren'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>Keine User gefunden.</Text>}
      />

      {/* Räume verwalten */}
      <Text style={styles.section}>Räume verwalten</Text>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Neuer Raumname"
          value={newRoomName}
          onChangeText={setNewRoomName}
        />
        <TouchableOpacity style={styles.roomAddBtn} onPress={createRoom}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        style={{ maxHeight: 120 }}
        renderItem={({ item }) => (
          <View style={styles.roomRow}>
            <Text style={styles.roomName}>{item.name}</Text>
            <TouchableOpacity onPress={() => confirmDeleteRoom(item.id, item.name)}>
              <MaterialIcons name="delete" size={24} color="#c00" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>Keine Räume vorhanden.</Text>}
      />

      {/* Bestätigungs-Modal */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ marginBottom: 18, fontSize: 17 }}>{confirmModal.data?.text}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setConfirmModal({ visible: false, action: null, data: null })}>
                <Text style={{ color: '#666' }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmModal.action && confirmModal.action()}>
                <Text style={{ color: '#d00', fontWeight: 'bold' }}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ========== Styles ==========
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 10, 
    backgroundColor: 'rgba(191, 245, 255, 0.86)',
    
  },

  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: '#007AFF', 
    textAlign: 'center',
    marginTop: 45, 
  },

  statsContainer: 
  { flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginVertical: 10 
  },

  statsBox: { 
    alignItems: 'center', 
    padding: 10, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    minWidth: 70, 
    elevation: 1 
  },

  statsNum: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#007AFF' 
  },

  statsLabel: { 
    color: '#888', 
    fontSize: 13 
  },

  section: { 
    marginTop: 18, 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8 
  },

  input: { 
    backgroundColor: '#fff',
    borderRadius: 8, 
    borderColor: '#eee', 
    borderWidth: 1, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    marginBottom: 8 
  },

  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginVertical: 5, 
    padding: 10, 
    elevation: 1 
  },

  adminButton: { 
    marginHorizontal: 5, 
    padding: 6, 
    borderRadius: 8, 
    backgroundColor: '#4a90e2',
    borderWidth: 1, 
    borderColor: '#007AFF', 
    flexDirection: 'row', 
    alignItems: 'center' 
  },

  adminButtonText: { 
    marginLeft: 5, 
    color: '#007AFF', 
    fontWeight: '600', 
    fontSize: 13 
  },

  roomRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#4a90e2', 
    borderRadius: 10, 
    marginVertical: 0, 
    padding: 12, 
    elevation: 1 
  },

  roomName: { 
    fontSize: 16, 
    color: '#4a90e2' 
  },

  roomAddBtn: { 
    backgroundColor: '#007AFF', 
    borderRadius: 10, 
    padding: 8, 
    marginLeft: 10, 
    alignItems: 'center', 
    justifyContent: 'center'
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },

  modalBox: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 22, 
    width: 260, 
    alignItems: 'center', 
    elevation: 6 
  },

  confirmBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 10 
  },
  
});
