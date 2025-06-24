// RoomListScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';


export default function RoomListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!myId) return;

    const loadData = async () => {
      setLoading(true);
      const { data: roomList } = await supabase.from('rooms').select('id, name');
      const { data: reads } = await supabase
      .from('room_reads')
      .select('room_id, last_read_at')
      .eq('user_id', myId);

      const unreadMap = {};
    for (let room of roomList) {
      const lastRead = reads?.find(r => r.room_id === room.id)?.last_read_at;
      let msgQuery = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);
      if (lastRead) {
        msgQuery = msgQuery.gt('created_at', lastRead);
      }
      const { count } = await msgQuery;
      unreadMap[room.id] = count || 0;
    }

      setRooms(roomList || []);
      setUnreadCounts(unreadMap);
      setLoading(false);
    };

    loadData();
  }, [myId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Räume</Text>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomItem}
            onPress={() =>
              navigation.navigate('Chat', {
                roomId: item.id,
                roomName: item.name,
              })
            }
          >
            <Text style={styles.roomName}>{item.name}</Text>
            {unreadCounts[item.id] > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCounts[item.id]}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(191, 245, 255, 0.86)'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#007AFF'
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1
  },
  roomName: {
    fontSize: 16,
    color: '#333'
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center'
  },
  unreadText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});