/**
 * app.js — Application logic for Fiche Client PWA
 */

const DEFAULT_ADMIN_PASSWORD = 'Admin123';

// ─── State ────────────────────────────────────────────────────────────────────

let currentView = null; // 'saisie' | 'admin'
let currentTab = 'team'; // 'team' | 'history' | 'backup'
let allVisitors = [];
let allTeam = [];

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function show(el) { el && el.classList.remove('hidden'); }
function hide(el) { el && el.classList.add('hidden'); }
function showId(id) { show($(id)); }
function hideId(id) { hide($(id)); }

// ─── Toast notifications ──────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

// ─── Initialization ───────────────────────────────────────────────────────────

async function init() {
  // ⚡ Show the home screen IMMEDIATELY — never wait for DB first
  showScreen('home');
  bindEvents();

  // Initialize DB in background (non-blocking)
  try {
    const storedPwd = await DB.getSetting('adminPassword');
    if (!storedPwd) {
      await DB.setSetting('adminPassword', DEFAULT_ADMIN_PASSWORD);
    }
    // Pre-load the team dropdown now that DB is ready
    await loadTeamDropdown();
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}

// ─── Screen routing ───────────────────────────────────────────────────────────

function showScreen(screen) {
  // Hide every screen (including the initially visible home screen)
  $$('.screen').forEach((s) => s.classList.add('hidden'));
  // Then reveal only the requested one
  const target = $(`#screen-${screen}`);
  if (target) {
    target.classList.remove('hidden');
    // Re-trigger the CSS fade-in animation
    target.style.animation = 'none';
    target.offsetHeight; // force reflow
    target.style.animation = '';
  }
  currentView = screen;
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function bindEvents() {
  // Profile selection
  $('#btn-saisie').addEventListener('click', () => showScreen('saisie'));
  $('#btn-admin-login').addEventListener('click', () => showScreen('admin-login'));

  // Back buttons
  $$('.btn-back-home').forEach((btn) =>
    btn.addEventListener('click', () => showScreen('home'))
  );

  // ── SAISIE SCREEN ──
  // Note: loadTeamDropdown() is called in init() after DB is ready
  $('#visitor-form').addEventListener('submit', handleVisitorSubmit);

  // ── ADMIN LOGIN ──
  $('#admin-login-form').addEventListener('submit', handleAdminLogin);
  $('#toggle-password-visibility').addEventListener('click', togglePasswordVisibility);

  // ── ADMIN TABS ──
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── TEAM MANAGEMENT ──
  $('#team-form').addEventListener('submit', handleAddTeamMember);

  // ── HISTORY ──
  $('#search-input').addEventListener('input', filterVisitors);
  $('#btn-delete-selected').addEventListener('click', deleteSelectedVisitors);
  $('#select-all-visitors').addEventListener('change', toggleSelectAll);

  // ── BACKUP ──
  $('#btn-export-csv').addEventListener('click', exportCSV);
  $('#btn-export-json').addEventListener('click', exportJSON);
  $('#btn-clear-data').addEventListener('click', confirmClearData);

  // ── CHANGE PASSWORD ──
  $('#change-pwd-form').addEventListener('submit', handleChangePassword);

  // Admin panel back button
  $('#btn-admin-logout').addEventListener('click', () => {
    showScreen('home');
  });
}

// ─── Saisie Screen ───────────────────────────────────────────────────────────

async function loadTeamDropdown() {
  allTeam = await DB.getAllTeamMembers();
  const select = $('#membre-select');
  // Keep the placeholder option
  select.innerHTML = '<option value="">-- Sélectionner un membre --</option>';
  allTeam.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.prenom} ${m.nom} — ${m.poste}`;
    select.appendChild(opt);
  });
}

async function handleVisitorSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');

  const visitor = {
    nom: $('#v-nom').value.trim(),
    prenom: $('#v-prenom').value.trim(),
    entreprise: $('#v-entreprise').value.trim(),
    email: $('#v-email').value.trim(),
    telephone: $('#v-telephone').value.trim(),
    note: $('#v-note').value.trim(),
    membreId: $('#membre-select').value,
    membreNom: $('#membre-select').options[$('#membre-select').selectedIndex]?.text || '',
  };

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enregistrement…';
    await DB.addVisitor(visitor);
    form.reset();
    showToast('Visiteur enregistré avec succès !', 'success');
    // Show success overlay
    showSuccessOverlay(visitor);
  } catch (err) {
    console.error(err);
    showToast('Erreur lors de l\'enregistrement.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✓</span> Valider l\'enregistrement';
  }
}

function showSuccessOverlay(visitor) {
  const overlay = $('#success-overlay');
  $('#success-name').textContent = `${visitor.prenom} ${visitor.nom}`;
  show(overlay);
  setTimeout(() => hide(overlay), 4000);
  $('#success-close').onclick = () => hide(overlay);
}

// ─── Admin Login ─────────────────────────────────────────────────────────────

async function handleAdminLogin(e) {
  e.preventDefault();
  const input = $('#admin-password').value;
  const stored = await DB.getSetting('adminPassword');

  if (input === stored) {
    $('#admin-password').value = '';
    $('#admin-login-error').classList.add('hidden');
    await enterAdmin();
  } else {
    $('#admin-login-error').classList.remove('hidden');
    $('#admin-password').classList.add('shake');
    setTimeout(() => $('#admin-password').classList.remove('shake'), 500);
  }
}

function togglePasswordVisibility() {
  const input = $('#admin-password');
  const btn = $('#toggle-password-visibility');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

async function enterAdmin() {
  showScreen('admin');
  await switchTab('team');
}

async function switchTab(tab) {
  currentTab = tab;
  $$('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.tab-content').forEach((c) => c.classList.toggle('hidden', c.dataset.tab !== tab));

  if (tab === 'team') await loadTeamPanel();
  if (tab === 'history') await loadHistoryPanel();
  if (tab === 'backup') await loadBackupPanel();
}

// ─── Team Management ─────────────────────────────────────────────────────────

async function loadTeamPanel() {
  allTeam = await DB.getAllTeamMembers();
  renderTeamList();
}

function renderTeamList() {
  const list = $('#team-list');
  if (allTeam.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun membre pour l\'instant. Ajoutez le premier membre ci-dessus.</p>';
    return;
  }

  list.innerHTML = allTeam.map((m) => `
    <div class="team-card" id="team-${m.id}">
      <div class="team-card-avatar">${getInitials(m.prenom, m.nom)}</div>
      <div class="team-card-info">
        <div class="team-card-name">${m.prenom} ${m.nom}</div>
        <div class="team-card-poste">${m.poste}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeTeamMember(${m.id})">
        <span>🗑</span> Supprimer
      </button>
    </div>
  `).join('');
}

function getInitials(prenom, nom) {
  return `${(prenom || '?')[0]}${(nom || '?')[0]}`.toUpperCase();
}

async function handleAddTeamMember(e) {
  e.preventDefault();
  const member = {
    prenom: $('#m-prenom').value.trim(),
    nom: $('#m-nom').value.trim(),
    poste: $('#m-poste').value.trim(),
  };
  if (!member.prenom || !member.nom || !member.poste) {
    showToast('Veuillez remplir tous les champs.', 'error');
    return;
  }
  await DB.addTeamMember(member);
  e.target.reset();
  showToast(`${member.prenom} ${member.nom} ajouté(e) !`, 'success');
  await loadTeamPanel();
  await loadTeamDropdown();
}

async function removeTeamMember(id) {
  if (!confirm('Supprimer ce membre de l\'équipe ?')) return;
  await DB.deleteTeamMember(id);
  showToast('Membre supprimé.', 'info');
  await loadTeamPanel();
  await loadTeamDropdown();
}

// ─── History Panel ───────────────────────────────────────────────────────────

async function loadHistoryPanel() {
  allVisitors = await DB.getAllVisitors();
  allVisitors.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderVisitorTable(allVisitors);
  updateHistoryStats(allVisitors);
}

function updateHistoryStats(visitors) {
  $('#stat-total').textContent = visitors.length;
  const today = new Date().toDateString();
  $('#stat-today').textContent = visitors.filter(
    (v) => new Date(v.date).toDateString() === today
  ).length;
}

function renderVisitorTable(visitors) {
  const tbody = $('#visitors-tbody');
  const emptyState = $('#history-empty');

  if (visitors.length === 0) {
    tbody.innerHTML = '';
    show(emptyState);
    hide($('#visitors-table-wrapper'));
    return;
  }

  hide(emptyState);
  show($('#visitors-table-wrapper'));

  tbody.innerHTML = visitors.map((v) => `
    <tr class="visitor-row" data-id="${v.id}">
      <td>
        <input type="checkbox" class="visitor-checkbox" data-id="${v.id}" aria-label="Sélectionner ${v.prenom} ${v.nom}">
      </td>
      <td><span class="badge-date">${formatDate(v.date)}</span></td>
      <td>
        <div class="visitor-name">${v.prenom} ${v.nom}</div>
      </td>
      <td>${v.entreprise || '<span class="text-muted">—</span>'}</td>
      <td><a href="mailto:${v.email}" class="link">${v.email || '—'}</a></td>
      <td>${v.telephone || '<span class="text-muted">—</span>'}</td>
      <td><span class="membre-badge">${v.membreNom ? truncate(v.membreNom, 25) : '—'}</span></td>
      <td>
        <div class="note-cell" title="${escapeHtml(v.note || '')}">${v.note ? truncate(v.note, 40) : '<span class="text-muted">—</span>'}</div>
      </td>
      <td>
        <button class="btn btn-danger btn-xs" onclick="deleteSingleVisitor(${v.id})">🗑</button>
      </td>
    </tr>
  `).join('');

  // Re-attach checkbox listeners
  $$('.visitor-checkbox').forEach((cb) => {
    cb.addEventListener('change', updateDeleteButtonState);
  });
}

function filterVisitors() {
  const query = $('#search-input').value.toLowerCase();
  const filtered = allVisitors.filter((v) =>
    `${v.prenom} ${v.nom} ${v.entreprise} ${v.email} ${v.telephone} ${v.note} ${v.membreNom}`
      .toLowerCase()
      .includes(query)
  );
  renderVisitorTable(filtered);
  updateHistoryStats(filtered);
}

function toggleSelectAll(e) {
  $$('.visitor-checkbox').forEach((cb) => (cb.checked = e.target.checked));
  updateDeleteButtonState();
}

function updateDeleteButtonState() {
  const anyChecked = $$('.visitor-checkbox:checked').length > 0;
  $('#btn-delete-selected').disabled = !anyChecked;
}

async function deleteSingleVisitor(id) {
  if (!confirm('Supprimer ce visiteur ?')) return;
  await DB.deleteVisitor(id);
  showToast('Visiteur supprimé.', 'info');
  await loadHistoryPanel();
}

async function deleteSelectedVisitors() {
  const checked = $$('.visitor-checkbox:checked');
  if (checked.length === 0) return;
  if (!confirm(`Supprimer les ${checked.length} visiteur(s) sélectionné(s) ?`)) return;
  const ids = Array.from(checked).map((cb) => Number(cb.dataset.id));
  for (const id of ids) await DB.deleteVisitor(id);
  showToast(`${ids.length} visiteur(s) supprimé(s).`, 'info');
  await loadHistoryPanel();
}

// ─── Backup Panel ─────────────────────────────────────────────────────────────

async function loadBackupPanel() {
  allVisitors = await DB.getAllVisitors();
  $('#backup-count').textContent = allVisitors.length;
}

function exportCSV() {
  if (allVisitors.length === 0) {
    showToast('Aucune donnée à exporter.', 'info');
    return;
  }
  const headers = ['ID', 'Date', 'Prénom', 'Nom', 'Entreprise', 'Email', 'Téléphone', 'Membre Équipe', 'Note'];
  const rows = allVisitors.map((v) => [
    v.id,
    formatDate(v.date),
    v.prenom,
    v.nom,
    v.entreprise,
    v.email,
    v.telephone,
    v.membreNom,
    v.note,
  ].map(csvEscape));

  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  downloadFile(bom + csv, `visiteurs_${dateFilename()}.csv`, 'text/csv;charset=utf-8;');
  showToast('Export CSV téléchargé !', 'success');
}

function exportJSON() {
  if (allVisitors.length === 0) {
    showToast('Aucune donnée à exporter.', 'info');
    return;
  }
  const json = JSON.stringify(allVisitors, null, 2);
  downloadFile(json, `visiteurs_${dateFilename()}.json`, 'application/json');
  showToast('Export JSON téléchargé !', 'success');
}

function confirmClearData() {
  const confirmed = confirm(
    '⚠️ ATTENTION : Cette action va supprimer TOUS les visiteurs de la base de données.\n\nCette action est irréversible. Voulez-vous continuer ?'
  );
  if (!confirmed) return;
  const confirmed2 = confirm('Dernière confirmation : supprimer toutes les données visiteurs ?');
  if (!confirmed2) return;
  clearAllVisitors();
}

async function clearAllVisitors() {
  for (const v of allVisitors) await DB.deleteVisitor(v.id);
  allVisitors = [];
  $('#backup-count').textContent = 0;
  showToast('Toutes les données ont été supprimées.', 'info');
}

// ─── Change Password ──────────────────────────────────────────────────────────

async function handleChangePassword(e) {
  e.preventDefault();
  const current = $('#pwd-current').value;
  const newPwd = $('#pwd-new').value;
  const confirm2 = $('#pwd-confirm').value;
  const stored = await DB.getSetting('adminPassword');

  if (current !== stored) {
    showToast('Mot de passe actuel incorrect.', 'error');
    return;
  }
  if (newPwd.length < 6) {
    showToast('Le nouveau mot de passe doit contenir au moins 6 caractères.', 'error');
    return;
  }
  if (newPwd !== confirm2) {
    showToast('Les mots de passe ne correspondent pas.', 'error');
    return;
  }
  await DB.setSetting('adminPassword', newPwd);
  e.target.reset();
  showToast('Mot de passe modifié avec succès !', 'success');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dateFilename() {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(val) {
  const str = String(val || '').replace(/"/g, '""');
  return `"${str}"`;
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Service Worker Registration ──────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('[SW] Registered:', reg.scope);
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
