/**
 * CampusSync - Calendario Comunitario de Estudio
 * Master JavaScript Controller
 */

// ==========================================
// CONSTANTS & SEED DATA
// ==========================================
const STORAGE_KEY_ROOMS = 'campussync_rooms_data';
const STORAGE_KEY_ACTIVE_ROOM = 'campussync_active_room_id';
const STORAGE_KEY_THEME = 'campussync_theme';

const CATEGORY_NAMES = {
  exam: 'Examen / Parcial',
  assignment: 'Entrega de TP',
  class: 'Clase Teórica / Práctica',
  study: 'Sesión de Estudio',
  other: 'Evento / Otro'
};

// Rooms are completely private by default - only accessible via invite code, direct link, or QR
const DEFAULT_INITIAL_ROOMS = [];

function getRelativeDateString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// APPLICATION STATE
// ==========================================
let rooms = [];
let activeRoomId = null;
let currentCalendarDate = new Date(); // Focus month/year
let activeFilter = 'all';
let currentView = 'month'; // 'month' or 'agenda'
let selectedDateForNewActivity = null;
let qrScannerInstance = null;

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================
const DOM = {
  // Theme
  themeToggle: document.getElementById('btnThemeToggle'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeIconMoon: document.getElementById('themeIconMoon'),

  // Header
  btnGoHome: document.getElementById('btnGoHome'),
  activeRoomBar: document.getElementById('activeRoomBar'),
  roomColorDot: document.getElementById('roomColorDot'),
  headerRoomName: document.getElementById('headerRoomName'),
  headerRoomCode: document.getElementById('headerRoomCode'),
  btnOpenInviteModal: document.getElementById('btnOpenInviteModal'),
  btnOpenNewActivityModal: document.getElementById('btnOpenNewActivityModal'),
  btnSwitchRoom: document.getElementById('btnSwitchRoom'),

  // Views
  landingSection: document.getElementById('landingSection'),
  calendarSection: document.getElementById('calendarSection'),
  calendarMonthView: document.getElementById('calendarMonthView'),
  calendarAgendaView: document.getElementById('calendarAgendaView'),

  // Landing
  btnShowCreateRoomForm: document.getElementById('btnShowCreateRoomForm'),
  joinCodeForm: document.getElementById('joinCodeForm'),
  inputJoinCode: document.getElementById('inputJoinCode'),
  btnSubmitJoinCode: document.getElementById('btnSubmitJoinCode'),
  joinErrorMsg: document.getElementById('joinErrorMsg'),
  btnOpenScannerModal: document.getElementById('btnOpenScannerModal'),
  roomsCountBadge: document.getElementById('roomsCountBadge'),
  roomsListGrid: document.getElementById('roomsListGrid'),

  // Calendar Toolbar
  btnPrevMonth: document.getElementById('btnPrevMonth'),
  btnNextMonth: document.getElementById('btnNextMonth'),
  btnToday: document.getElementById('btnToday'),
  currentPeriodLabel: document.getElementById('currentPeriodLabel'),
  categoryFilterContainer: document.getElementById('categoryFilterContainer'),
  btnViewMonth: document.getElementById('btnViewMonth'),
  btnViewAgenda: document.getElementById('btnViewAgenda'),
  daysGrid: document.getElementById('daysGrid'),
  agendaItemsList: document.getElementById('agendaItemsList'),

  // Calendar Sidebar
  sidebarRoomTitle: document.getElementById('sidebarRoomTitle'),
  sidebarRoomDesc: document.getElementById('sidebarRoomDesc'),
  sidebarRoomCodeDisplay: document.getElementById('sidebarRoomCodeDisplay'),
  btnCopyCodeSidebar: document.getElementById('btnCopyCodeSidebar'),
  btnOpenInviteModalSidebar: document.getElementById('btnOpenInviteModalSidebar'),
  upcomingCountBadge: document.getElementById('upcomingCountBadge'),
  upcomingList: document.getElementById('upcomingList'),

  // Modals
  modalCreateRoom: document.getElementById('modalCreateRoom'),
  formCreateRoom: document.getElementById('formCreateRoom'),
  btnCloseCreateRoom: document.getElementById('btnCloseCreateRoom'),
  btnCancelCreateRoom: document.getElementById('btnCancelCreateRoom'),
  colorPickerRow: document.getElementById('colorPickerRow'),
  selectedRoomColor: document.getElementById('selectedRoomColor'),

  modalInvite: document.getElementById('modalInvite'),
  btnCloseInvite: document.getElementById('btnCloseInvite'),
  modalInviteRoomSubtitle: document.getElementById('modalInviteRoomSubtitle'),
  qrCodeGraphic: document.getElementById('qrCodeGraphic'),
  modalDisplayCode: document.getElementById('modalDisplayCode'),
  btnCopyInviteCode: document.getElementById('btnCopyInviteCode'),
  shareDirectLink: document.getElementById('shareDirectLink'),
  btnCopyDirectLink: document.getElementById('btnCopyDirectLink'),
  btnShareWhatsApp: document.getElementById('btnShareWhatsApp'),
  btnDownloadQrImage: document.getElementById('btnDownloadQrImage'),

  modalActivity: document.getElementById('modalActivity'),
  formActivity: document.getElementById('formActivity'),
  modalActivityTitle: document.getElementById('modalActivityTitle'),
  btnCloseActivity: document.getElementById('btnCloseActivity'),
  btnCancelActivity: document.getElementById('btnCancelActivity'),
  activityEditId: document.getElementById('activityEditId'),
  activityTitle: document.getElementById('activityTitle'),
  activityCategory: document.getElementById('activityCategory'),
  activityDate: document.getElementById('activityDate'),
  activityStartTime: document.getElementById('activityStartTime'),
  activityEndTime: document.getElementById('activityEndTime'),
  activityAuthor: document.getElementById('activityAuthor'),
  activityDescription: document.getElementById('activityDescription'),

  modalDetailActivity: document.getElementById('modalDetailActivity'),
  btnCloseDetailActivity: document.getElementById('btnCloseDetailActivity'),
  detailCategoryBadge: document.getElementById('detailCategoryBadge'),
  detailTitle: document.getElementById('detailTitle'),
  detailDate: document.getElementById('detailDate'),
  detailTime: document.getElementById('detailTime'),
  detailDuration: document.getElementById('detailDuration'),
  detailAuthor: document.getElementById('detailAuthor'),
  detailDescription: document.getElementById('detailDescription'),
  btnDeleteActivity: document.getElementById('btnDeleteActivity'),
  btnEditActivity: document.getElementById('btnEditActivity'),

  modalScanner: document.getElementById('modalScanner'),
  btnCloseScanner: document.getElementById('btnCloseScanner'),
  qrReaderView: document.getElementById('qrReaderView'),
  scannerManualCode: document.getElementById('scannerManualCode'),
  btnApplyManualCode: document.getElementById('btnApplyManualCode'),

  toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupEventListeners();
  checkUrlParamsForRoom();
  renderApp();
});

