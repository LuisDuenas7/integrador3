import { useEffect, useState } from "react";
import {
  View, Text, Button, FlatList, TextInput,
  StyleSheet, Alert, Modal, Pressable, ActivityIndicator
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  updateDoc, serverTimestamp, query, where, Timestamp
} from "firebase/firestore";

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string;
  creado?: Timestamp | null;
  ownerId: string;
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(true);

  // Edición
  const [editVisible, setEditVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");

  // ---- SUSCRIPCIÓN EN TIEMPO REAL (FILTRADA POR ownerId) ----
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; } // RootLayout debería redirigir a login; por si acaso.

    const q = query(collection(db, "clientes"), where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Cliente[];
      setClientes(data);
      setLoading(false);
    }, (err) => {
      console.log("onSnapshot error:", err);
      setLoading(false);
      Alert.alert("Error", "No se pudieron cargar los clientes.");
    });

    return () => unsub();
  }, []);

  // ---- CREATE ----
  async function agregarCliente() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return Alert.alert("Sin sesión", "Inicia sesión para agregar clientes.");
      if (!nombre.trim()) return Alert.alert("Falta el nombre");

      await addDoc(collection(db, "clientes"), {
        ownerId: uid,                    // ← clave para pasar las reglas
        nombre: nombre.trim(),
        telefono: telefono.trim() || "",
        creado: serverTimestamp()
      });

      setNombre("");
      setTelefono("");
    } catch (e: any) {
      console.log("addDoc error:", e);
      Alert.alert("Error al agregar", e?.message ?? "Firestore error");
    }
  }

  // ---- DELETE ----
  async function borrarCliente(id: string) {
    try {
      await deleteDoc(doc(db, "clientes", id));
    } catch (e: any) {
      Alert.alert("Error al borrar", e?.message ?? "Firestore error");
    }
  }

  // ---- EDIT ----
  function abrirEditar(c: Cliente) {
    setEditId(c.id);
    setEditNombre(c.nombre || "");
    setEditTelefono(c.telefono || "");
    setEditVisible(true);
  }

  async function guardarEdicion() {
    try {
      if (!editId) return;
      if (!editNombre.trim()) return Alert.alert("El nombre no puede estar vacío");

      await updateDoc(doc(db, "clientes", editId), {
        nombre: editNombre.trim(),
        telefono: editTelefono.trim()
      });

      setEditVisible(false);
      setEditId(null);
    } catch (e: any) {
      Alert.alert("Error al actualizar", e?.message ?? "Firestore error");
    }
  }

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop:8 }}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Clientes</Text>

      {/* Alta */}
      <TextInput
        placeholder="Nombre del cliente"
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        placeholder="Teléfono (opcional)"
        style={styles.input}
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
      />
      <Button title="Agregar" onPress={agregarCliente} />

      {/* Lista */}
      <FlatList
        style={{ marginTop: 12 }}
        data={clientes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No hay clientes aún.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.nombre}</Text>
              {!!item.telefono && <Text style={styles.itemSub}>{item.telefono}</Text>}
            </View>
            <View style={styles.rowBtns}>
              <Pressable onPress={() => abrirEditar(item)} style={[styles.btnSmall, { backgroundColor: "#1e88e5" }]}>
                <Text style={styles.btnText}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => borrarCliente(item.id)} style={[styles.btnSmall, { backgroundColor: "#e53935" }]}>
                <Text style={styles.btnText}>Borrar</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Modal edición */}
      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar cliente</Text>
            <TextInput
              placeholder="Nombre"
              style={styles.input}
              value={editNombre}
              onChangeText={setEditNombre}
            />
            <TextInput
              placeholder="Teléfono"
              style={styles.input}
              value={editTelefono}
              onChangeText={setEditTelefono}
              keyboardType="phone-pad"
            />
            <View style={styles.rowBtns}>
              <Pressable onPress={guardarEdicion} style={[styles.btn, { backgroundColor: "#2e7d32" }]}>
                <Text style={styles.btnText}>Guardar</Text>
              </Pressable>
              <Pressable onPress={() => setEditVisible(false)} style={[styles.btn, { backgroundColor: "#9e9e9e" }]}>
                <Text style={styles.btnText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 10 },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemSub: { color: "#666" },
  rowBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  btnSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: 10, padding: 16, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 }
});
