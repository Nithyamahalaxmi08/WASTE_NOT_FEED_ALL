import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground,
} from "react-native";

export default function DonorHomeScreen({ navigation, route }) {
  const donorId = route?.params?.donorId || "";

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1604200657090-ae45994b2451" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.overlay}>

        <View style={styles.header}>
          <Text style={styles.logo}>🍱 FoodRescue</Text>
          <Text style={styles.subtitle}>What would you like to do today?</Text>
        </View>

        <View style={styles.cardContainer}>

          {/* Option 1 — Scan & Donate */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: "#2ECC71" }]}
            onPress={() => navigation.navigate("ScanScreen")}
          >
            <Text style={styles.cardEmoji}>📷</Text>
            <Text style={styles.cardTitle}>Scan & Donate</Text>
            <Text style={styles.cardDesc}>
              Scan your pantry items and donate food that's about to expire
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>Get Started →</Text>
            </View>
          </TouchableOpacity>

          {/* Option 2 — My Donations */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: "#3498db" }]}
            onPress={() => navigation.navigate("DonorDashboard", { donorId })}
          >
            <Text style={styles.cardEmoji}>📋</Text>
            <Text style={styles.cardTitle}>My Donations</Text>
            <Text style={styles.cardDesc}>
              View and manage all your posted food donations
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>View All →</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.logoutText}>← Logout</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background:     { flex: 1 },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 20 },
  header:         { alignItems: "center", marginBottom: 40 },
  logo:           { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  subtitle:       { fontSize: 16, color: "#ddd", textAlign: "center" },
  cardContainer:  { width: "100%", maxWidth: 420, gap: 20 },
  card:           { borderRadius: 18, padding: 28, elevation: 4 },
  cardEmoji:      { fontSize: 44, marginBottom: 10 },
  cardTitle:      { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  cardDesc:       { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 20, marginBottom: 16 },
  cardArrow:      { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  cardArrowText:  { color: "#fff", fontWeight: "700", fontSize: 13 },
  logoutBtn:      { marginTop: 40 },
  logoutText:     { color: "#ddd", fontSize: 14 },
});