// ==========================================
// DATA PERSISTENCE & HELPERS
// ==========================================
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ROOMS);
    if (stored) {
      rooms = JSON.parse(stored);
    } else {
      rooms = DEFAULT_INITIAL_ROOMS;
      saveData();
    }
  } catch (e) {
    console.error('Error loading stored rooms:', e);
    rooms = DEFAULT_INITIAL_ROOMS;
  }

  const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOM);
  if (savedActiveId && rooms.some(r => r.id === savedActiveId)) {
    activeRoomId = savedActiveId;
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
    if (activeRoomId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ROOM, activeRoomId);
    }
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

function generateRandomCode(prefix = 'EST') {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

function getActiveRoom() {
  return rooms.find(r => r.id === activeRoomId) || null;
}

// ==========================================
// URL PARAMETER ROUTING (?room=CODE)
// ==========================================
function checkUrlParamsForRoom() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCodeParam = urlParams.get('room');
  if (roomCodeParam) {
    const cleanCode = roomCodeParam.trim().toUpperCase();
    joinByCode(cleanCode);
  }
}

// ==========================================
// THEME MANAGEMENT
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
  if (theme === 'dark') {
    DOM.themeIconSun.classList.add('hidden');
    DOM.themeIconMoon.classList.remove('hidden');
  } else {
    DOM.themeIconSun.classList.remove('hidden');
    DOM.themeIconMoon.classList.add('hidden');
  }
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  // Theme
  DOM.themeToggle.addEventListener('click', toggleTheme);

  // Navigation
  DOM.btnGoHome.addEventListener('click', () => {
    activeRoomId = null;
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ROOM);
    renderApp();
  });

  DOM.btnSwitchRoom.addEventListener('click', () => {
    activeRoomId = null;
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ROOM);
    renderApp();
  });

  // Hub Buttons
  DOM.btnShowCreateRoomForm.addEventListener('click', () => openModal(DOM.modalCreateRoom));
  DOM.btnOpenScannerModal.addEventListener('click', openScannerModal);

  // Join Code Form
  DOM.joinCodeForm.addEventListener('submit', handleJoinByCodeSubmit);

  // Modals Close buttons
  DOM.btnCloseCreateRoom.addEventListener('click', () => closeModal(DOM.modalCreateRoom));
  DOM.btnCancelCreateRoom.addEventListener('click', () => closeModal(DOM.modalCreateRoom));

  DOM.btnCloseInvite.addEventListener('click', () => closeModal(DOM.modalInvite));
  DOM.btnCloseActivity.addEventListener('click', () => closeModal(DOM.modalActivity));
  DOM.btnCancelActivity.addEventListener('click', () => closeModal(DOM.modalActivity));
  DOM.btnCloseDetailActivity.addEventListener('click', () => closeModal(DOM.modalDetailActivity));
  DOM.btnCloseScanner.addEventListener('click', closeScannerModal);

  // Close modals on clicking backdrop
  [DOM.modalCreateRoom, DOM.modalInvite, DOM.modalActivity, DOM.modalDetailActivity, DOM.modalScanner].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === DOM.modalScanner) {
          closeScannerModal();
        } else {
          closeModal(modal);
        }
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(DOM.modalCreateRoom);
      closeModal(DOM.modalInvite);
      closeModal(DOM.modalActivity);
      closeModal(DOM.modalDetailActivity);
      closeScannerModal();
    }
  });

  // Create Room Form Submit
  DOM.formCreateRoom.addEventListener('submit', handleCreateRoom);

  // Color Swatches in Create Room
  DOM.colorPickerRow.addEventListener('click', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    DOM.selectedRoomColor.value = swatch.getAttribute('data-color');
  });

  // Header Actions
  DOM.btnOpenInviteModal.addEventListener('click', openInviteModal);
  DOM.btnOpenInviteModalSidebar.addEventListener('click', openInviteModal);
  DOM.btnOpenNewActivityModal.addEventListener('click', () => openNewActivityModal());

  // Copy Code in Sidebar
  DOM.btnCopyCodeSidebar.addEventListener('click', () => {
    const room = getActiveRoom();
    if (room) copyToClipboard(room.code, '¡Código de sala copiado!');
  });

  // Invite Modal Actions
  DOM.btnCopyInviteCode.addEventListener('click', () => {
    const room = getActiveRoom();
    if (room) copyToClipboard(room.code, '¡Código copiado al portapapeles!');
  });

  DOM.btnCopyDirectLink.addEventListener('click', () => {
    const link = DOM.shareDirectLink.value;
    copyToClipboard(link, '¡Enlace de invitación copiado!');
  });

  DOM.btnShareWhatsApp.addEventListener('click', shareOnWhatsApp);
  DOM.btnDownloadQrImage.addEventListener('click', downloadQrImage);

  // Activity Form Submit
  DOM.formActivity.addEventListener('submit', handleSaveActivity);

  // Detail Modal Actions
  DOM.btnDeleteActivity.addEventListener('click', handleDeleteCurrentDetailActivity);
  DOM.btnEditActivity.addEventListener('click', handleEditCurrentDetailActivity);

  // Calendar Navigation
  DOM.btnPrevMonth.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  DOM.btnNextMonth.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  DOM.btnToday.addEventListener('click', () => {
    currentCalendarDate = new Date();
    renderCalendar();
  });

  // View Switcher (Month / Agenda)
  DOM.btnViewMonth.addEventListener('click', () => {
    currentView = 'month';
    DOM.btnViewMonth.classList.add('active');
    DOM.btnViewAgenda.classList.remove('active');
    DOM.calendarMonthView.classList.remove('hidden');
    DOM.calendarAgendaView.classList.add('hidden');
  });

  DOM.btnViewAgenda.addEventListener('click', () => {
    currentView = 'agenda';
    DOM.btnViewAgenda.classList.add('active');
    DOM.btnViewMonth.classList.remove('active');
    DOM.calendarMonthView.classList.add('hidden');
    DOM.calendarAgendaView.classList.remove('hidden');
    renderAgenda();
  });

  // Category Filters
  DOM.categoryFilterContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.getAttribute('data-filter');
    renderCalendar();
    if (currentView === 'agenda') renderAgenda();
  });

  // Scanner Fallback input
  DOM.btnApplyManualCode.addEventListener('click', () => {
    const val = DOM.scannerManualCode.value.trim();
    if (val) {
      closeScannerModal();
      joinByCode(val);
    }
  });
}

