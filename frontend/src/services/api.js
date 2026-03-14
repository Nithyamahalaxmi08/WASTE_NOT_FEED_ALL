const BASE_URL = "http://127.0.0.1:8000";

import axios from "axios";
// import { API_BASE_URL } from "../utils/constants";

export const registerDonor = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/register/donor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Donor registration failed");
  }

  return result;
};


export const registerVolunteer = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/register/volunteer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Volunteer registration failed");
  }

  return result;
};


export const registerNGO = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/register/ngo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "NGO registration failed");
  }

  return result;
};

export const loginUser = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Login failed");
  }

  return result;
};

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default API;