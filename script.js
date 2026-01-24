// script.js - COMPLETE VERSION with Forgot Password Feature
const API_URL = 'https://note-app-backend-pearl.vercel.app';

// ========== STATE MANAGEMENT ==========
const AppState = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  notes: [],
  editingNoteId: null,
  isLoading: false,
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },
  
  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },
  
  clearAuth() {
    this.token = '';
    this.user = null;
    localStorage.clear();
  }
};

// ========== DOM ELEMENTS ==========
const DOM = {
  authSection: document.getElementById('auth-section'),
  notesSection: document.getElementById('notes-section'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  loginTab: document.getElementById('tab-login'),
  registerTab: document.getElementById('tab-register'),
  authMessage: document.getElementById('auth-message'),
  logoutBtn: document.getElementById('logout-btn'),
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),
  noteForm: document.getElementById('note-form'),
  notesList: document.getElementById('notes-list'),
  emptyState: document.getElementById('empty-state'),
  notesCount: document.getElementById('notes-count'),
  charCount: document.getElementById('char-count'),
  noteTitleInput: document.getElementById('note-title'),
  noteContentInput: document.getElementById('note-content'),
  saveNoteBtn: document.getElementById('save-note-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  sortSelect: document.getElementById('sort-select'),
  loginSubmitBtn: document.getElementById('login-submit'),
  registerSubmitBtn: document.getElementById('register-submit'),
  // Forgot Password Elements
  forgotPasswordLink: document.getElementById('forgot-password-link'),
  forgotPasswordSection: document.getElementById('forgot-password-section'),
  backToLoginBtn: document.getElementById('back-to-login'),
  requestCodeBtn: document.getElementById('request-code-btn'),
  verifyCodeBtn: document.getElementById('verify-code-btn'),
  resetPasswordBtn: document.getElementById('reset-password-btn'),
  resendCodeBtn: document.getElementById('resend-code-btn'),
  resetEmail: document.getElementById('reset-email'),
  resetCode: document.getElementById('reset-code'),
  newPassword: document.getElementById('new-password'),
  confirmNewPassword: document.getElementById('confirm-new-password'),
  resetMessage: document.getElementById('reset-message'),
  requestCodeStep: document.getElementById('request-code-step'),
  enterCodeStep: document.getElementById('enter-code-step'),
  newPasswordStep: document.getElementById('new-password-step')
};

// ========== UTILITY FUNCTIONS ==========

function isValidEmail(email) {
  // 1. Basic format check (allows any domain)
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;

  const domain = email.split('@')[1]?.toLowerCase();

  // 2. Block disposable/fake emails (Keep this if you want)
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'getairmail.com',
    'temp-mail.org', 'sharklasers.com', 'trashmail.com',
    'fakeinbox.com', 'dispostable.com', 'mailnesia.com'
  ];

  if (disposableDomains.includes(domain)) return false;

  // 3. REMOVED THE ALLOWED DOMAINS LIST
  // This allows custom domains like @rozanshah.com.np to register
  return true;
}

