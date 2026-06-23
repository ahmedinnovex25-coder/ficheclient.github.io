/**
 * api.js — Couche API centralisée pour Fiche Client
 * Remplace db.js (IndexedDB) par des appels REST vers le serveur Mac
 * Toutes les données sont partagées entre tous les appareils
 */

// Détecte automatiquement l'URL du serveur (fonctionne sur localhost ET via IP locale)
const API_BASE = window.location.origin + '/api';

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json' },
  };
  const res = await fetch(url, { ...defaultOptions, ...options });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── VISITORS ─────────────────────────────────────────────────────────────────

async function addVisitor(visitor) {
  return apiFetch('/visitors', {
    method: 'POST',
    body: JSON.stringify(visitor),
  });
}

async function getAllVisitors() {
  return apiFetch('/visitors');
}

async function deleteVisitor(id) {
  return apiFetch(`/visitors/${id}`, { method: 'DELETE' });
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────

async function addTeamMember(member) {
  return apiFetch('/team', {
    method: 'POST',
    body: JSON.stringify(member),
  });
}

async function getAllTeamMembers() {
  return apiFetch('/team');
}

async function deleteTeamMember(id) {
  return apiFetch(`/team/${id}`, { method: 'DELETE' });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

async function getSetting(key) {
  const data = await apiFetch(`/settings/${key}`);
  return data.value;
}

async function setSetting(key, value) {
  return apiFetch(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

// ─── Export (same interface as old db.js) ────────────────────────────────────

window.DB = {
  // Compatibility stubs (openDB not needed with REST API)
  openDB: () => Promise.resolve(),
  addVisitor,
  getAllVisitors,
  deleteVisitor,
  addTeamMember,
  getAllTeamMembers,
  deleteTeamMember,
  getSetting,
  setSetting,
};