// ==========================================
// RENDER APP (ORCHESTRATOR)
// ==========================================
function renderApp() {
  const currentRoom = getActiveRoom();

  if (currentRoom) {
    // Show Calendar Room View
    DOM.landingSection.classList.add('hidden');
    DOM.calendarSection.classList.remove('hidden');
    DOM.activeRoomBar.classList.remove('hidden');

    // Header info
    DOM.headerRoomName.textContent = currentRoom.name;
    DOM.headerRoomCode.textContent = `#${currentRoom.code}`;
    DOM.roomColorDot.style.backgroundColor = currentRoom.color || '#6366f1';
    DOM.roomColorDot.style.boxShadow = `0 0 10px ${currentRoom.color || '#6366f1'}`;

    // Sidebar Info
    DOM.sidebarRoomTitle.textContent = currentRoom.name;
    DOM.sidebarRoomDesc.textContent = currentRoom.description || 'Sin notas adicionales.';
    DOM.sidebarRoomCodeDisplay.textContent = currentRoom.code;

    renderCalendar();
    renderUpcomingActivities();
    if (currentView === 'agenda') {
      renderAgenda();
    }
  } else {
    // Show Landing & Room Selection View
    DOM.calendarSection.classList.add('hidden');
    DOM.activeRoomBar.classList.add('hidden');
    DOM.landingSection.classList.remove('hidden');

    renderSavedRoomsGrid();
  }
}

