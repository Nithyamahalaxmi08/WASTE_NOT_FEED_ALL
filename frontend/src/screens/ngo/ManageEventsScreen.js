import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, ScrollView,
  Modal, Platform,
} from "react-native";

import {
  getNGOEvents, createNGOEvent, completeNGOEvent, deleteNGOEvent,
} from "../../services/api";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const safeMsg = (err) => {
  if (!err) return "Something went wrong";
  if (typeof err === "string") return err;
  if (err?.message && typeof err.message === "string") return err.message;
  return JSON.stringify(err);
};

const crossConfirm = (title, message) => {
  if (Platform.OS === "web")
    return Promise.resolve(window.confirm(`${title}\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK",     onPress: () => resolve(true) },
    ])
  );
};

const crossAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

export default function ManageEventsScreen({ route }) {

  const ngoId = route?.params?.ngoId ?? null;

  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [creating,      setCreating]      = useState(false);

  const [form, setForm] = useState({
    title: "", location: "", event_date: "", description: "",
  });

  useEffect(() => {
    if (ngoId && ngoId !== "null" && ngoId !== "undefined") {
      fetchEvents();
    } else {
      // No valid ngoId — stop loading, show empty state
      setLoading(false);
    }
  }, [ngoId]);

  /* ── Fetch Events ── */
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getNGOEvents(ngoId);
      const list = data?.events ?? data ?? [];
      setEvents(list);
    } catch (err) {
      crossAlert("Error", safeMsg(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Create Event ── */
  const handleCreate = async () => {
    if (!form.title.trim())      { crossAlert("Error", "Event title is required"); return; }
    if (!form.location.trim())   { crossAlert("Error", "Location is required");    return; }
    if (!form.event_date.trim()) { crossAlert("Error", "Event date is required");  return; }

    setCreating(true);
    try {
      await createNGOEvent({
        ngo_id:      ngoId,
        title:       form.title,
        location:    form.location,
        event_date:  form.event_date,
        description: form.description,
      });
      crossAlert("Success", `"${form.title}" created.`);
      setModalVisible(false);
      setForm({ title: "", location: "", event_date: "", description: "" });
      fetchEvents();
    } catch (err) {
      crossAlert("Error", safeMsg(err));
    } finally {
      setCreating(false);
    }
  };

  /* ── Complete Event ── */
  const handleComplete = async (eventId, title) => {
    const ok = await crossConfirm("Complete Event", `Mark "${title}" as completed?`);
    if (!ok) return;
    try {
      await completeNGOEvent(eventId);
      crossAlert("Success", "Event marked completed.");
      fetchEvents();
    } catch (err) {
      crossAlert("Error", safeMsg(err));
    }
  };

  /* ── Delete Event ── */
  const handleDelete = async (eventId, title) => {
    const ok = await crossConfirm("Delete Event", `Delete "${title}"?`);
    if (!ok) return;
    try {
      await deleteNGOEvent(eventId);
      fetchEvents();
    } catch (err) {
      crossAlert("Error", safeMsg(err));
    }
  };

  const getStatusColor = (status) => {
    if (status === "upcoming")  return "#2e7d32";
    if (status === "completed") return "#757575";
    return "#f57c00";
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading events...</Text>
      </View>
    );
  }

  /* ── No NGO ID ── */
  if (!ngoId || ngoId === "null" || ngoId === "undefined") {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: "#e53935" }}>
          ⚠️ NGO ID not found. Please log in again.
        </Text>
      </View>
    );
  }

  /* ── Main UI ── */
  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>📅 My Events</Text>
          <Text style={styles.subheading}>{events.length} event(s)</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.newBtnText}>+ New Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No events yet</Text>
          </View>
        ) : (
          events.map((ev) => (
            <View key={ev.id} style={styles.card}>

              <View style={[styles.badge, {
                backgroundColor: getStatusColor(ev.status) + "20",
                borderColor:     getStatusColor(ev.status),
              }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(ev.status) }]}>
                  {(ev.status || "unknown").toUpperCase()}
                </Text>
              </View>

              <Text style={styles.cardTitle}>{ev.title}</Text>
              <Text style={styles.cardDetail}>📍 {ev.location}</Text>
              <Text style={styles.cardDetail}>📆 {ev.event_date}</Text>
              {ev.description ? (
                <Text style={styles.cardDesc}>{ev.description}</Text>
              ) : null}

              {ev.status !== "completed" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleComplete(ev.id, ev.title)}
                  >
                    <Text style={styles.completeBtnText}>✅ Mark Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(ev.id, ev.title)}
                  >
                    <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Create New Event</Text>

            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={form.location}
              onChangeText={(t) => setForm({ ...form, location: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={form.event_date}
              onChangeText={(t) => setForm({ ...form, event_date: t })}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Description"
              value={form.description}
              multiline
              onChangeText={(t) => setForm({ ...form, description: t })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>Create</Text>
                }
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f0f4f8" },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff" },
  heading:        { fontSize: 20, fontWeight: "bold", color: "#2e7d32" },
  subheading:     { fontSize: 12, color: "#888" },
  newBtn:         { backgroundColor: "#2e7d32", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  newBtnText:     { color: "#fff", fontWeight: "700" },
  list:           { padding: 16 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyIcon:      { fontSize: 60 },
  emptyText:      { fontSize: 18, fontWeight: "700", color: "#555" },
  card:           { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 14 },
  badge:          { alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  badgeText:      { fontSize: 11, fontWeight: "700" },
  cardTitle:      { fontSize: 16, fontWeight: "700" },
  cardDetail:     { fontSize: 13, color: "#555" },
  cardDesc:       { fontSize: 13, color: "#777", marginTop: 6 },
  actions:        { flexDirection: "row", marginTop: 12, gap: 10 },
  completeBtn:    { flex: 1, backgroundColor: "#e8f5e9", borderRadius: 8, padding: 10, alignItems: "center" },
  completeBtnText:{ color: "#2e7d32", fontWeight: "700" },
  deleteBtn:      { flex: 1, backgroundColor: "#fdecea", borderRadius: 8, padding: 10, alignItems: "center" },
  deleteBtnText:  { color: "#e53935", fontWeight: "700" },
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  modalTitle:     { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  input:          { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12 },
  modalActions:   { flexDirection: "row", gap: 12 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, alignItems: "center" },
  cancelBtnText:  { fontWeight: "700", color: "#555" },
  createBtn:      { flex: 1, backgroundColor: "#2e7d32", borderRadius: 8, padding: 12, alignItems: "center" },
  createBtnText:  { color: "#fff", fontWeight: "700" },
});