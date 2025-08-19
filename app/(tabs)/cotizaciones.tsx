import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp,
  updateDoc, where, orderBy
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

type Cliente = { id: string; nombre: string; telefono?: string };
type Item = { descripcion: string; cantidad: number; precio: number };
type Cotizacion = {
  id?: string;
  ownerId: string;
  clienteId: string;
  titulo?: string;
  items: Item[];
  total: number;
  moneda?: string;          // 'MXN' por defecto
  creado?: any;             // Timestamp
};

// ==== Paleta (igual que clientes/incidencias) ====
const C = {
  bg: '#060825',
  text: '#FFFFFF',
  fieldBg: 'rgba(255,255,255,0.18)',
  fieldBorder: 'rgba(255,255,255,0.22)',
  placeholder: 'rgba(255,255,255,0.7)',
  gradA: '#3AD6E8',
  gradB: '#1D5EDD',
};

// ==== Pantalla ====
export default function CotizacionesScreen() {
  const uid = auth.currentUser?.uid!;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [list, setList] = useState<Cotizacion[]>([]);

  // formulario
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [items, setItems] = useState<Item[]>([{ descripcion: '', cantidad: 1, precio: 0 }]);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // modal clientes
  const [openPicker, setOpenPicker] = useState(false);

// 1) Suscribir CLIENTES
useEffect(() => {
  const q = query(
    collection(db, 'clientes'),
    where('ownerId', '==', uid),
    orderBy('creado', 'desc')
  );
  const unsub = onSnapshot(q, snap => {
    const arr: Cliente[] = [];
    snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
    setClientes(arr);
  });
  return unsub;
}, [uid]);

// 2) Preseleccionar cliente si no hay 
useEffect(() => {
  if (!clienteId && clientes[0]) {
    setClienteId(clientes[0].id);
    setClienteNombre(clientes[0].nombre);
  }
}, [clienteId, clientes]);


  // cargar cotizaciones
  useEffect(() => {
    const q = query(
      collection(db, 'cotizaciones'),
      where('ownerId', '==', uid),
      orderBy('creado', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const arr: Cotizacion[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      setList(arr);
    });
    return unsub;
  }, [uid]);

  // total calculado
  const total = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0),
    [items]
  );

  function setItemField(i: number, key: keyof Item, val: string) {
    setItems(prev => {
      const next = [...prev];
      const it = { ...next[i] };
      if (key === 'cantidad' || key === 'precio') (it as any)[key] = Number(val.replace(',', '.')) || 0;
      else (it as any)[key] = val;
      next[i] = it;
      return next;
    });
  }

  function addItemRow() {
    setItems(prev => [...prev, { descripcion: '', cantidad: 1, precio: 0 }]);
  }
  function removeItemRow(i: number) {
    setItems(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function resetForm() {
    setTitulo('');
    setItems([{ descripcion: '', cantidad: 1, precio: 0 }]);
    setMoneda('MXN');
    setEditingId(null);
  }

  async function save() {
    if (!uid) return Alert.alert('Sesión', 'No hay sesión activa.');
    if (!clienteId) return Alert.alert('Cliente', 'Selecciona un cliente.');
    const cleanItems = items.filter(it => it.descripcion.trim().length > 0);
    if (cleanItems.length === 0) return Alert.alert('Ítems', 'Agrega al menos un ítem con descripción.');

    const payload: Cotizacion = {
      ownerId: uid,
      clienteId,
      titulo: titulo.trim(),
      items: cleanItems,
      total: Number(total.toFixed(2)),
      moneda,
      creado: serverTimestamp(),
    };

    try {
      setSaving(true);
      if (editingId) {
        const ref = doc(db, 'cotizaciones', editingId);
        await updateDoc(ref, { ...payload, creado: serverTimestamp() });
        Alert.alert('Éxito', 'Cotización actualizada.');
      } else {
        await addDoc(collection(db, 'cotizaciones'), payload);
        Alert.alert('Éxito', 'Cotización creada.');
      }
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', `${e?.code ?? ''}\n${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Cotizacion) {
    setEditingId(c.id!);
    setClienteId(c.clienteId);
    const cli = clientes.find(x => x.id === c.clienteId);
    setClienteNombre(cli?.nombre ?? '—');
    setTitulo(c.titulo ?? '');
    setItems(c.items);
    setMoneda((c.moneda as any) ?? 'MXN');
  }

  async function remove(id?: string) {
    if (!id) return;
    Alert.alert('Eliminar', '¿Eliminar la cotización?', [
      { text: 'Cancelar' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'cotizaciones', id)); }
          catch (e: any) { Alert.alert('Error', e?.message ?? ''); }
        }
      }
    ]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={s.h1}>{editingId ? 'Editar cotización' : 'Nueva cotización'}</Text>

        {/* Selección de cliente */}
        <Text style={s.label}>Cliente</Text>
        <Pressable onPress={() => setOpenPicker(true)} style={[s.input, { justifyContent: 'center' }]}>
          <Text style={{ color: clienteId ? C.text : C.placeholder }}>
            {clienteNombre || 'Selecciona un cliente'}
          </Text>
        </Pressable>

        <Text style={[s.label, { marginTop: 12 }]}> Descripción </Text>
        <TextInput
          placeholder="Ej. Servicio de soporte"
          placeholderTextColor={C.placeholder}
          style={s.input}
          value={titulo}
          onChangeText={setTitulo}
        />

        {/* Ítems */}
        <Text style={[s.h2, { marginTop: 16 }]}>Ítems</Text>
        {items.map((it, i) => (
          <View key={i} style={s.itemRow}>
            <TextInput
              placeholder="Descripción"
              placeholderTextColor={C.placeholder}
              style={[s.input, { flex: 1 }]}
              value={it.descripcion}
              onChangeText={(v) => setItemField(i, 'descripcion', v)}
            />
            <TextInput
              placeholder="Cant."
              placeholderTextColor={C.placeholder}
              keyboardType="numeric"
              style={[s.inputMini, { width: 80 }]}
              value={String(it.cantidad)}
              onChangeText={(v) => setItemField(i, 'cantidad', v)}
            />
            <TextInput
              placeholder="$"
              placeholderTextColor={C.placeholder}
              keyboardType="numeric"
              style={[s.inputMini, { width: 100 }]}
              value={it.precio ? String(it.precio) : ''}
              onChangeText={(v) => setItemField(i, 'precio', v)}
            />
            <Pressable onPress={() => removeItemRow(i)} style={s.removeChip}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>–</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addItemRow} style={s.addChip}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>+ Agregar ítem</Text>
        </Pressable>

        {/* Resumen */}
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.h2}>Total</Text>
          <Text style={[s.h2, { color: '#3AD6E8' }]}>{moneda} ${total.toFixed(2)}</Text>
        </View>

        <Pressable onPress={save} disabled={saving} style={{ marginTop: 16 }}>
          <LinearGradient colors={[C.gradA, C.gradB]} start={[0, 0.5]} end={[1, 0.5]} style={[s.btn, saving && { opacity: 0.7 }]}>
            <Text style={s.btnText}>{editingId ? 'Guardar cambios' : 'Crear cotización'}</Text>
          </LinearGradient>
        </Pressable>

        {editingId && (
          <Pressable onPress={resetForm} style={[s.btnOutline, { marginTop: 10 }]}>
            <Text style={s.btnText}>Cancelar edición</Text>
          </Pressable>
        )}

        {/* Listado */}
        <Text style={[s.h1, { marginTop: 24 }]}>Mis cotizaciones</Text>
        <FlatList
          data={list}
          keyExtractor={(x) => x.id!}
          renderItem={({ item }) => {
            const cli = clientes.find(c => c.id === item.clienteId);
            return (
              <View style={s.card}>
                <Text style={s.cardTitle}>{item.titulo || 'Sin título'}</Text>
                <Text style={s.cardSub}>Cliente: {cli?.nombre || item.clienteId}</Text>
                <Text style={s.meta}>Ítems: {item.items?.length ?? 0}</Text>
                <Text style={[s.meta, { color: '#3AD6E8', fontWeight: '800' }]}>
                  Total: {item.moneda || 'MXN'} ${Number(item.total ?? 0).toFixed(2)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Pressable onPress={() => startEdit(item)} style={[s.smallBtn, { backgroundColor: '#1D5EDD' }]}>
                    <Text style={s.smallBtnText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(item.id)} style={[s.smallBtn, { backgroundColor: '#e53935' }]}>
                    <Text style={s.smallBtnText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: C.placeholder, marginTop: 8 }}>Aún no hay cotizaciones.</Text>}
          style={{ marginTop: 8 }}
        />
      </ScrollView>

      {/* Modal de clientes */}
      <Modal visible={openPicker} transparent animationType="fade" onRequestClose={() => setOpenPicker(false)}>
        <Pressable style={s.modalBg} onPress={() => setOpenPicker(false)}>
          <View style={s.modalCard}>
            <Text style={[s.h2, { marginBottom: 8 }]}>Selecciona cliente</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {clientes.map(cli => (
                <Pressable
                  key={cli.id}
                  onPress={() => { setClienteId(cli.id); setClienteNombre(cli.nombre); setOpenPicker(false); }}
                  style={s.rowPick}
                >
                  <Text style={{ color: C.text, fontWeight: '700' }}>{cli.nombre}</Text>
                  {cli.telefono ? <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{cli.telefono}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ==== Estilos reutilizables ====
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 16 },
  h1: { color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 10 },
  h2: { color: C.text, fontSize: 18, fontWeight: '800' },
  label: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: {
    height: 56, borderRadius: 28, paddingHorizontal: 18,
    backgroundColor: C.fieldBg, borderWidth: 1, borderColor: C.fieldBorder, color: C.text
  },
  inputMini: {
    height: 56, borderRadius: 28, paddingHorizontal: 14,
    backgroundColor: C.fieldBg, borderWidth: 1, borderColor: C.fieldBorder, color: C.text, marginLeft: 8
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addChip: {
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: '#1D5EDD', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18
  },
  removeChip: { marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: '#e53935',
    alignItems: 'center', justifyContent: 'center' },
  btn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  btnOutline: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 28,
    height: 56, alignItems: 'center', justifyContent: 'center'
  },
  card: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)', padding: 12, marginBottom: 10,
  },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  meta: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '88%', backgroundColor: C.bg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  rowPick: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
});