// ==========================================
// LANDING: SAVED ROOMS LIST
// ==========================================
function renderSavedRoomsGrid() {
  DOM.roomsCountBadge.textContent = rooms.length;
  DOM.roomsListGrid.innerHTML = '';

  if (rooms.length === 0) {
    DOM.roomsListGrid.innerHTML = `
      <div class="empty-rooms-banner">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
        </svg>
        <p>No tienes salas guardadas todavía. ¡Crea una nueva o únete con un código!</p>
      </div>
    `;
    return;
  }

  rooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'saved-room-card';
    card.style.borderLeft = `4px solid ${room.color || '#6366f1'}`;

    const totalActivities = (room.activities || []).length;
    const examsCount = (room.activities || []).filter(a => a.category === 'exam').length;

    card.innerHTML = `
      <div class="saved-room-top">
        <div class="saved-room-info">
          <span class="saved-room-name">${escapeHtml(room.name)}</span>
          <span class="saved-room-career">${escapeHtml(room.career || 'Comunidad Estudiantil')}</span>
        </div>
        <span class="saved-room-code">${room.code}</span>
      </div>
      <div class="saved-room-bottom">
        <span>📅 ${totalActivities} actividades (${examsCount} exámenes)</span>
        <span style="font-weight:700; color:var(--brand-primary)">Entrar &rarr;</span>
      </div>
    `;

    card.addEventListener('click', () => {
      activeRoomId = room.id;
      saveData();
      renderApp();
    });

    DOM.roomsListGrid.appendChild(card);
  });
}

// ==========================================
// ROOM ACTIONS: CREATE & JOIN (100% PRIVATE)
// ==========================================
async function handleCreateRoom(e) {
  e.preventDefault();
  const name = document.getElementById('roomName').value.trim();
  const career = document.getElementById('roomCareer').value.trim();
  const color = DOM.selectedRoomColor.value || '#6366f1';
  const description = document.getElementById('roomDescription').value.trim();
  const creator = document.getElementById('roomCreatorName').value.trim() || 'Estudiante';

  if (!name) return;

  const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'EST';
  const code = generateRandomCode(prefix.length >= 2 ? prefix : 'EST');

  const newRoom = {
    id: 'room_' + Date.now(),
    code,
    name,
    career,
    color,
    description,
    creator,
    createdAt: new Date().toISOString(),
    activities: []
  };

  // Add to local list of joined rooms
  rooms.unshift(newRoom);
  activeRoomId = newRoom.id;
  saveData();

  // Save to private server storage so only invitees with the code/QR can enter
  try {
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoom)
    });
  } catch (err) {
    console.warn('Servidor offline o modo local:', err);
  }

  closeModal(DOM.modalCreateRoom);
  DOM.formCreateRoom.reset();
  renderApp();

  showToast('¡Sala privada creada! Comparte el código o QR con tus invitados.', 'success');

  // Open invite modal right away so creator sees QR code immediately!
  setTimeout(() => {
    openInviteModal();
  }, 400);
}

function handleJoinByCodeSubmit() {
  const code = DOM.inputJoinCode.value.trim();
  if (!code) return;
  joinByCode(code);
}

async function joinByCode(codeToFind) {
  const clean = codeToFind.trim().toUpperCase();
  if (!clean) return;

  // 1. Si el usuario ya la tiene guardada en su lista local de salas:
  const localFound = rooms.find(r => r.code.toUpperCase() === clean);
  if (localFound) {
    activeRoomId = localFound.id;
    saveData();
    DOM.joinErrorMsg.textContent = '';
    DOM.inputJoinCode.value = '';
    renderApp();
    showToast(`¡Entraste a la sala ${localFound.name}!`, 'success');
    syncActiveRoomWithServer();
    return;
  }

  // 2. Si no la tiene guardada, consultar al servidor si la sala privada existe:
  DOM.btnSubmitJoinCode.disabled = true;
  const originalBtnText = DOM.btnSubmitJoinCode.innerHTML;
  DOM.btnSubmitJoinCode.innerHTML = '<span>Buscando...</span>';

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const serverRoom = await res.json();
      rooms.unshift(serverRoom);
      activeRoomId = serverRoom.id;
      saveData();
      DOM.joinErrorMsg.textContent = '';
      DOM.inputJoinCode.value = '';
      renderApp();
      showToast(`¡Te has unido con éxito a la sala ${serverRoom.name}!`, 'success');
    } else {
      DOM.joinErrorMsg.textContent = '🔒 Esta sala es privada o el código no existe. Verifica con quien te invitó.';
      showToast('Sala privada no encontrada. Código o QR incorrecto.', 'error');
    }
  } catch (err) {
    DOM.joinErrorMsg.textContent = 'No se pudo conectar al servidor para verificar la sala.';
    showToast('Error de conexión al verificar el código.', 'error');
  } finally {
    DOM.btnSubmitJoinCode.disabled = false;
    DOM.btnSubmitJoinCode.innerHTML = originalBtnText;
  }
}

