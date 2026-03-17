import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
  Platform, Modal, ScrollView,
} from "react-native";

import { getAvailableDonations, claimDonation } from "../../services/api";

const TYPE_CONFIG = {
  homeless_shelter:   { color: "#d32f2f", emoji: "🏠", label: "Homeless Shelter" },
  orphanage:          { color: "#e64a19", emoji: "👶", label: "Orphanage" },
  old_age_home:       { color: "#7b1fa2", emoji: "👴", label: "Old Age Home" },
  community_kitchen:  { color: "#1565c0", emoji: "🍽️", label: "Community Kitchen" },
  slum_settlement:    { color: "#f57f17", emoji: "🏘️", label: "Slum Settlement" },
  ngo_distribution:   { color: "#2e7d32", emoji: "📦", label: "NGO / Community Hall" },
  govt_welfare:       { color: "#00838f", emoji: "🏛️", label: "Govt Welfare Centre" },
  low_income_housing: { color: "#4527a0", emoji: "🏗️", label: "Low Income Housing" },
};
const DEFAULT_TYPE = { color: "#e53935", emoji: "📍", label: "Need Point" };

export default function AvailableDonationsScreen({ route, navigation }) {

  const ngoId = route?.params?.ngoId || "";

  const [donations,   setDonations]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [claiming,    setClaiming]    = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [showModal,   setShowModal]   = useState(false);

  useEffect(() => { fetchDonations(); }, []);

  /* ---------------- FETCH ---------------- */
  const fetchDonations = async () => {
    try {
      const data = await getAvailableDonations();
      setDonations(data || []);
    } catch (err) {
      Platform.OS === "web"
        ? window.alert("Could not load donations: " + err.message)
        : Alert.alert("Error", "Could not load donations: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ---------------- CLAIM ---------------- */
  const handleClaim = async (item) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(`Claim "${item.name}" from ${item.pickup_location || "unknown location"}?`)
        : await new Promise((resolve) =>
            Alert.alert(
              "Claim Donation",
              `Claim "${item.name}" from ${item.pickup_location || "unknown location"}?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Claim",  onPress: () => resolve(true) },
              ]
            )
          );

    if (!confirmed) return;
    setClaiming(item.id);

    try {
      const result = await claimDonation(item.id, ngoId);

      if (result?.recommendation) {
        setRecommendation({
          spot:        result.recommendation,   // red_spot row
          rec_message: result.rec_message,
          donation:    item,
        });
        setShowModal(true);
      } else {
        Platform.OS === "web"
          ? window.alert(`✅ "${item.name}" claimed successfully!`)
          : Alert.alert("Success", `✅ "${item.name}" has been claimed!`);
      }

      fetchDonations();
    } catch (err) {
      Platform.OS === "web"
        ? window.alert("Error: " + err.message)
        : Alert.alert("Error", err.message);
    } finally {
      setClaiming(null);
    }
  };

  /* ---------------- MODAL ---------------- */
  const renderModal = () => {
    if (!recommendation) return null;

    const { spot, rec_message, donation } = recommendation;
    const cfg   = TYPE_CONFIG[spot.type] || DEFAULT_TYPE;
    const color = cfg.color;

    return (
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: color }]}>
              <Text style={styles.modalHeaderText}>
                📍 Hunger Hotspot Recommendation
              </Text>
              <Text style={styles.modalHeaderSub}>
                Donation claimed successfully!
              </Text>
            </View>

            <ScrollView style={styles.modalBody}>

              {/* Claimed donation info */}
              <View style={styles.donationInfo}>
                <Text style={styles.donationInfoLabel}>Claimed Donation</Text>
                <Text style={styles.donationInfoName}>{donation.name}</Text>
                {donation.pickup_location && (
                  <Text style={styles.donationInfoLocation}>
                    📍 Pickup: {donation.pickup_location}
                  </Text>
                )}
              </View>

              {/* Recommended red spot */}
              <View style={[styles.zoneCard, { borderColor: color }]}>
                <Text style={styles.zoneCardLabel}>Deliver Food To</Text>

                <Text style={[styles.zoneName, { color }]}>
                  {cfg.emoji}  {spot.place_name}
                </Text>

                {/* Type badge */}
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: color + "20", borderColor: color },
                ]}>
                  <Text style={[styles.typeBadgeText, { color }]}>
                    {cfg.label.toUpperCase()}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.zoneStats}>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{spot.city}</Text>
                    <Text style={styles.statLabel}>City</Text>
                  </View>

                  {spot.distance_km != null && (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{spot.distance_km} km</Text>
                      <Text style={styles.statLabel}>Distance</Text>
                    </View>
                  )}

                </View>

                {spot.address ? (
                  <Text style={styles.spotAddress}>📍 {spot.address}</Text>
                ) : null}

                <Text style={styles.recMessage}>{rec_message}</Text>
              </View>

            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.viewMapBtn}
                onPress={() => {
                  setShowModal(false);
                  navigation.navigate("HungerMap", { ngoId });
                }}
              >
                <Text style={styles.viewMapBtnText}>🗺️ View Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeBtnText}>Got it ✓</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    );
  };

  /* ---------------- DONATION CARD ---------------- */
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.foodName}>{item.name}</Text>
        {item.type && (
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{item.type}</Text>
          </View>
        )}
      </View>

      {item.pickup_location && (
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.pickup_location}</Text>
        </View>
      )}
      {item.expiry && (
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            Expires: {new Date(item.expiry).toDateString()}
          </Text>
        </View>
      )}
      {item.contact_no && (
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📞</Text>
          <Text style={styles.detailText}>{item.contact_no}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.claimBtn, claiming === item.id && { opacity: 0.6 }]}
        onPress={() => handleClaim(item)}
        disabled={claiming === item.id}
      >
        {claiming === item.id
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.claimBtnText}>✅ Claim This Donation</Text>
        }
      </TouchableOpacity>
    </View>
  );

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading donations...</Text>
      </View>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <SafeAreaView style={styles.container}>
      {renderModal()}

      <Text style={styles.heading}>🍱 Available Donations</Text>
      <Text style={styles.count}>{donations.length} donation(s) available</Text>

      {donations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🫙</Text>
          <Text style={styles.emptyText}>No donations available right now.</Text>
          <Text style={styles.emptySubText}>Check back later!</Text>
        </View>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchDonations(); }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#f7f9fc" },
  heading:          { fontSize: 26, fontWeight: "700", paddingHorizontal: 16, marginTop: 10, color: "#1a1a1a" },
  count:            { fontSize: 14, color: "#666", paddingHorizontal: 16, marginBottom: 10 },
  center:           { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText:      { marginTop: 10, color: "#666" },
  emptyIcon:        { fontSize: 50, marginBottom: 10 },
  emptyText:        { fontSize: 18, fontWeight: "600", color: "#666" },
  emptySubText:     { fontSize: 14, color: "#999", marginTop: 4 },

  /* Donation Card */
  card:             { backgroundColor: "#fff", padding: 18, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: "#eee" },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  foodName:         { fontSize: 18, fontWeight: "700", color: "#222" },
  typePill:         { backgroundColor: "#e3f2fd", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillText:     { fontSize: 12, color: "#1976d2", fontWeight: "600" },
  detailRow:        { flexDirection: "row", alignItems: "center", marginTop: 4 },
  detailIcon:       { marginRight: 6 },
  detailText:       { color: "#444", fontSize: 14 },
  claimBtn:         { marginTop: 14, backgroundColor: "#2e7d32", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  claimBtnText:     { color: "#fff", fontWeight: "600" },

  /* Modal */
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalCard:        { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", maxHeight: "85%" },
  modalHeader:      { padding: 16 },
  modalHeaderText:  { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalHeaderSub:   { color: "#fff", marginTop: 2 },
  modalBody:        { padding: 16 },
  donationInfo:     { marginBottom: 16 },
  donationInfoLabel:{ fontSize: 12, color: "#777" },
  donationInfoName: { fontSize: 18, fontWeight: "700" },
  donationInfoLocation: { color: "#555", marginTop: 2 },
  zoneCard:         { borderWidth: 2, borderRadius: 10, padding: 14 },
  zoneCardLabel:    { fontSize: 12, color: "#777" },
  zoneName:         { fontSize: 20, fontWeight: "700", marginVertical: 4 },
  typeBadge:        { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginBottom: 10 },
  typeBadgeText:    { fontWeight: "700", fontSize: 12 },
  zoneStats:        { flexDirection: "row", gap: 20, marginBottom: 8 },
  statItem:         { alignItems: "center" },
  statValue:        { fontSize: 15, fontWeight: "700" },
  statLabel:        { fontSize: 12, color: "#777" },
  spotAddress:      { fontSize: 13, color: "#555", marginTop: 4 },
  recMessage:       { marginTop: 10, color: "#444" },
  modalActions:     { flexDirection: "row", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderColor: "#eee" },
  viewMapBtn:       { backgroundColor: "#1976d2", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  viewMapBtnText:   { color: "#fff", fontWeight: "600" },
  closeBtn:         { backgroundColor: "#eee", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  closeBtnText:     { fontWeight: "600" },
});