function showNotification(text, type = 'success', duration = 3000) {
  const existing = document.querySelector('.alert-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `alert-toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${text}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

function showAuthMessage(text, type) {
  DOM.authMessage.textContent = text;
  DOM.authMessage.className = `message ${type}`;
  DOM.authMessage.classList.remove('hidden');
  setTimeout(() => DOM.authMessage.classList.add('hidden'), 4000);
}

function setupPasswordToggle() {
  const toggleLogin = document.getElementById('toggle-login-password');
  const toggleRegister = document.getElementById('toggle-register-password');
  const loginPassword = document.getElementById('login-password');
  const registerPassword = document.getElementById('register-password');
  
  if (toggleLogin && loginPassword) {
    toggleLogin.addEventListener('click', () => {
      const type = loginPassword.type === 'password' ? 'text' : 'password';
      loginPassword.type = type;
      toggleLogin.innerHTML = `<i class="fas fa-eye${type === 'text' ? '-slash' : ''}"></i>`;
    });
  }
  
  if (toggleRegister && registerPassword) {
    toggleRegister.addEventListener('click', () => {
      const type = registerPassword.type === 'password' ? 'text' : 'password';
      registerPassword.type = type;
      toggleRegister.innerHTML = `<i class="fas fa-eye${type === 'text' ? '-slash' : ''}"></i>`;
    });
  }
}

function setLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalHTML = button.innerHTML;
    const text = button.textContent.trim();
    button.innerHTML = `<div class="loading-spinner"></div> ${text}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHTML) {
      button.innerHTML = button.dataset.originalHTML;
      delete button.dataset.originalHTML;
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== API FUNCTIONS ==========

async function apiCall(endpoint, options = {}) {
  const baseConfig = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (AppState.token) {
    baseConfig.headers['Authorization'] = `Bearer ${AppState.token}`;
  }
  
  const finalHeaders = {
    ...baseConfig.headers,
    ...(options.headers || {})
  };
  
  const config = {
    ...baseConfig,
    ...options,
    headers: finalHeaders
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: false, error: 'Invalid response format' };
    }
    
    if (response.status === 401 || response.status === 403) {
      AppState.clearAuth();
      showAuthSection();
      showNotification('Session expired. Please login again.', 'error');
      throw new Error('Unauthorized');
    }
    
    return { response, data };
  } catch (error) {
    if (error.message !== 'Unauthorized') {
      console.error('API call error:', error);
      showNotification('Network error. Please try again.', 'error');
      throw error;
    }
  }
}

// ========== FORGOT PASSWORD FUNCTIONS ==========

function initForgotPassword() {
  if (DOM.forgotPasswordLink) {
    DOM.forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      DOM.loginForm.classList.add('hidden');
      DOM.forgotPasswordSection.classList.remove('hidden');
      resetResetForm();
    });
  }
  
  if (DOM.backToLoginBtn) {
    DOM.backToLoginBtn.addEventListener('click', () => {
      DOM.forgotPasswordSection.classList.add('hidden');
      DOM.loginForm.classList.remove('hidden');
      resetResetForm();
    });
  }
  
  if (DOM.requestCodeBtn) {
    DOM.requestCodeBtn.addEventListener('click', requestResetCode);
  }
  
  if (DOM.verifyCodeBtn) {
    DOM.verifyCodeBtn.addEventListener('click', verifyResetCode);
  }
  
  if (DOM.resetPasswordBtn) {
    DOM.resetPasswordBtn.addEventListener('click', resetPassword);
  }
  
  if (DOM.resendCodeBtn) {
    DOM.resendCodeBtn.addEventListener('click', requestResetCode);
  }
}

function resetResetForm() {
  DOM.requestCodeStep.classList.remove('hidden');
  DOM.enterCodeStep.classList.add('hidden');
  DOM.newPasswordStep.classList.add('hidden');
  DOM.resetEmail.value = '';
  DOM.resetCode.value = '';
  DOM.newPassword.value = '';
  DOM.confirmNewPassword.value = '';
  DOM.resetMessage.classList.add('hidden');
}

async function requestResetCode() {
  const email = DOM.resetEmail.value.trim();
  
  if (!email || !isValidEmail(email)) {
    showResetMessage('Please enter a valid email', 'error');
    return;
  }
  
  try {
    setLoading(DOM.requestCodeBtn, true);
    
    const { data } = await apiCall('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    if (data.success) {
      showResetMessage('Reset code sent to your email', 'success');
      DOM.requestCodeStep.classList.add('hidden');
      DOM.enterCodeStep.classList.remove('hidden');
      
      if (data.debugCode) {
        console.log(`Test reset code: ${data.debugCode}`);
        showNotification(`Test code: ${data.debugCode}`, 'info');
      }
    } else {
      showResetMessage(data.error || 'Failed to send code', 'error');
    }
  } catch (error) {
    showResetMessage('Network error. Please try again.', 'error');
  } finally {
    setLoading(DOM.requestCodeBtn, false);
  }
}

async function verifyResetCode() {
  const email = DOM.resetEmail.value.trim();
  const code = DOM.resetCode.value.trim();
  
  if (!code || code.length !== 6) {
    showResetMessage('Please enter a valid 6-digit code', 'error');
    return;
  }
  
  try {
    setLoading(DOM.verifyCodeBtn, true);
    
    const { data } = await apiCall('/api/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    
    if (data.success) {
      showResetMessage('Code verified successfully', 'success');
      DOM.enterCodeStep.classList.add('hidden');
      DOM.newPasswordStep.classList.remove('hidden');
    } else {
      showResetMessage(data.error || 'Invalid or expired code', 'error');
    }
  } catch (error) {
    showResetMessage('Network error. Please try again.', 'error');
  } finally {
    setLoading(DOM.verifyCodeBtn, false);
  }
}

async function resetPassword() {
  const email = DOM.resetEmail.value.trim();
  const code = DOM.resetCode.value.trim();
  const newPassword = DOM.newPassword.value;
  const confirmPassword = DOM.confirmNewPassword.value;
  
  if (newPassword.length < 6) {
    showResetMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showResetMessage('Passwords do not match', 'error');
    return;
  }
  
  try {
    setLoading(DOM.resetPasswordBtn, true);
    
    const { data } = await apiCall('/api/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    });
    
    if (data.success) {
      showResetMessage('Password reset successfully! You can now login.', 'success');
      setTimeout(() => {
        DOM.forgotPasswordSection.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
        resetResetForm();
      }, 2000);
    } else {
      showResetMessage(data.error || 'Failed to reset password', 'error');
    }
  } catch (error) {
    showResetMessage('Network error. Please try again.', 'error');
  } finally {
    setLoading(DOM.resetPasswordBtn, false);
  }
}

function showResetMessage(text, type) {
  DOM.resetMessage.textContent = text;
  DOM.resetMessage.className = `message ${type}`;
  DOM.resetMessage.classList.remove('hidden');
}

// ========== INITIALIZATION ==========

function init() {
  if (AppState.token && AppState.user) {
    showNotesSection();
  } else {
    showAuthSection();
  }
  
  setupEventListeners();
  setupPasswordToggle();
  setupCharacterCounter();
  initForgotPassword();
  
  if (AppState.token) {
    verifyToken();
  }
}

async function verifyToken() {
  try {
    const { data } = await apiCall('/api/verify-token', { method: 'POST' });
    if (!data.success) {
      AppState.clearAuth();
      showAuthSection();
    }
  } catch (error) {
    AppState.clearAuth();
    showAuthSection();
  }
}

function setupCharacterCounter() {
  DOM.noteContentInput.addEventListener('input', debounce(() => {
    const count = DOM.noteContentInput.value.length;
    DOM.charCount.textContent = count;
    
    DOM.charCount.className = count > 4000 ? 'char-counter error' :
                              count > 2000 ? 'char-counter warning' :
                              'char-counter';
  }, 100));
}

// ========== EVENT LISTENERS ==========

function setupEventListeners() {
  DOM.loginTab.addEventListener('click', () => {
    DOM.loginTab.classList.add('active');
    DOM.registerTab.classList.remove('active');
    DOM.loginForm.classList.remove('hidden');
    DOM.registerForm.classList.add('hidden');
    DOM.forgotPasswordSection.classList.add('hidden');
    DOM.authMessage.classList.add('hidden');
  });
  
  DOM.registerTab.addEventListener('click', () => {
    DOM.registerTab.classList.add('active');
    DOM.loginTab.classList.remove('active');
    DOM.registerForm.classList.remove('hidden');
    DOM.loginForm.classList.add('hidden');
    DOM.forgotPasswordSection.classList.add('hidden');
    DOM.authMessage.classList.add('hidden');
  });
  
  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.registerForm.addEventListener('submit', handleRegister);
  DOM.logoutBtn.addEventListener('click', showLogoutModal);
  DOM.noteForm.addEventListener('submit', handleNoteSave);
  DOM.cancelEditBtn.addEventListener('click', resetNoteForm);
  
  DOM.sortSelect.addEventListener('change', () => {
    sortNotes(DOM.sortSelect.value);
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeViewModal();
      closeDeleteModal();
    }
  });
}

// ========== AUTH HANDLERS ==========

async function handleLogin(e) {
  e.preventDefault();
  if (AppState.isLoading) return;
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!isValidEmail(email)) {
    showAuthMessage('Please enter a valid email address', 'error');
    return;
  }
  
  try {
    AppState.isLoading = true;
    setLoading(DOM.loginSubmitBtn, true);
    
    const { data } = await apiCall('/api/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email.toLowerCase(), 
        password 
      })
    });
    
    if (data.success) {
      AppState.setToken(data.token);
      AppState.setUser(data.user);
      
      showNotesSection();
      showNotification('Login successful!', 'success');
      
      document.getElementById('login-email').value = '';
      document.getElementById('login-password').value = '';
    } else {
      showAuthMessage(data.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    showAuthMessage('Network error. Please try again.', 'error');
  } finally {
    AppState.isLoading = false;
    setLoading(DOM.loginSubmitBtn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  if (AppState.isLoading) return;
  
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim().toLowerCase();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (name.length < 2) {
    showAuthMessage('Name must be at least 2 characters', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showAuthMessage('Please use a valid email from common providers', 'error');
    return;
  }
  
  if (password.length < 6) {
    showAuthMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showAuthMessage('Passwords do not match', 'error');
    return;
  }
  
  try {
    AppState.isLoading = true;
    setLoading(DOM.registerSubmitBtn, true);
    
    const { data } = await apiCall('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    if (data.success) {
      AppState.setToken(data.token);
      AppState.setUser(data.user);
      
      showNotesSection();
      showNotification('Account created successfully!', 'success');
      
      document.getElementById('register-name').value = '';
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-confirm-password').value = '';
    } else {
      showAuthMessage(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showAuthMessage('Network error. Please try again.', 'error');
  } finally {
    AppState.isLoading = false;
    setLoading(DOM.registerSubmitBtn, false);
  }
}

function showLogoutModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3><i class="fas fa-sign-out-alt"></i> Logout</h3>
        <button class="close-modal" id="close-logout-modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to logout?</p>
        <p class="text-muted">You'll need to login again to access your notes.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-danger" id="confirm-logout">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
        <button class="btn-secondary" id="cancel-logout">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('confirm-logout').onclick = () => {
    AppState.clearAuth();
    modal.remove();
    showAuthSection();
    showNotification('Logged out successfully', 'success');
  };
  
  document.getElementById('cancel-logout').onclick = () => modal.remove();
  document.getElementById('close-logout-modal').onclick = () => modal.remove();
  modal.onclick = (e) => e.target === modal && modal.remove();
}

// ========== VIEW MANAGEMENT ==========

function showAuthSection() {
  DOM.authSection.classList.remove('hidden');
  DOM.notesSection.classList.add('hidden');
  DOM.loginTab.click();
}

function showNotesSection() {
  DOM.authSection.classList.add('hidden');
  DOM.notesSection.classList.remove('hidden');
  
  if (AppState.user) {
    DOM.userName.textContent = AppState.user.name;
    DOM.userEmail.textContent = AppState.user.email;
  }
  
  loadNotes(true);
}

// ========== NOTES MANAGEMENT ==========

async function loadNotes(forceRefresh = false) {
  if (!AppState.token || !AppState.user) {
    showAuthSection();
    return;
  }
  
  try {
    if (forceRefresh) {
      DOM.notesList.innerHTML = '<div class="notes-loading"><div class="loading-spinner"></div><p>Loading notes...</p></div>';
      DOM.emptyState.classList.add('hidden');
    }
    
    const { data } = await apiCall('/api/notes');
    
    if (data.success && Array.isArray(data.notes)) {
      AppState.notes = data.notes.map(note => ({
        ...note,
        id: note._id || note.id
      }));
      
      DOM.notesCount.textContent = AppState.notes.length;
      sortNotes(DOM.sortSelect.value);
      DOM.emptyState.classList.add('hidden');
    } else {
      AppState.notes = [];
      DOM.notesCount.textContent = '0';
      DOM.notesList.innerHTML = '';
      DOM.emptyState.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    AppState.notes = [];
    DOM.notesList.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');
    showNotification('Failed to load notes', 'error');
  }
}

function sortNotes(sortBy) {
  let sorted = [...AppState.notes];
  
  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  
  renderNotes(sorted);
}

function renderNotes(notes) {
  DOM.notesList.innerHTML = '';
  
  if (notes.length === 0) {
    DOM.emptyState.classList.remove('hidden');
    return;
  }
  
  DOM.emptyState.classList.add('hidden');
  
  notes.forEach(note => {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    
    const escapedTitle = escapeHtml(note.title);
    const escapedContent = escapeHtml(note.content);
    const preview = escapedContent.length > 300 ? 
      escapedContent.substring(0, 300) + '...' : 
      escapedContent;
    
    const date = new Date(note.createdAt || note.updatedAt || Date.now());
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const noteId = note.id;
    
    noteCard.innerHTML = `
      <div class="note-header">
        <h3 class="note-title" onclick="window.viewNote('${noteId}')">${escapedTitle}</h3>
        <div class="note-actions">
          <button class="action-btn view" onclick="window.viewNote('${noteId}')" title="View">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn edit" onclick="window.editNote('${noteId}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="window.deleteNotePrompt('${noteId}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="note-preview">${preview}</div>
      <div class="note-footer">
        <div class="note-date">
          <i class="far fa-calendar"></i>
          ${formattedDate}
        </div>
        <div class="note-length">
          <i class="fas fa-text-height"></i>
          ${note.content.length} chars
        </div>
      </div>
    `;
    
    DOM.notesList.appendChild(noteCard);
  });
}

async function handleNoteSave(e) {
  e.preventDefault();
  if (AppState.isLoading) return;
  
  const title = DOM.noteTitleInput.value.trim();
  const content = DOM.noteContentInput.value.trim();
  
  if (!title || !content) {
    showNotification('Please fill in both title and content', 'error');
    return;
  }
  
  if (title.length > 200) {
    showNotification('Title must be 200 characters or less', 'error');
    return;
  }
  
  if (content.length > 20000) {
    showNotification('Content must be 20000 characters or less', 'error');
    return;
  }
  
  try {
    AppState.isLoading = true;
    setLoading(DOM.saveNoteBtn, true);
    
    const endpoint = AppState.editingNoteId ? `/api/notes/${AppState.editingNoteId}` : '/api/notes';
    const method = AppState.editingNoteId ? 'PUT' : 'POST';
    
    const { data } = await apiCall(endpoint, {
      method,
      body: JSON.stringify({ title, content })
    });
    
    if (data.success) {
      resetNoteForm();
      await loadNotes(true);
      showNotification(
        AppState.editingNoteId ? 'Note updated!' : 'Note created!', 
        'success'
      );
    } else {
      showNotification(data.error || 'Failed to save note', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  } finally {
    AppState.isLoading = false;
    setLoading(DOM.saveNoteBtn, false);
  }
}

function resetNoteForm() {
  AppState.editingNoteId = null;
  DOM.noteTitleInput.value = '';
  DOM.noteContentInput.value = '';
  DOM.charCount.textContent = '0';
  DOM.charCount.className = 'char-counter';
  DOM.saveNoteBtn.innerHTML = '<i class="fas fa-save"></i> Save Note';
  DOM.cancelEditBtn.classList.add('hidden');
}

// ========== GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ==========

window.viewNote = function(noteId) {
  const note = AppState.notes.find(n => n.id === noteId);
  if (!note) {
    showNotification('Note not found', 'error');
    return;
  }
  
  const escapedTitle = escapeHtml(note.title);
  const escapedContent = escapeHtml(note.content).replace(/\n/g, '<br>');
  
  document.getElementById('view-title').innerHTML = escapedTitle;
  document.getElementById('view-content').innerHTML = escapedContent;
  
  const date = new Date(note.createdAt || note.updatedAt || Date.now());
  document.getElementById('view-date').textContent = date.toLocaleString();
  document.getElementById('view-id').textContent = (noteId || '').substring(0, 8);
  
  document.getElementById('view-modal').classList.remove('hidden');
};

window.closeViewModal = function() {
  document.getElementById('view-modal').classList.add('hidden');
};

window.editNote = function(noteId) {
  const note = AppState.notes.find(n => n.id === noteId);
  if (!note) {
    showNotification('Note not found', 'error');
    return;
  }
  
  AppState.editingNoteId = noteId;
  DOM.noteTitleInput.value = note.title;
  DOM.noteContentInput.value = note.content;
  
  const count = note.content.length;
  DOM.charCount.textContent = count;
  DOM.charCount.className = count > 4000 ? 'char-counter error' :
                            count > 2000 ? 'char-counter warning' :
                            'char-counter';
  
  DOM.saveNoteBtn.innerHTML = '<i class="fas fa-save"></i> Update Note';
  DOM.cancelEditBtn.classList.remove('hidden');
  
  document.querySelector('.create-card').scrollIntoView({ 
    behavior: 'smooth',
    block: 'center'
  });
  
  setTimeout(() => DOM.noteTitleInput.focus(), 300);
};

window.deleteNotePrompt = function(noteId) {
  const note = AppState.notes.find(n => n.id === noteId);
  if (!note) {
    showNotification('Note not found', 'error');
    return;
  }
  
  const escapedContent = escapeHtml(note.content);
  document.getElementById('delete-preview').textContent = 
    escapedContent.substring(0, 150) + (note.content.length > 150 ? '...' : '');
  
  document.getElementById('delete-modal').classList.remove('hidden');
  
  const confirmBtn = document.getElementById('confirm-delete');
  confirmBtn.onclick = () => deleteNote(noteId);
};

window.closeDeleteModal = function() {
  document.getElementById('delete-modal').classList.add('hidden');
};

async function deleteNote(noteId) {
  if (AppState.isLoading) return;
  
  try {
    AppState.isLoading = true;
    const confirmBtn = document.getElementById('confirm-delete');
    setLoading(confirmBtn, true);
    
    const { data } = await apiCall(`/api/notes/${noteId}`, { method: 'DELETE' });
    
    if (data.success) {
      AppState.notes = AppState.notes.filter(n => n.id !== noteId);
      renderNotes(AppState.notes);
      DOM.notesCount.textContent = AppState.notes.length;
      
      closeDeleteModal();
      showNotification('Note deleted successfully', 'success');
      
      if (AppState.notes.length === 0) {
        DOM.emptyState.classList.remove('hidden');
      }
    } else {
      showNotification(data.error || 'Failed to delete note', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  } finally {
    AppState.isLoading = false;
    const confirmBtn = document.getElementById('confirm-delete');
    setLoading(confirmBtn, false);
  }
}

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', init);