async function syncActiveRoomWithServer() {
  const room = getActiveRoom();
  if (!room || !room.code) return;
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(room.code)}`);
    if (res.ok) {
      const serverRoom = await res.json();
      if (serverRoom && serverRoom.activities) {
        room.activities = serverRoom.activities;
        room.name = serverRoom.name || room.name;
        room.description = serverRoom.description || room.description;
        saveData();
        renderCalendar();
        renderUpcomingActivities();
        if (currentView === 'agenda') renderAgenda();
      }
    }
  } catch (e) {
    // silent
  }
}

// Sincronización periódica en segundo plano cada 12 segundos si hay sala activa
setInterval(() => {
  if (activeRoomId) {
    syncActiveRoomWithServer();
  }
}, 12000);

// ==========================================
// CALENDAR ENGINE: MONTH VIEW
// ==========================================
function renderCalendar() {
  const room = getActiveRoom();
  if (!room) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // Header month label
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  DOM.currentPeriodLabel.textContent = `${monthNames[month]} ${year}`;

  DOM.daysGrid.innerHTML = '';

  // Calculate day offsets (Monday as first day of week: 0=Lun, 6=Dom)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDayOfWeek = firstDayOfMonth.getDay() - 1; // 0=Lun, 6=Dom
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday fix

  const totalDaysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonthReal = today.getFullYear() === year && today.getMonth() === month;
  const todayDateNum = today.getDate();

  // Filter activities
  const allActivities = room.activities || [];
  const filteredActivities = activeFilter === 'all' 
    ? allActivities 
    : allActivities.filter(a => a.category === activeFilter);

  // 1. Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDateObj = new Date(year, month - 1, dayNum);
    const dateStr = formatDateString(prevDateObj);
    const cell = createDayCell(dayNum, dateStr, true, false, []);
    DOM.daysGrid.appendChild(cell);
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const dateObj = new Date(year, month, dayNum);
    const dateStr = formatDateString(dateObj);
    const isToday = isCurrentMonthReal && dayNum === todayDateNum;

    const dayActivities = filteredActivities.filter(a => a.date === dateStr);
    dayActivities.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const cell = createDayCell(dayNum, dateStr, false, isToday, dayActivities);
    DOM.daysGrid.appendChild(cell);
  }

  // 3. Next month leading days to complete full grid (rows of 7)
  const totalRendered = startDayOfWeek + totalDaysInMonth;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextDateObj = new Date(year, month + 1, dayNum);
    const dateStr = formatDateString(nextDateObj);
    const cell = createDayCell(dayNum, dateStr, true, false, []);
    DOM.daysGrid.appendChild(cell);
  }
}

function createDayCell(dayNumber, dateString, isOtherMonth, isToday, activities) {
  const cell = document.createElement('div');
  cell.className = 'day-cell';
  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('is-today');

  // Day header with number and "+" quick button
  const header = document.createElement('div');
  header.className = 'day-header';

  const numberSpan = document.createElement('span');
  numberSpan.className = 'day-number';
  numberSpan.textContent = dayNumber;

  const quickAddBtn = document.createElement('button');
  quickAddBtn.className = 'btn-add-activity-quick';
  quickAddBtn.title = 'Añadir actividad este día';
  quickAddBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  quickAddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openNewActivityModal(dateString);
  });

  header.appendChild(numberSpan);
  header.appendChild(quickAddBtn);
  cell.appendChild(header);

  // Day activities dots container (clean category color dots)
  const activitiesList = document.createElement('div');
  activitiesList.className = 'day-activities-dots';

  const MAX_VISIBLE_DOTS = 6;
  const visibleActs = activities.slice(0, MAX_VISIBLE_DOTS);

  visibleActs.forEach(act => {
    const dot = document.createElement('span');
    dot.className = `activity-dot dot-${act.category || 'other'}`;
    dot.setAttribute('title', `${act.startTime || ''} - ${act.title} (${CATEGORY_NAMES[act.category] || act.category})`);

    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(act);
    });

    activitiesList.appendChild(dot);
  });

  if (activities.length > MAX_VISIBLE_DOTS) {
    const moreTag = document.createElement('span');
    moreTag.className = 'more-dots-count';
    moreTag.textContent = `+${activities.length - MAX_VISIBLE_DOTS}`;
    activitiesList.appendChild(moreTag);
  }

  cell.appendChild(activitiesList);

  // Click on cell opens new activity dialog with this date
  cell.addEventListener('click', () => {
    openNewActivityModal(dateString);
  });

  return cell;
}

// ==========================================
// AGENDA VIEW RENDERING
// ==========================================
function renderAgenda() {
  const room = getActiveRoom();
  if (!room) return;

  DOM.agendaItemsList.innerHTML = '';

  const allActivities = room.activities || [];
  const filtered = activeFilter === 'all'
    ? [...allActivities]
    : allActivities.filter(a => a.category === activeFilter);

  if (filtered.length === 0) {
    DOM.agendaItemsList.innerHTML = `
      <div class="empty-rooms-banner">
        <p>No hay actividades programadas con el filtro actual.</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="document.getElementById('btnOpenNewActivityModal').click()">
          + Añadir Primera Actividad
        </button>
      </div>
    `;
    return;
  }

  // Sort chronologically by date and start time
  filtered.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  // Group by date
  const groups = {};
  filtered.forEach(act => {
    if (!groups[act.date]) groups[act.date] = [];
    groups[act.date].push(act);
  });

  Object.keys(groups).forEach(dateStr => {
    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'agenda-day-group';

    const groupLabel = document.createElement('div');
    groupLabel.className = 'agenda-group-date-label';
    groupLabel.textContent = formatHumanFriendlyDate(dateStr);
    groupWrapper.appendChild(groupLabel);

    groups[dateStr].forEach(act => {
      const card = document.createElement('div');
      card.className = `agenda-item-card`;
      card.style.borderLeft = `4px solid var(--cat-${act.category || 'other'})`;

      card.innerHTML = `
        <div class="agenda-item-left">
          <div class="agenda-time-badge">
            ${act.startTime} - ${act.endTime}
          </div>
          <div class="agenda-item-info">
            <h4>${escapeHtml(act.title)}</h4>
            <p>${escapeHtml(act.description || 'Sin notas adicionales')}</p>
          </div>
        </div>
        <div>
          <span class="detail-category-badge cat-${act.category}">
            ${CATEGORY_NAMES[act.category] || act.category}
          </span>
        </div>
      `;

      card.addEventListener('click', () => openDetailModal(act));
      groupWrapper.appendChild(card);
    });

    DOM.agendaItemsList.appendChild(groupWrapper);
  });
}

// ==========================================
// SIDEBAR: UPCOMING ACTIVITIES
// ==========================================
function renderUpcomingActivities() {
  const room = getActiveRoom();
  if (!room) return;

  const activities = room.activities || [];
  const todayStr = formatDateString(new Date());

  // Filter only future or today's activities
  const upcoming = activities.filter(a => a.date >= todayStr);
  upcoming.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  DOM.upcomingCountBadge.textContent = upcoming.length;
  DOM.upcomingList.innerHTML = '';

  if (upcoming.length === 0) {
    DOM.upcomingList.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">
        No hay actividades próximas agendadas.
      </div>
    `;
    return;
  }

  // Show up to 5 upcoming
  upcoming.slice(0, 5).forEach(act => {
    const card = document.createElement('div');
    card.className = 'upcoming-card';
    card.style.borderLeftColor = `var(--cat-${act.category || 'other'})`;

    const countdownText = calculateCountdown(act.date);

    card.innerHTML = `
      <div class="upcoming-card-top">
        <span class="upcoming-countdown">${countdownText}</span>
        <span class="detail-category-badge cat-${act.category}" style="font-size:0.65rem; padding: 0.15rem 0.45rem;">
          ${CATEGORY_NAMES[act.category] || act.category}
        </span>
      </div>
      <div class="upcoming-title">${escapeHtml(act.title)}</div>
      <div class="upcoming-time">🕒 ${act.date} &bull; ${act.startTime} hs</div>
    `;

    card.addEventListener('click', () => openDetailModal(act));
    DOM.upcomingList.appendChild(card);
  });
}

