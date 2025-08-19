import { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable, FlatList, Alert, ActivityIndicator
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc,
  serverTimestamp, query, where, Timestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Picker } from "@react-native-picker/picker";

type Cliente = { id: string; nombre: string };
type Incidencia = {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: "abierta" | "en_proceso" | "cerrada";
  prioridad: "baja" | "media" | "alta";
  clienteId: string;
  clienteNombre?: string;
  ownerId: string;
  creado?: Timestamp | null;
};

const ESTADOS: Incidencia["estado"][] = ["abierta", "en_proceso", "cerrada"];
const PRIORIDADES: Incidencia["prioridad"][] = ["baja", "media", "alta"];

export default function Incidencias() {
  // sesión / carga
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loading, setLoading] = useState(true);
  const [clientsReady, setClientsReady] = useState(false);
  const [incReady, setIncReady] = useState(false);

  // datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // form
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<Incidencia["estado"]>("abierta");
  const [prioridad, setPrioridad] = useState<Incidencia["prioridad"]>("baja");
  const [clienteId, setClienteId] = useState<string>("");

  // 0) Escucha cambios de sesión (robusto para iOS/web)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      // resetea listas cuando cambia de usuario
      setClientes([]); setIncidencias([]);
      setClientsReady(false); setIncReady(false);
      setLoading(true);
    });
    return unsub;
  }, []);

  // 1) Suscribir CLIENTES del usuario
  useEffect(() => {
    if (!uid) { setClientsReady(true); return; }
    const q = query(collection(db, "clientes"), where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, nombre: (d.data() as any).nombre })) as Cliente[];
      setClientes(data);
      setClientsReady(true);
    });
    return () => unsub();
  }, [uid]);

  // 2) Si no hay cliente seleccionado, toma el primero cuando cambie la lista
  useEffect(() => {
    if (!clienteId && clientes.length) setClienteId(clientes[0].id);
  }, [clienteId, clientes]);

  // 3) Suscribir INCIDENCIAS del usuario
  useEffect(() => {
    if (!uid) { setIncReady(true); return; }
    const q = query(collection(db, "incidencias"), where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Incidencia[];
      setIncidencias(data);
      setIncReady(true);
    });
    return () => unsub();
  }, [uid]);

  // 4) loading general cuando ya cargaron ambas suscripciones
  useEffect(() => {
    if (clientsReady && incReady) setLoading(false);
  }, [clientsReady, incReady]);

  async function agregarIncidencia() {
    try {
      if (!uid) return Alert.alert("Sin sesión");
      if (!titulo.trim()) return Alert.alert("Falta el título");
      if (!clienteId) return Alert.alert("Selecciona un cliente");

      const cli = clientes.find(c => c.id === clienteId);
      await addDoc(collection(db, "incidencias"), {
        ownerId: uid,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || "",
        estado,
        prioridad,
        clienteId,
        clienteNombre: cli?.nombre ?? "",
        creado: serverTimestamp()
      });

      // limpiar form
      setTitulo("");
      setDescripcion("");
      setEstado("abierta");
      setPrioridad("baja");
    } catch (e: any) {
      Alert.alert("Error al agregar", e?.message ?? "Firestore error");
    }
  }

  async function borrarIncidencia(id: string) {
    try { await deleteDoc(doc(db, "incidencias", id)); }
    catch (e: any) { Alert.alert("Error al borrar", e?.message ?? "Firestore error"); }
  }

  async function avanzarEstado(item: Incidencia) {
    const idx = ESTADOS.indexOf(item.estado);
    const next = ESTADOS[(idx + 1) % ESTADOS.length]; // abierta -> en_proceso -> cerrada
    try { await updateDoc(doc(db, "incidencias", item.id), { estado: next }); }
    catch (e: any) { Alert.alert("Error al actualizar", e?.message ?? "Firestore error"); }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.h1}>Incidencias</Text>

      {/* --- Form alta --- */}
      <TextInput placeholder="Modelo" style={s.input} value={titulo} onChangeText={setTitulo} />
      <TextInput
        placeholder="Descripción"
        style={[s.input, { height: 80 }]}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      {/* Cliente */}
      {clientes.length > 0 ? (
        <View style={s.pickerBox}>
          <Picker selectedValue={clienteId} onValueChange={setClienteId}>
            {clientes.map(c => <Picker.Item key={c.id} label={c.nombre} value={c.id} />)}
          </Picker>
        </View>
      ) : (
        <Text style={{ marginBottom: 6, color: "#666" }}>
          Primero crea al menos un cliente en la pestaña Clientes.
        </Text>
      )}

      {/* Estado y prioridad */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[s.pickerBox, { flex: 1 }]}>
          <Picker selectedValue={estado} onValueChange={(v) => setEstado(v)}>
            {ESTADOS.map(e => <Picker.Item key={e} label={`Estado: ${e}`} value={e} />)}
          </Picker>
        </View>
        <View style={[s.pickerBox, { flex: 1 }]}>
          <Picker selectedValue={prioridad} onValueChange={(v) => setPrioridad(v)}>
            {PRIORIDADES.map(p => <Picker.Item key={p} label={`Prioridad: ${p}`} value={p} />)}
          </Picker>
        </View>
      </View>

      <Pressable style={[s.btn, s.btnPrimary]} onPress={agregarIncidencia}>
        <Text style={s.btnText}>Agregar incidencia</Text>
      </Pressable>

      {/* --- Lista --- */}
      <FlatList
        style={{ marginTop: 12 }}
        data={incidencias}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text>No hay incidencias.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.titulo}</Text>
              {!!item.descripcion && <Text style={s.cardSub}>{item.descripcion}</Text>}
              <Text style={s.cardMeta}>Cliente: {item.clienteNombre || item.clienteId}</Text>
              <Text style={s.cardMeta}>Estado: {item.estado}  •  Prioridad: {item.prioridad}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable style={[s.btnSmall, { backgroundColor: "#1e88e5" }]} onPress={() => avanzarEstado(item)}>
                <Text style={s.btnText}>Cambiar estado</Text>
              </Pressable>
              <Pressable style={[s.btnSmall, { backgroundColor: "#e53935" }]} onPress={() => borrarIncidencia(item.id)}>
                <Text style={s.btnText}>Borrar</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 8 },
  pickerBox: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  btn: { padding: 12, borderRadius: 8, alignItems: "center", marginTop: 4 },
  btnPrimary: { backgroundColor: "#2e7d32" },
  btnText: { color: "#fff", fontWeight: "700" },
  card: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { color: "#555", marginTop: 2 },
  cardMeta: { color: "#666", marginTop: 2 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: "center" }
});
