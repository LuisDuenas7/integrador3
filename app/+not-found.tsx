// app/+not-found.tsx
import { Stack, useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View style={s.container}>
        <Text style={s.title}>Pantalla no encontrada</Text>
        <Pressable style={s.btn} onPress={() => router.replace('/')}>
          <Text style={s.btnText}>Ir al inicio</Text>
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  btn: { backgroundColor: '#1e88e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
