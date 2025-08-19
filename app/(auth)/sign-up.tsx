import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { Link, useRouter } from 'expo-router';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSignUp() {
    try {
      if (pass.length < 6) return Alert.alert('La contraseña debe tener al menos 6 caracteres');
      if (pass !== confirm) return Alert.alert('Las contraseñas no coinciden');
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
      router.replace('/clientes');
    } catch (e: any) {
      Alert.alert('Error al crear', `${e.code}\n${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Crear cuenta</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={s.input}
      />

      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={pass}
        onChangeText={setPass}
        style={s.input}
      />

      <TextInput
        placeholder="Confirmar contraseña"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={s.input}
      />

      <Pressable style={[s.btn, s.primary]} onPress={onSignUp} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Creando…' : 'Crear cuenta'}</Text>
      </Pressable>

      <Link href="/(auth)/sign-in" style={s.link}>Ya tengo cuenta</Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: '#2e7d32' },
  btnText: { color: '#fff', fontWeight: '700' },
  link: { marginTop: 8, textAlign: 'center', color: '#1e88e5', fontWeight: '600' },
});
