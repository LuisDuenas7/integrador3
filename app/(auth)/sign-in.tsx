import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';

const C = {
  bg: '#060825',                 // fondo
  text: '#FFFFFF',               // texto principal
  fieldBg: 'rgba(255,255,255,0.18)',
  fieldBorder: 'rgba(255,255,255,0.22)',
  placeholder: 'rgba(255,255,255,0.7)',
  gradA: '#3AD6E8',              // gradiente botón (izq)
  gradB: '#1D5EDD',              // gradiente botón (der)
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSignIn() {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      router.replace('/clientes');
    } catch (e: any) {
      console.log('Auth error:', e?.code, e?.message);
      // puedes mostrar Alert si quieres feedback
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={s.container}>
      <StatusBar barStyle="light-content" />
      {/* Header con logo */}
      <View style={s.header}>
        <Image source={require('../../assets/TeckAdm.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.brand}>TeckAdm</Text>
      </View>

      {/* Campos */}
      <View style={s.form}>
        <Text style={s.label}>Usuario</Text>
        <TextInput
          placeholder="tu@correo.com"
          placeholderTextColor={C.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          style={s.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[s.label,{marginTop:18}]}>Contraseña</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={C.placeholder}
          secureTextEntry
          style={s.input}
          value={pass}
          onChangeText={setPass}
        />

        <Pressable onPress={onSignIn} disabled={loading} style={{ marginTop: 28 }}>
          <LinearGradient
            colors={[C.gradA, C.gradB]}
            start={[0, 0.5]} end={[1, 0.5]}
            style={[s.cta, loading && { opacity: 0.7 }]}
          >
            <Text style={s.ctaText}>{loading ? 'Entrando…' : 'Iniciar sesión'}</Text>
          </LinearGradient>
        </Pressable>

        <Link href="/(auth)/sign-up" style={s.link}>Crear cuenta</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 24 },
  logo: { width: 90, height: 90, marginBottom: 6 },
  brand: { color: C.text, fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  form: { marginTop: 24 },
  label: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  input: {
    height: 62,
    borderRadius: 31,
    paddingHorizontal: 22,
    backgroundColor: C.fieldBg,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    color: C.text,
  },
  cta: { height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  link: { color: C.text, textAlign: 'center', marginTop: 18, fontSize: 18, opacity: 0.9 },
});
