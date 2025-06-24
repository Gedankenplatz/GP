import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { supabase } from './lib/supabase';
import { NavigationContainer } from '@react-navigation/native';

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ImpressumScreen from './screens/ImpressumScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfUseScreen from './screens/TermsOfUseScreen';
import AdminScreen from './screens/AdminScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import RoomListScreen from './screens/RoomListScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AppStack = createNativeStackNavigator();


function ChatsStack() {
  return (
    <Stack.Navigator initialRouteName="ChatsOverview" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatsOverview" component={HomeScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ titel: 'Chat '}} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Impressum" component={ImpressumScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="RoomListScreen" component={RoomListScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {

      if (data.session?.user) {
       
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.session.user.id)
          .maybeSingle();
        setIsAdmin(profile?.is_admin === true);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);
  


return (
  <Tab.Navigator
    initialRouteName="Chats"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Chats') iconName = 'chat';
        else if (route.name === 'Mitglieder') iconName = 'people';
        else if (route.name === 'Profile') iconName = 'person';
        else if (route.name === 'Settings') iconName = 'settings';
        else if (route.name === 'Admin') iconName = 'admin-panel-settings';
        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      
      tabBarStyle: { backgroundColor: 'rgba(75, 183, 255, 0.44)', borderTopWidth: 0, height: 105
       },
      tabBarLabelStyle: { fontSize: 10, paddingBottom: 0 },
      headerShown: false,
    })}
  >
    {/* ChatsStack als EIN Tab */}
      <Tab.Screen
        name="Chats"
        component={ChatsStack}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Einstellungen' }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function MainNavigator({ session }) {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <AppStack.Screen name="Main" component={TabNavigator} />
          {/* Impressum etc. sind von überall erreichbar */}
          <AppStack.Screen name="Impressum" component={ImpressumScreen} />
          <AppStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <AppStack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
        </>
      ) : (
        <>
          <AppStack.Screen name="Login" component={LoginScreen} />
          <AppStack.Screen name="Register" component={RegisterScreen} />
        </>  
      )}
    </AppStack.Navigator>  
  );
}

  