function calculateCountdown(targetDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = targetDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '🔥 ¡Hoy!';
  if (diffDays === 1) return '⚡ Mañana';
  if (diffDays < 7) return `En ${diffDays} días`;
  return `En ${Math.ceil(diffDays / 7)} semanas`;
}

// ==========================================
// ACTIVITY CRUD
// ==========================================
function openNewActivityModal(prefillDate = null) {
  DOM.modalActivityTitle.textContent = 'Añadir Nueva Actividad';
  DOM.formActivity.reset();
  DOM.activityEditId.value = '';

  const defaultDate = prefillDate || formatDateString(new Date());
  DOM.activityDate.value = defaultDate;
  DOM.activityStartTime.value = '14:00';
  DOM.activityEndTime.value = '16:00';

  const room = getActiveRoom();
  if (room && room.creator) {
    DOM.activityAuthor.value = room.creator;
  }

  openModal(DOM.modalActivity);
}

function handleSaveActivity(e) {
  e.preventDefault();
  const room = getActiveRoom();
  if (!room) return;

  const editId = DOM.activityEditId.value;
  const title = DOM.activityTitle.value.trim();
  const category = DOM.activityCategory.value;
  const date = DOM.activityDate.value;
  const startTime = DOM.activityStartTime.value;
  const endTime = DOM.activityEndTime.value;
  const author = DOM.activityAuthor.value.trim() || 'Compañero';
  const description = DOM.activityDescription.value.trim();

  if (!title || !date || !startTime || !endTime) {
    showToast('Por favor completa los campos obligatorios', 'error');
    return;
  }

  if (editId) {
    // Edit existing activity
    const existingIndex = (room.activities || []).findIndex(a => a.id === editId);
    if (existingIndex !== -1) {
      const updatedAct = {
        ...room.activities[existingIndex],
        title,
        category,
        date,
        startTime,
        endTime,
        author,
        description
      };
      room.activities[existingIndex] = updatedAct;
      showToast('Actividad actualizada', 'success');

      fetch(`/api/rooms/${encodeURIComponent(room.code)}/activities/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAct)
      }).catch(err => console.warn('Sync PUT error:', err));
    }
  } else {
    // Add new activity
    const newActivity = {
      id: 'act_' + Date.now(),
      title,
      category,
      date,
      startTime,
      endTime,
      author,
      description,
      createdAt: new Date().toISOString()
    };
    if (!room.activities) room.activities = [];
    room.activities.push(newActivity);
    showToast('¡Actividad agregada al calendario!', 'success');

    fetch(`/api/rooms/${encodeURIComponent(room.code)}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActivity)
    }).catch(err => console.warn('Sync POST error:', err));
  }

  saveData();
  closeModal(DOM.modalActivity);
  renderApp();
}

