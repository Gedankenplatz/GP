import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment'; 
import { Image } from 'react-native';
import { InteractionManager } from 'react-native';



// ----------- ALTER PUSH-WEG FÜR GRUPPEN (kann später ersetzt werden) -----------
async function sendPushNotification(toUserId, title, body) {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', toUserId)
    .single();
  if (error || !data) {
    console.warn('[PUSH] Kein Push-Token für Empfänger gefunden:', error);
    return;
  }
  const token = data.token;
  console.log('[PUSH] Sende Push an', toUserId, 'Token:', token, 'Title:', title, 'Body:', body);


  const { data: { session } } = await supabase.auth.getSession();
  const access_token = session?.access_token;
  if (!access_token) {
    console.warn('[PUSH] Kein Access Token verfügbar!');
    return;
  }


  const resp = await fetch('https://qimpgchqxrducbmbvfaz.functions.supabase.co/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`,
  },

  body: JSON.stringify({ token, title, body }),
  });
  console.log('[PUSH] Push-Response', resp.status);
  if (!resp.ok) {
    const errorText = await resp.text();
    console.warn('[PUSH] Fehlertext:', errorText);
  }
}

export default function ChatScreen({ navigation, route }) {
  // 1. Navigation-Parameter sauber übernehmen
  const {
    roomId: navRoomId,
    roomName,
    privateChatId: navPrivateChatId,
    contactName,
  } = route.params || {};

  // 2. State-Management
  const [roomId, setRoomId] = useState(navRoomId || null);
  const [privateChatId, setPrivateChatId] = useState(navPrivateChatId || null);
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userListVisible, setUserListVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileToShow, setProfileToShow] = useState(null);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const [inputHeight, setInputHeight] = useState(60);
  const [partnerProfile, setPartnerProfile] = useState(null);

  // 3. Navigation-IDs synchronisieren
  useEffect(() => {
    setRoomId(navRoomId || null);
    setPrivateChatId(navPrivateChatId || null);
  }, [navRoomId, navPrivateChatId]);

  // 4. Header anpassen
  useLayoutEffect(() => {
    if (privateChatId) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowProfileModal(true)} style={{ marginRight: 16 }}>
            <MaterialIcons name="person" size={28} color="#007AFF" />
          </TouchableOpacity>
        ),
        title: partnerProfile ? `Chat mit ${partnerProfile.emoji || "🙂"} ${partnerProfile.nickname || "Kontakt"}` 
        : 'Privatchat'
      });
    } else if (roomName) {    
      navigation.setOptions({ title: roomName });
    }
  }, [navigation, privateChatId, roomName, partnerProfile]);

  // 5. Eigene User-ID holen
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!privateChatId || !myId) return;
    let cancelled = false;

    (async () => {
      // Chat-Relation holen
      const { data: chat } = await supabase
        .from('private_chats')
        .select('user1_id, user2_id')
        .eq('id', privateChatId)
        .single();

      if (!chat) return;

      // Partner bestimmen
      const partnerId = chat.user1_id === myId ? chat.user2_id : chat.user1_id;

      // Partner-Profil holen
      const { data: partner } = await supabase
        .from('profiles')
        .select('nickname, emoji, avatar_url')
        .eq('id', partnerId)
        .single();

      if (!cancelled) setPartnerProfile(partner);
    })();

    return () => { cancelled = true; };
  }, [privateChatId, myId]);


  useEffect(() => {
    if (!roomId || !myId) return;
    const updateLastRead = async () => {
      await supabase
        .from('room_reads')
        .upsert([
          {
          user_id: myId,
          room_id: roomId,
          last_read_at: new Date().toISOString(),
        }
      ]);
    };
    updateLastRead();
  }, [roomId, myId]);

  // 6. Realtime Subscription – optimiert NUR für diesen Chat!
  useEffect(() => {
    if (!roomId && !privateChatId) return;

      const filter = roomId
        ? { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }
        : { event: 'INSERT', schema: 'public', table: 'messages', filter: `private_chat_id=eq.${privateChatId}` };

      const channel = supabase
        .channel('chat-room')
        .on('postgres_changes', filter, (payload) => {
          // Neue Nachricht einhängen
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [roomId, privateChatId]);

  // 7. Nachrichten initial laden (Pagination kann später ergänzt werden)
  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (roomId) query = query.eq('room_id', roomId);
      else if (privateChatId && myId) query = query.eq('private_chat_id', privateChatId);
      else {
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) {
        Alert.alert('Fehler beim Laden der Nachrichten', error.message);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    }
    fetchMessages();
  }, [roomId, privateChatId, myId]);

  // 7. Nachrichten initial laden (Pagination kann später ergänzt werden)
  useEffect(() => {
    async function fetchProfiles() {
      const ids = Array.from(new Set(messages.map(msg => msg.sender_id)));
      if (ids.length) {
        const { data } = await supabase
          .from('profiles')
          .select('id, nickname, emoji, avatar_url, status')
          .in('id', ids);
        setProfiles(data || []);
      }
    }
    if (messages.length) fetchProfiles();
  }, [messages]);

  // 8. Automatisch runterscrollen
  useEffect(() => {
    if (!messages.length) return;
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  // 9. Nachricht senden (absolut DRY & stabil!)
  const sendMessage = async () => {
    if (!input.trim() || !myId || (!roomId && !privateChatId) || (roomId && privateChatId)) {
      Alert.alert('Nachricht konnte nicht gesendet werden', 'Bitte Text eingeben und gültigen Chat auswählen.');
      return;
    }
    setSending(true);
    const messageData = { sender_id: myId, content: input };
    if (roomId) messageData.room_id = roomId;
    if (privateChatId) messageData.private_chat_id = privateChatId;

    const { error } = await supabase.from('messages').insert([messageData]);
    setSending(false);



    if (error) {
      Alert.alert('Fehler beim Senden', error.message);
      return;
    }

    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);

    // --- PUSH & Analytics ---
    if (privateChatId) {
  // 1. Partner-ID holen
      const { data: chat, error: chatError } = await supabase
        .from('private_chats')
        .select('user1_id, user2_id')
        .eq('id', privateChatId)
        .single();

      if (chatError || !chat) {
        console.warn("[PRIVPUSH] Kein Privatchat gefunden!", chatError?.message);
      return;
      }


      const partnerId = chat.user1_id === myId ? chat.user2_id : chat.user1_id;
      if (!partnerId) {
        console.warn("[PRIVPUSH] PartnerId konnte nicht bestimmt werden");
      return;
      }
      console.log("[PRIVPUSH] Sende Push an PartnerId:", partnerId);

      // 2. Push schicken
      await sendPushNotification(partnerId, 'Neue Privatnachricht', input);
    }

  
    if (roomId) {
      // Gruppenraum-Logik
      const { data: members, error: membersError } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId);

      if (!membersError && members && members.length > 0) {
        const memberIds = members
          .map(m => m.user_id)
          .filter(uid => uid !== myId);

        for (const toUserId of memberIds) {
          await sendPushNotification(
            toUserId,
            `Neue Nachricht im Raum ${roomName || 'Gruppe'}`,
            input
          );
          
        }
      }

      analytics().logEvent('message_sent', {
        type: 'room',
        to_user: null,
        room_id: roomId
      });
    }

    
  };

  useEffect(() => {
    if (!roomId || !myId) return;
      const addMembership = async () => {
      await supabase
        .from('room_members')
        .upsert([{ room_id: roomId, user_id: myId }], { onConflict: ['room_id', 'user_id'] });
    };
      addMembership();
  }, [roomId, myId]);



    // 10. Nutzerliste holen
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase.from('profiles').select('id, nickname, status, emoji');
      if (!error) setUsers(data || []);
    }
    fetchUsers();
  }, []);

  function getProfile(senderId) {
    return profiles.find(p => p.id === senderId) || {};
  }
  function getProfileEmoji(senderId) {
    return getProfile(senderId).emoji || '🙂';
  }
  function getProfileName(senderId) {
    return getProfile(senderId).nickname || 'Unbekannt';
  }
  function getProfileAvatar(senderId) {
    // Falls du auf Avatar-URL wechselst:
    return getProfile(senderId).avatar_url || null;
  }

  // 11. Nachricht antippen → Modal öffnen
  function handleMessagePress(message) {
    setSelectedMessage(message);
  }

  // 12. Profil für Modal holen
  function showProfile(senderId) {
    setProfileToShow(getProfile(senderId));
    setShowProfileModal(true);
    setSelectedMessage(null);
  }

  const MessageActionModal = (
    <Modal
      visible={!!selectedMessage}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedMessage(null)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
            Nachricht von {getProfileName(selectedMessage?.sender_id)}
          </Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setInput(`@${getProfileName(selectedMessage.sender_id)}:` );
              setSelectedMessage(null);
            }}
          >
            <Text>Antworten</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => showProfile(selectedMessage.sender_id)}
          >
            <Text>Profil anzeigen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#bbb' }]}
            onPress={() => setSelectedMessage(null)}
          >
            <Text>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // 14. Profil-Modal
  const ProfileModal = (
    <Modal
      visible={showProfileModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowProfileModal(false)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Profil</Text>
          {/* Avatar als Bild (wenn vorhanden), sonst Emoji */}
          {profileToShow?.avatar_url ? (
            <Image
              source={{ uri: profileToShow.avatar_url }}
              style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 10 }}
            />
          ) : (
            <Text style={{ fontSize: 42, marginBottom: 10 }}>{profileToShow?.emoji || '🙂'}</Text>
          )}
          <Text style={{ fontSize: 17, marginBottom: 4 }}>{profileToShow?.nickname || 'Unbekannt'}</Text>
          <Text style={{ color: '#666', marginBottom: 12 }}>Status: {profileToShow?.status || '–'}</Text>
          <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#bbb', marginTop: 10 }]} onPress={() => setShowProfileModal(false)}>
            <Text>Schließen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const UserListModal = (
    <Modal
      visible={userListVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setUserListVisible(false)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nutzerliste</Text>
          <FlatList
            data={users.filter(u => u.id !== myId)}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={async () => {
                  setUserListVisible(false);

                  // Bestehenden privaten Chat suchen (beide Richtungen)
                  const { data: existingChats } = await supabase
                    .from('private_chats')
                    .select('id')
                    .or(
                      `and(user1_id.eq.${myId},user2_id.eq.${item.id}),and(user1_id.eq.${item.id},user2_id.eq.${myId})`
                    )
                    .limit(1);

                  let chatId = existingChats?.[0]?.id;
                  if (!chatId) {
                    // Neu anlegen
                    const { data: newChat, error: insertError } = await supabase
                      .from('private_chats')
                      .insert([{ user1_id: myId, user2_id: item.id }])
                      .select()
                      .single();
                    if (insertError) {
                      Alert.alert('Fehler beim Anlegen des privaten Chats!', insertError.message);
                      return;
                    }
                    chatId = newChat.id;
                  }

                  navigation.navigate('Chats', {
                    screen: 'Chat',
                    params: { privateChatId: chatId, contactName: item.nickname },
                  });
                }}
              >
                <Text style={styles.userName}>{item.emoji} {item.nickname}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => setUserListVisible(false)} style={styles.modalClose}>
            <Text style={styles.closeText}>Schließen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
  <KeyboardAvoidingView
    style={{ flex: 1, backgroundColor: 'rgba(157, 237, 252, 0.86)' }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 5 : 0}
  >
    <View style={{ flex: 1 }}>
      <View style={[styles.chatBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.chatBarTitle}>
          {privateChatId
            ? (contactName ? `Chat mit ${contactName}` : 'Privatchat')
            : (roomName || 'Raum')}
        </Text>
      </View>
      {/* + Button für Userlist nur im Gruppenmodus */}
      {!privateChatId && (
        <View style={{ position: 'absolute', top: 55, right: 20, zIndex: 10 }}>
          <TouchableOpacity onPress={() => setUserListVisible(true)}>
            <MaterialIcons name="person" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Nachrichtenanzeige */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id?.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleMessagePress(item)}
            style={[
              styles.messageBubble,
              item.sender_id === myId ? styles.myBubble : styles.otherBubble
            ]}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' }}>
              {/* Profilbild/Emoji */}
              {getProfileAvatar(item.sender_id) ? (
                <Image
                  source={{ uri: getProfileAvatar(item.sender_id) }}
                  style={{ width: 30, height: 30, borderRadius: 15, marginRight: 8 }}
                />
              ) : (
                <Text style={{ fontSize: 24, marginRight: 8 }}>
                  {getProfileEmoji(item.sender_id)}
                </Text>
              )}
              <View style={{ maxWidth: 300 }}>
                <Text style={styles.messageText}>{item.content}</Text>
                <View style={styles.infoRow}>
                  {/* Username nur anzeigen, wenn nicht die eigene Nachricht */}
                  {item.sender_id !== myId && (
                    <Text style={styles.username}>{getProfileName(item.sender_id)}</Text>
                  )}
                   <Text style={styles.timestamp}>
                    {moment(item.created_at).format('HH:mm')}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 70 }}>
            Noch keine Nachrichten
          </Text>
        }

        // DAS ist wichtig: Abstand nach unten für die Inputleiste!
        contentContainerStyle={{ paddingBottom: inputHeight }}
          style={{ flex: 1 }}
          onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
      />


      {/* Eingabefeld IMMER ganz unten, außerhalb der FlatList! */}
      <View style={
        styles.inputContainer}
        onLayout={event => setInputHeight(event.nativeEvent.layout.height)}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nachricht schreiben..."
          placeholderTextColor="#aaa"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending}>
          <MaterialIcons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {UserListModal}
      {MessageActionModal}
      {ProfileModal}
    </View>
  </KeyboardAvoidingView>
);

}

// ... styles bleiben identisch wie von dir oben!

const styles = StyleSheet.create({
  messageBubble: {
    borderRadius: 22,
    padding: 10,
    margin: 4,
    maxWidth: '80%',         // Bubble maximal breit!
    minWidth: 70,            // Optional: nicht zu schmal
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#e0f7fa',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    flexShrink: 1,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },

  username: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 8,
    maxWidth: 120,
  },
  
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginLeft: 2,
  },

  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 5,
    alignItems: 'center',
    borderRadius: 24,
    margin: 10,
    elevation: 3,
    marginBottom: 0,
    
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 5,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 22,
    padding: 12,
    marginLeft: 8,
    marginBottom: 2,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    width: 280,
    elevation: 4,
    alignItems: 'center',
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginVertical: 8,
    width: 180,
    alignItems: 'center',
  },
  userItem: {
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
  },
  modalClose: {
    marginTop: 10,
    alignItems: 'center',
  },
  closeText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  chatBar: {
    paddingBottom: 15,
    backgroundColor: 'rgba(156, 196, 241, 0.26)',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 9,
    paddingTop: 25
  },

  chatBarTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 0.5,
  },

});
