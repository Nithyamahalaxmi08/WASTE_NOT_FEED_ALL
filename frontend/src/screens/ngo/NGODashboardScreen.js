import React from "react";
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Alert, Platform,
} from "react-native";
import { Search, Bell, User, HeartHandshake } from "lucide-react-native";
import { logoutUser } from "../../services/api";

// ─────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────

const Navbar = ({ navigation, ngoId, onLogout }) => (
  <View style={styles.navbar}>

    {/* Left — Logo */}
    <View style={styles.navLeft}>
      <HeartHandshake size={26} color="#28a745" />
      <Text style={styles.navLogo}>FoodRescue</Text>
    </View>

    {/* Center — Nav links */}
    <View style={styles.navCenter}>
      <View style={styles.activeNavLinkWrapper}>
        <Text style={[styles.navLink, styles.activeNavLink]}>Dashboard</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate("AvailableDonations", { ngoId })}>
        <Text style={styles.navLink}>Donations</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("ManageEvents", { ngoId })}>
        <Text style={styles.navLink}>Events</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("HungerMap", { ngoId })}>
        <Text style={styles.navLink}>Hunger Map</Text>
      </TouchableOpacity>
    </View>

    {/* Right — Icons + Logout */}
    <View style={styles.navRight}>
      <TouchableOpacity style={styles.iconButton}>
        <Search size={20} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton}>
        <Bell size={20} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate("NGOProfile", { ngoId })}
      >
        <User size={20} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>

  </View>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function NGODashboardScreen({ navigation, route }) {
  const ngoId   = route?.params?.ngoId   || "";
  const ngoName = route?.params?.ngoName || "NGO";

  const cards = [
    {
      title:    "Hunger Hotspots",
      subtitle: "AI-powered map of areas with high food demand",
      icon: "📍", screen: "HungerMap", color: "#E53935",
      params: { ngoId },
    },
    {
      title:    "Available Donations",
      subtitle: "Browse & claim food donations from donors",
      icon: "🍱", screen: "AvailableDonations", color: "#4CAF50",
      params: { ngoId },
    },
    {
      title:    "Manage Events",
      subtitle: "Create and track pickup/distribution events",
      icon: "📅", screen: "ManageEvents", color: "#2196F3",
      params: { ngoId },
    },
    {
      title:    "Assign Volunteers",
      subtitle: "Assign registered volunteers to events",
      icon: "🙋", screen: "AssignVolunteers", color: "#FF9800",
      params: { ngoId },
    },
    {
      title:    "My Claims",
      subtitle: "View all donations your NGO has claimed",
      icon: "📦", screen: "MyClaims", color: "#9C27B0",
      params: { ngoId },
    },
  ];

  const handleLogout = async () => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Are you sure you want to logout?")
        : await new Promise((resolve) =>
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel",      onPress: () => resolve(false) },
              { text: "Logout", style: "destructive", onPress: () => resolve(true)  },
            ])
          );

    if (!confirmed) return;
    try { await logoutUser(); } catch (e) { console.warn(e); }
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Navbar */}
      <Navbar navigation={navigation} ngoId={ngoId} onLogout={handleLogout} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Welcome Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>🤝 NGO Dashboard</Text>
          <Text style={styles.bannerSub}>Welcome back! · Waste Not, Feed All</Text>
        </View>

        {/* Cards */}
        <View style={styles.grid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.screen}
              style={[styles.card, { borderLeftColor: card.color }]}
              onPress={() => navigation.navigate(card.screen, card.params)}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: "#f0f4f8" },
  scroll:               { paddingBottom: 40 },

  /* Navbar */
  navbar:               { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: "#eee", ...Platform.select({ web: { position: "sticky", top: 0, zIndex: 100 } }) },
  navLeft:              { flexDirection: "row", alignItems: "center", gap: 10 },
  navLogo:              { fontSize: 20, fontWeight: "bold", color: "#333" },
  navCenter:            { flexDirection: "row", alignItems: "center", gap: 24 },
  navLink:              { fontSize: 15, color: "#555", fontWeight: "500" },
  activeNavLinkWrapper: { backgroundColor: "#e6f7e9", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  activeNavLink:        { color: "#28a745", fontWeight: "700" },
  navRight:             { flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton:           { padding: 5 },
  logoutButton:         { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  logoutText:           { fontSize: 14, color: "#555", fontWeight: "500" },

  /* Banner */
  banner:               { backgroundColor: "#2e7d32", padding: 24, paddingTop: Platform.OS === "android" ? 40 : 24 },
  bannerTitle:          { fontSize: 24, fontWeight: "bold", color: "#fff" },
  bannerSub:            { fontSize: 13, color: "#c8e6c9", marginTop: 4 },

  /* Cards */
  grid:                 { padding: 16, gap: 14 },
  card:                 { backgroundColor: "#fff", borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", borderLeftWidth: 5, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, gap: 14 },
  cardIcon:             { fontSize: 34 },
  cardText:             { flex: 1 },
  cardTitle:            { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  cardSubtitle:         { fontSize: 13, color: "#666", marginTop: 3 },
  arrow:                { fontSize: 22, color: "#aaa" },
});