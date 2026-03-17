import React from "react";
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Alert, Platform,
} from "react-native";
import { logoutUser } from "../../services/api";

const C = {
  primary:     "#2d6a4f",
  primaryDark: "#1b4332",
  primaryLight:"#d8f3dc",
  primarySoft: "#f1faf3",
  primaryMid:  "#74c69d",
  text:        "#1b2d25",
  subtext:     "#4a6560",
  muted:       "#95b5a8",
  border:      "#c8e6d4",
  surface:     "#f6faf7",
  white:       "#ffffff",
  danger:      "#dc2626",
};

// Professional single-letter icons with distinct bg shades
const cards = (ngoId) => [
  {
    title:    "Hunger Hotspots",
    subtitle: "AI-powered map of high food demand areas",
    letter:   "H",
    bg:       "#1b4332",   // darkest green
    screen:   "HungerMap",
    params:   { ngoId },
  },
  {
    title:    "Available Donations",
    subtitle: "Browse & claim food donations from donors",
    letter:   "D",
    bg:       "#2d6a4f",
    screen:   "AvailableDonations",
    params:   { ngoId },
  },
  {
    title:    "Manage Events",
    subtitle: "Create and track pickup/distribution events",
    letter:   "E",
    bg:       "#40916c",
    screen:   "ManageEvents",
    params:   { ngoId },
  },
  {
    title:    "Assign Volunteers",
    subtitle: "Assign registered volunteers to tasks",
    letter:   "V",
    bg:       "#52b788",
    screen:   "AssignVolunteers",
    params:   { ngoId },
  },
  {
    title:    "My Claims",
    subtitle: "View all donations your NGO has claimed",
    letter:   "C",
    bg:       "#74c69d",
    screen:   "MyClaims",
    params:   { ngoId },
  },
];

export default function NGODashboardScreen({ navigation, route }) {
  const ngoId = route?.params?.ngoId || "";

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to sign out?")) return;
      await logoutUser();
      navigation.replace("Login");
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => { await logoutUser(); navigation.replace("Login"); } },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.root}>

      {/* Rich green header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>NGO DASHBOARD</Text>
            <Text style={styles.headerTitle}>Waste Not, Feed All</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip inside header */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>5</Text>
            <Text style={styles.statLbl}>Modules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>NGO</Text>
            <Text style={styles.statLbl}>Role</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>Live</Text>
            <Text style={styles.statLbl}>Status</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>MODULES</Text>

        {cards(ngoId).map((card) => (
          <TouchableOpacity
            key={card.screen}
            style={styles.card}
            onPress={() => navigation.navigate(card.screen, card.params)}
            activeOpacity={0.75}
          >
            {/* Coloured letter badge */}
            <View style={[styles.letterBox, { backgroundColor: card.bg }]}>
              <Text style={styles.letterText}>{card.letter}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSub}>{card.subtitle}</Text>
            </View>

            <View style={styles.arrowBox}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.signOutCard} onPress={handleLogout}>
          <Text style={styles.signOutCardText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    backgroundColor: C.primaryDark,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  headerLabel: { fontSize: 10, fontWeight: "700", color: C.primaryMid, letterSpacing: 1.5 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.white, marginTop: 4 },
  signOutBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  signOutText: { color: "rgba(255,255,255,0.8)", fontWeight: "600", fontSize: 12 },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    marginHorizontal: -20, paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statItem:   { flex: 1, alignItems: "center" },
  statNum:    { fontSize: 16, fontWeight: "800", color: C.white },
  statLbl:    { fontSize: 10, color: C.primaryMid, marginTop: 2, fontWeight: "600" },
  statDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  // ── Body ─────────────────────────────────────────────────────────
  body:         { padding: 16, gap: 8, paddingTop: 18 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: C.muted, letterSpacing: 1.2, marginBottom: 4 },

  // ── Card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 14, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.primaryDark, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  letterBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  letterText: { fontSize: 18, fontWeight: "800", color: C.white },
  cardBody:   { flex: 1 },
  cardTitle:  { fontSize: 15, fontWeight: "700", color: C.text },
  cardSub:    { fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 },
  arrowBox:   { width: 24, alignItems: "center" },
  arrowText:  { fontSize: 20, color: C.border, fontWeight: "300" },

  // ── Sign out card ─────────────────────────────────────────────────
  signOutCard: {
    marginTop: 4, borderRadius: 10, paddingVertical: 11,
    alignItems: "center", borderWidth: 1.5,
    borderColor: "#fecaca", backgroundColor: "#fff5f5",
  },
  signOutCardText: { color: C.danger, fontWeight: "700", fontSize: 13 },
});