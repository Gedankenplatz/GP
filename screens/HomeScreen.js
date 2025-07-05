import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';


export default function ChatsOverviewScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [privateChats, setPrivateChats] = useState(null);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [nickname, setNickname] = useState('Gast');
  const [status, setStatus] = useState('');
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [privateChatModalVisible, setPrivateChatModalVisible] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  

  // User & alle Grunddaten laden
    async function fetchAll() {
      setLoading(true);
      
        // User holen
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        // Profil holen
        if (authUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname, status')
            .eq('id', authUser.id)
            .maybeSingle();
          setNickname(profileData?.nickname || 'Gast');
          setStatus(profileData?.status || '');
        }

        // Räume holen
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .order('name', { ascending: true });
        setRooms(roomsData || []);

        // Private Chats holen (bei denen du einer der beiden bist)
        if (authUser) {
          const { data: privChatsData } = await supabase
            .from('private_chats')
            .select('*')
            .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`);
          setPrivateChats(privChatsData || []);
        }

        // Userliste laden (für Privatchat-Auswahl)
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id, nickname, emoji')
          .neq('id', authUser?.id);
        setUsers(allUsers || []);

        setLoading(false);
  }

    useEffect(() => {
     fetchAll();
    }, []);


    useFocusEffect(
      React.useCallback(() => {
        fetchAll();
      }, [])
    );

  // Anderen User im Private Chat rausfinden + Profil holen
  const getContactInfo = (chat) => {
    if (!user) return { name: 'Unbekannt', id: null };
    const otherId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
    const contact = chat.contact || {};
    return { name: contact.nickname || 'Kontakt', id: otherId, emoji: contact.emoji || '🙂' };
  };

  // Contact-Infos für alle privaten Chats nachladen (nur, wenn privateChats sich ändern!)
  useEffect(() => {
    async function enrichChats() {
      if (!user || !privateChats || !privateChats.length) return;
      const ids = privateChats.map(chat => chat.user1_id === user.id ? chat.user2_id : chat.user1_id);
      if (!ids.length) return;
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, emoji')
        .in('id', ids);
      const enriched = privateChats.map(chat => {
        const otherId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
        const contact = profilesData?.find(p => p.id === otherId) || {};
        return { ...chat, contact };
      });
      setPrivateChats(enriched);
    }
    enrichChats();
    // eslint-disable-next-line
  }, [privateChats, user]);

  // Raum anlegen (Created by setzen)
  const createRoom = async () => {
    if (!newRoomName.trim() || !user) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: newRoomName, created_by: user.id }])
      .select();
    if (!error && data?.length) {
      setRooms(prev => [...prev, data[0]]);
      setRoomModalVisible(false);
      setNewRoomName('');
    } else {
      alert("Fehler beim Erstellen des Raums: " + (error?.message || ''));
    }
  };

  // Neuen privaten Chat anlegen/öffnen
  const handlePrivateChat = async (otherUser) => {
    setPrivateChatModalVisible(false);
    if (!user) return;
    // Existierenden privaten Chat suchen oder anlegen
    const { data: existingChats } = await supabase
      .from('private_chats')
      .select('id')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherUser.id}),and(user1_id.eq.${otherUser.id},user2_id.eq.${user.id})`
      )
      .limit(1);

    let chatId = existingChats?.[0]?.id;
    if (!chatId) {
      const { data: newChat, error } = await supabase
        .from('private_chats')
        .insert([{ user1_id: user.id, user2_id: otherUser.id }])
        .select()
        .single();
      if (error) {
        alert('Fehler beim Anlegen: ' + error.message);
        return;
      }
      chatId = newChat.id;
    }

    navigation.navigate('Chat', {
        privateChatId: chatId,
        contactName: `${otherUser.emoji || '🙂'} ${otherUser.nickname}`,
    });
  };


    const handleDeletePrivateChat = async (chatId) => {
    if (!chatId) return;
    try {
      // 1. Alle Nachrichten löschen
      await supabase.from('messages').delete().eq('private_chat_id', chatId);
      // 2. Chat löschen
      await supabase.from('private_chats').delete().eq('id', chatId);
      // 3. Liste neu laden
      await fetchAll();
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Willkommen, {nickname}!</Text>
      {status ? <Text style={styles.status}>Status: {status}</Text> : null}

      <Text style={styles.subheading}>Gruppenräume</Text>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomButton}
            onPress={() =>
              navigation.navigate('Chat', {
                roomId: item.id, 
                roomName: item.name,
              })
            }
          >
            <Text style={styles.roomName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setRoomModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
        <Text style={{ color: '#fff', marginLeft: 6 }}>Neuen Raum erstellen</Text>
      </TouchableOpacity>

      <Text style={styles.subheading}>Private Chats</Text>
      <FlatList
        data={privateChats || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const { name, emoji } = getContactInfo(item);
          return (
            <TouchableOpacity
              style={styles.roomButton}
              onPress={() =>
                navigation.navigate('Chat', {
                  privateChatId: item.id, 
                  contactName: `${emoji} ${name}`,
                })
              }
              onLongPress={() =>
                Alert.alert(
                  'Privatchat löschen',
                  `Willst du den Chat mit ${emoji} ${name} wirklich löschen?`,
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    { text: 'Löschen', style: 'destructive', onPress: () => handleDeletePrivateChat(item.id) }
                  ]
                )
              }
            >
              <Text style={styles.roomName}>
                {emoji} {name === "Kontakt" ? "Wird geladen..." : name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
      style={[styles.addButton, { backgroundColor: '#28b5a3' }]}
      onPress={() => setPrivateChatModalVisible(true)}
    >
      <MaterialIcons name="person-add" size={24} color="#fff" />
      <Text style={{ color: '#fff', marginLeft: 6 }}>Privatchat starten</Text>
    </TouchableOpacity>

    {/* Modal: Neuen Raum erstellen */}
    <Modal visible={roomModalVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Neuen Raum anlegen</Text>
          <TextInput
            placeholder="Raumname"
            value={newRoomName}
            onChangeText={setNewRoomName}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
            <TouchableOpacity style={styles.modalButton} onPress={createRoom}>
              <Text style={{ color: '#fff' }}>Erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#bbb' }]} onPress={() => setRoomModalVisible(false)}>
              <Text>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal: Privatchat starten */}
    <Modal visible={privateChatModalVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Privatchat starten</Text>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roomButton}
                  onPress={() => handlePrivateChat(item)}
                >
                  <Text style={styles.roomName}>{item.emoji} {item.nickname}</Text>
                </TouchableOpacity>
              )}
            />          
            
            <TouchableOpacity style={[styles.modalButton, { marginTop: 12, backgroundColor: '#bbb' }]} onPress={() => setPrivateChatModalVisible(false)}>
              <Text>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );         
}

