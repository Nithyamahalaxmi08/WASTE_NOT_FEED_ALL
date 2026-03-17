import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { API, logoutUser } from "../services/api";
import DonationCard from "../components/DonationCard";
import { Ionicons } from "@expo/vector-icons";

const DonorDashboard = ({ navigation, route }) => {
  const donorId = route?.params?.donorId || "";

  const [donations, setDonations] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { fetchDonations(); }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await API.get("/donations");
      const dataToSet = res.data ? res.data : res;
      setDonations(dataToSet);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn("Logout error:", e.message);
    } finally {
      navigation.replace("Login");
    }
  };

  /* ── Header ── */
  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {/* Top navbar */}
      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          {/* Back → DonorHome */}
          <TouchableOpacity
            onPress={() => navigation.navigate("DonorHome", { donorId })}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.navBrand}>
            🍱 <Text style={styles.navBrandBold}>FoodRescue</Text>
          </Text>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.navLink}
            onPress={() => navigation.navigate("AddDonation")}
          >
            <Text style={styles.navLinkActive}>Post Donation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navLink}
            onPress={() => navigation.navigate("DonorDashboard", { donorId })}
          >
            <Text style={styles.navLinkText}>My Donations</Text>
          </TouchableOpacity>

          {/* Logout button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 2 }]}>FOOD ITEM</Text>
        <Text style={styles.headerText}>TYPE</Text>
        <Text style={styles.headerText}>EXPIRY</Text>
        <Text style={styles.headerText}>STATUS</Text>
        <Text style={[styles.headerText, { textAlign: "left" }]}>ACTIONS</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={donations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DonationCard
            donation={item}
            onViewDetails={(donation) =>
              navigation.navigate("DonationDetails", { donation })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No donations found.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
};

export default DonorDashboard;

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f7f9fc" },
  listContent:    { padding: Platform.OS === "web" ? 40 : 15, paddingBottom: 100 },
  center:         { flex: 1, justifyContent: "center", alignItems: "center" },

  /* Navbar */
  navbar:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee", marginBottom: 24 },
  navLeft:        { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:        { padding: 4 },
  navBrand:       { fontSize: 18, color: "#1a1a1a" },
  navBrandBold:   { fontWeight: "800" },
  navRight:       { flexDirection: "row", alignItems: "center", gap: 16 },
  navLink:        { paddingHorizontal: 12, paddingVertical: 6 },
  navLinkActive:  { fontSize: 14, fontWeight: "700", color: "#28a745", backgroundColor: "#e8f5e9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  navLinkText:    { fontSize: 14, color: "#555", fontWeight: "600" },

  /* Logout */
  logoutBtn:      { borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  logoutText:     { fontSize: 13, color: "#555", fontWeight: "600" },

  /* Table */
  headerContainer:{ marginBottom: 10 },
  tableHeader:    { flexDirection: "row", backgroundColor: "#f8f9fa", paddingVertical: 15, paddingHorizontal: 15, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: "#eee", alignItems: "center" },
  headerText:     { flex: 1, fontSize: 12, fontWeight: "700", color: "#6c757d", textTransform: "uppercase" },

  /* Empty */
  emptyState:     { padding: 60, alignItems: "center", backgroundColor: "#fff", borderRadius: 12 },
  emptyText:      { color: "#999", fontSize: 16 },
});