let currentDetailActivity = null;

function openDetailModal(activity) {
  currentDetailActivity = activity;
  const room = getActiveRoom();

  DOM.detailTitle.textContent = activity.title;
  DOM.detailCategoryBadge.textContent = CATEGORY_NAMES[activity.category] || activity.category;
  DOM.detailCategoryBadge.className = `detail-category-badge cat-${activity.category}`;

  DOM.detailDate.textContent = formatHumanFriendlyDate(activity.date);
  DOM.detailTime.textContent = `${activity.startTime} a ${activity.endTime} hs`;
  DOM.detailDuration.textContent = calculateDurationHours(activity.startTime, activity.endTime);
  DOM.detailAuthor.textContent = activity.author || (room ? room.creator : 'Compañero');
  DOM.detailDescription.textContent = activity.description || 'Sin notas adicionales para esta actividad.';

  openModal(DOM.modalDetailActivity);
}

function handleEditCurrentDetailActivity() {
  if (!currentDetailActivity) return;
  closeModal(DOM.modalDetailActivity);

  DOM.modalActivityTitle.textContent = 'Editar Actividad';
  DOM.activityEditId.value = currentDetailActivity.id;
  DOM.activityTitle.value = currentDetailActivity.title;
  DOM.activityCategory.value = currentDetailActivity.category;
  DOM.activityDate.value = currentDetailActivity.date;
  DOM.activityStartTime.value = currentDetailActivity.startTime;
  DOM.activityEndTime.value = currentDetailActivity.endTime;
  DOM.activityAuthor.value = currentDetailActivity.author || '';
  DOM.activityDescription.value = currentDetailActivity.description || '';

  openModal(DOM.modalActivity);
}