// Styles wie gehabt (Beispiel, kannst du übernehmen)
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'rgba(191, 245, 255, 0.86)', 
    padding: 20
  },

  heading: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 6,
    marginTop: 45, 
    color: 'rgba(7, 7, 6, 0.2)', 
  },

  status: { 
    color: '#007AFF', 
    marginBottom: 18 
  },

  subheading: { 
    fontSize: 20,
    marginVertical: 10, 
    color: 'rgba(138, 120, 238, 0.2)', 
    fontWeight: 'bold' 
  },

  roomButton: { 
    backgroundColor: 'rgba(9, 97, 230, 0.94)', 
    borderRadius: 10, 
    marginVertical: 4, 
    padding: 14 
  },

  roomName: { 
    fontSize: 16, 
    color: '#333' 
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 10,
    alignSelf: 'flex-start',
    elevation: 2,
  },

  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 15, 15, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },

  modalContent: { 
    backgroundColor: 'rgba(96, 228, 252, 0.86)', 
    borderRadius: 14, 
    padding: 24, 
    width: 300, 
    elevation: 4 
  },

  input: { 
    borderColor: 'rgba(85, 5, 150, 0.2)', 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 8, 
    marginBottom: 0 
  },

  modalButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 10, 
    padding: 12, 
    marginHorizontal: 8, 
    alignItems: 'center', 
    minWidth: 70 
  },
});

