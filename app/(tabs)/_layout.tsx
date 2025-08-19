// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { Image, Text, View, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const BG = '#060825';

function truncate(s = '', n = 22) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function TabsLayout() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // Escucha cambios de sesión para refrescar el header
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  const idText = user?.displayName || user?.email || '';

  const HeaderTitle = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image source={require('../../assets/TeckAdm.png')} style={{ width: 22, height: 22 }} />
      <Text style={{ color: '#fff', fontWeight: '800' }}>TeckAdm</Text>
    </View>
  );

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 220, marginRight: 80 }}>
      {!!idText && (
        <View style={{
          paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.04)', maxWidth: 160
        }}>
          <Text style={{ color: '#cfd3fff8', fontWeight: '300' }} numberOfLines={1}>
            {truncate(idText)}
          </Text>
        </View>
      )}
      <Pressable
        onPress={() => signOut(auth).then(() => router.replace('/(auth)/sign-in'))}
      >
        <Text style={{ color: '#1e88e5', fontWeight: '700' }}>Salir</Text>
      </Pressable>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerTintColor: '#fff',
        headerTitle: () => <HeaderTitle />,
        headerTitleAlign: 'center',
        headerRight: () => <HeaderRight />,
        tabBarStyle: { backgroundColor: BG, borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="incidencias" options={{ title: 'Incidencias' }} />
      <Tabs.Screen name="cotizaciones" options={{ title: 'Cotizaciones' }} />
    </Tabs>
  );
}