function handleDeleteCurrentDetailActivity() {
  if (!currentDetailActivity) return;
  const room = getActiveRoom();
  if (!room) return;

  if (confirm(`¿Seguro que deseas eliminar la actividad "${currentDetailActivity.title}"?`)) {
    const actId = currentDetailActivity.id;
    room.activities = (room.activities || []).filter(a => a.id !== actId);
    saveData();
    closeModal(DOM.modalDetailActivity);
    renderApp();
    showToast('Actividad eliminada', 'info');

    fetch(`/api/rooms/${encodeURIComponent(room.code)}/activities/${encodeURIComponent(actId)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Sync DELETE error:', err));
  }
}

// ==========================================
// QR CODE GENERATOR & INVITE MODAL
// ==========================================
function openInviteModal() {
  const room = getActiveRoom();
  if (!room) return;

  DOM.modalInviteRoomSubtitle.textContent = `Sala: ${room.name} (${room.career || 'Estudio Grupal'})`;
  DOM.modalDisplayCode.textContent = room.code;

  // Build direct URL with parameter ?room=CODE
  const origin = window.location.origin === 'null' || !window.location.origin 
    ? window.location.href.split('?')[0]
    : window.location.origin + window.location.pathname;

  const directUrl = `${origin}?room=${encodeURIComponent(room.code)}`;
  DOM.shareDirectLink.value = directUrl;

  // Render QR Code using QRCode.js
  DOM.qrCodeGraphic.innerHTML = '';
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(DOM.qrCodeGraphic, {
        text: directUrl,
        width: 190,
        height: 190,
        colorDark: '#0b0f17',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      // Offline fallback canvas generator
      renderFallbackQr(DOM.qrCodeGraphic, directUrl);
    }
  } catch (err) {
    console.warn('QR library error, using fallback:', err);
    renderFallbackQr(DOM.qrCodeGraphic, directUrl);
  }

  openModal(DOM.modalInvite);
}

function renderFallbackQr(container, text) {
  container.innerHTML = `
    <div style="width:190px; height:190px; background:#fff; color:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; border-radius:8px; text-align:center;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
      <span style="font-size:0.75rem; font-family:monospace; margin-top:8px; word-break:break-all;">Código: ${escapeHtml(text)}</span>
    </div>
  `;
}

function shareOnWhatsApp() {
  const room = getActiveRoom();
  if (!room) return;

  const url = DOM.shareDirectLink.value;
  const message = `👋 ¡Hola! Te invito a nuestro calendario comunitario de estudio en CampusSync para *${room.name}*.\n\nCódigo de sala: *${room.code}*\nÚnete directamente haciendo clic aquí: ${url}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

function downloadQrImage() {
  const room = getActiveRoom();
  if (!room) return;

  const qrCanvas = DOM.qrCodeGraphic.querySelector('canvas');
  const qrImg = DOM.qrCodeGraphic.querySelector('img');

  let dataUrl = null;
  if (qrCanvas) {
    dataUrl = qrCanvas.toDataURL('image/png');
  } else if (qrImg && qrImg.src) {
    dataUrl = qrImg.src;
  }

  if (dataUrl) {
    const link = document.createElement('a');
    link.download = `QR-Sala-${room.code}.png`;
    link.href = dataUrl;
    link.click();
    showToast('¡Imagen del código QR descargada!', 'success');
  } else {
    showToast('No se pudo generar la imagen del QR', 'error');
  }
}

// ==========================================
// QR CAMERA SCANNER
// ==========================================
function openScannerModal() {
  openModal(DOM.modalScanner);
  DOM.scannerManualCode.value = '';

  // Try Html5QrcodeScanner if available
  if (typeof Html5Qrcode !== 'undefined') {
    try {
      if (qrScannerInstance) {
        qrScannerInstance.stop().catch(() => {});
      }
      qrScannerInstance = new Html5Qrcode('qrReaderView');
      qrScannerInstance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Success callback
          closeScannerModal();
          handleScannedQrResult(decodedText);
        },
        () => {
          // Frame error (ignore normal frames)
        }
      ).catch(err => {
        console.warn('Camera start error:', err);
        DOM.qrReaderView.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            <p>📷 Cámara no accesible o permiso denegado.</p>
            <p style="font-size:0.8rem; margin-top:0.5rem;">Introduce el código manualmente abajo.</p>
          </div>
        `;
      });
    } catch (e) {
      console.warn('Scanner init error:', e);
    }
  } else {
    DOM.qrReaderView.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <p>Introduce el código de la sala manualmente en la casilla inferior.</p>
      </div>
    `;
  }
}

function closeScannerModal() {
  if (qrScannerInstance) {
    qrScannerInstance.stop().then(() => {
      qrScannerInstance.clear();
      qrScannerInstance = null;
    }).catch(() => {
      qrScannerInstance = null;
    });
  }
  closeModal(DOM.modalScanner);
}

function handleScannedQrResult(text) {
  // Check if text contains ?room=CODE
  try {
    const url = new URL(text);
    const roomParam = url.searchParams.get('room');
    if (roomParam) {
      joinByCode(roomParam);
      return;
    }
  } catch (e) {
    // Not a full URL, maybe bare code
  }
  joinByCode(text.trim());
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');
  document.body.style.overflow = '';
}

function formatDateString(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHumanFriendlyDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[date.getDay()]}, ${d} de ${months[m - 1]} de ${y}`;
}

function calculateDurationHours(start, end) {
  if (!start || !end) return '';
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;
  let diff = endMins - startMins;
  if (diff < 0) diff += 24 * 60;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hs`;
  return `${hours} hs ${minutes} min`;
}

function copyToClipboard(text, successMsg = 'Copiado al portapapeles') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  showToast(successMsg, 'success');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
