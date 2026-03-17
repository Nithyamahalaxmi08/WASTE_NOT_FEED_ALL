import { supabase } from "./supabaseClient";

const BASE_URL = "http://localhost:8000";

// ─────────────────────────────────────────────
// GET AUTH TOKEN FROM SUPABASE SESSION
// ─────────────────────────────────────────────
const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};


// ═════════════════════════════════════════════
// NGO PROFILE
// ═════════════════════════════════════════════
export const getNGOProfile    = (ngoId)        => API.get(`/ngo/profile/${ngoId}`);
export const updateNGOProfile = (ngoId, data)  => API.put(`/ngo/profile/${ngoId}`, data);

// ═════════════════════════════════════════════
// DONOR PROFILE
// ═════════════════════════════════════════════
export const getDonorProfile    = (donorId)       => API.get(`/donor/profile/${donorId}`);
export const updateDonorProfile = (donorId, data) => API.put(`/donor/profile/${donorId}`, data);


// ─────────────────────────────────────────────
// SAFE ERROR MESSAGE EXTRACTOR
// ─────────────────────────────────────────────
export const safeMsg = (err) => {
  if (!err) return "Something went wrong";
  if (typeof err === "string") return err;
  if (err?.message && typeof err.message === "string") return err.message;
  return JSON.stringify(err);
};

// ─────────────────────────────────────────────
// CORE REQUEST FUNCTION
// ─────────────────────────────────────────────
const request = async (method, path, body = null) => {
  const headers = await getAuthHeaders();
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let response;
  let json;

  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (networkErr) {
    throw new Error("Cannot connect to server. Is the backend running?");
  }

  try {
    json = await response.json();
  } catch {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const msg =
      typeof json?.detail === "string"
        ? json.detail
        : typeof json?.message === "string"
        ? json.message
        : JSON.stringify(json);
    throw new Error(msg);
  }

  return json;
};

// ─────────────────────────────────────────────
// GENERIC API METHODS
// ─────────────────────────────────────────────
export const API = {
  get:    (path)        => request("GET",    path),
  post:   (path, body)  => request("POST",   path, body),
  put:    (path, body)  => request("PUT",    path, body),
  delete: (path)        => request("DELETE", path),
};

// ═════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════

export const registerDonor     = (data) => API.post("/auth/register/donor",     data);
export const registerVolunteer = (data) => API.post("/auth/register/volunteer", data);
export const registerNGO       = (data) => API.post("/auth/register/ngo",       data);
export const loginUser         = (data) => API.post("/auth/login",              data);
export const logoutUser        = async () => { await supabase.auth.signOut(); };

// ═════════════════════════════════════════════
// DONATIONS
// ═════════════════════════════════════════════

export const getAvailableDonations = ()              => API.get("/donations/available");
export const getAllDonations        = ()              => API.get("/donations");
export const addDonation           = (data)          => API.post("/donations", data);
export const deleteDonation        = (id)            => API.delete(`/donations/${id}`);
export const claimDonation         = (donationId, ngoId) =>
  API.put(`/donations/${donationId}/claim`, { ngo_id: ngoId });
export const getMyClaims           = (ngoId)         => API.get(`/donations/claims/${ngoId}`);

// ═════════════════════════════════════════════
// NGO EVENTS
// ═════════════════════════════════════════════

export const getNGOEvents    = (ngoId)   => API.get(`/ngo/events/${ngoId}`);
export const createNGOEvent  = (data)    => API.post("/ngo/events", data);
export const completeNGOEvent= (eventId) => API.put(`/ngo/events/${eventId}/complete`, {});
export const deleteNGOEvent  = (eventId) => API.delete(`/ngo/events/${eventId}`);

// ═════════════════════════════════════════════
// VOLUNTEERS
// ═════════════════════════════════════════════

export const getAllVolunteers  = ()     => API.get("/ngo/volunteers-list");
export const getActiveEvents   = ()     => API.get("/ngo/events/active");
export const assignVolunteer   = (data) => API.post("/ngo/assign-volunteer", data);

export const assignDonation = (donationId, volunteerId) =>
  API.post(`/volunteer/donations/${donationId}/assign`, { volunteer_id: volunteerId });

export const getAssignedDonations = (volunteerId) =>
  API.get(`/volunteer/donations/assigned/${volunteerId}`);

export const getVolunteerProfile = (volunteerId) =>
  API.get(`/volunteer/profile/${volunteerId}`);

export const updateDonationStatus = (donationId, status, volunteerId) =>
  API.put(`/volunteer/donations/${donationId}/status`, { status, volunteer_id: volunteerId });

export const getVolunteerStats = (volunteerId) =>
  API.get(`/volunteer/stats/${volunteerId}`);