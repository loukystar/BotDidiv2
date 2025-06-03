// Application state
let appState = {
    connected: false,
    guilds: [],
    roles: [],
    channels: [],
    selectedGuild: null,
    selectedRole: null,
    selectedChannel: null,
    config: {
        hasDefaultChannel: false,
        defaultChannelId: null
    }
};

// DOM elements
const elements = {
    // Forms
    connectionForm: document.getElementById('connectionForm'),
    messageForm: document.getElementById('messageForm'),
    
    // Inputs
    botToken: document.getElementById('botToken'),
    guildSelect: document.getElementById('guildSelect'),
    roleSelect: document.getElementById('roleSelect'),
    channelSelect: document.getElementById('channelSelect'),
    customMessage: document.getElementById('customMessage'),
    specialGuildSelect: document.getElementById('specialGuildSelect'),
    specialChannelSelect: document.getElementById('specialChannelSelect'),
    
    // Buttons
    connectBtn: document.getElementById('connectBtn'),
    autoConnectBtn: document.getElementById('autoConnectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    sendBtn: document.getElementById('sendBtn'),
    sendSpecialBtn: document.getElementById('sendSpecialBtn'),
    toggleToken: document.getElementById('toggleToken'),
    clearLogs: document.getElementById('clearLogs'),
    
    // Status and info
    connectionStatus: document.getElementById('connectionStatus'),
    botInfo: document.getElementById('botInfo'),
    messagePreview: document.getElementById('messagePreview'),
    alertContainer: document.getElementById('alertContainer'),
    logsContainer: document.getElementById('logsContainer'),
    
    // Tabs
    tabs: document.querySelectorAll('[data-tab]'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Modal
    loadingModal: new bootstrap.Modal(document.getElementById('loadingModal'))
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadConfiguration();
    checkConnectionStatus();
    loadLogs();
    
    // Check for environment token on load
    setTimeout(() => {
        checkConnectionStatus();
    }, 1000);
});

// Event listeners
function initializeEventListeners() {
    // Tab navigation
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', handleTabClick);
    });
    
    // Forms
    elements.connectionForm.addEventListener('submit', handleConnection);
    elements.messageForm.addEventListener('submit', handleSendMessage);
    document.getElementById('specialMessageForm').addEventListener('submit', handleSendSpecialMessage);
    
    // Buttons
    elements.autoConnectBtn.addEventListener('click', handleAutoConnection);
    elements.disconnectBtn.addEventListener('click', handleDisconnection);
    elements.toggleToken.addEventListener('click', toggleTokenVisibility);
    elements.clearLogs.addEventListener('click', clearLogs);
    
    // Select changes
    elements.guildSelect.addEventListener('change', handleGuildChange);
    elements.roleSelect.addEventListener('change', handleRoleChange);
    elements.channelSelect.addEventListener('change', handleChannelChange);
    elements.customMessage.addEventListener('input', updateMessagePreview);
    elements.specialGuildSelect.addEventListener('change', handleSpecialGuildChange);
    
    // Auto-refresh status
    setInterval(checkConnectionStatus, 30000); // Check every 30 seconds
}

// Tab handling
function handleTabClick(e) {
    e.preventDefault();
    const targetTab = e.currentTarget.dataset.tab;
    
    // Update active tab
    elements.tabs.forEach(tab => tab.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Show target content
    elements.tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(targetTab + 'Tab').classList.add('active');
    
    // Refresh data if needed
    if (targetTab === 'message' && appState.connected) {
        loadGuilds();
    }
}

// Connection handling
async function handleConnection(e) {
    e.preventDefault();
    
    const token = elements.botToken.value.trim();
    
    elements.loadingModal.show();
    elements.connectBtn.disabled = true;
    
    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Connexion réussie !', 'success');
            await updateConnectionStatus(true);
            addLog('Connexion Discord établie', 'success');
            
            // Switch to message tab
            document.querySelector('[data-tab="message"]').click();
        } else {
            showAlert(`Erreur de connexion : ${data.error}`, 'danger');
            addLog(`Échec de connexion : ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
        addLog(`Erreur de réseau : ${error.message}`, 'error');
    } finally {
        elements.loadingModal.hide();
        elements.connectBtn.disabled = false;
    }
}

// Auto connection handling
async function handleAutoConnection() {
    elements.loadingModal.show();
    elements.autoConnectBtn.disabled = true;
    
    try {
        const response = await fetch('/api/auto-connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Connexion automatique réussie !', 'success');
            await updateConnectionStatus(true);
            addLog('Connexion automatique Discord établie', 'success');
            
            // Switch to message tab
            document.querySelector('[data-tab="message"]').click();
        } else {
            showAlert(`Erreur de connexion automatique : ${data.error}`, 'danger');
            addLog(`Échec de connexion automatique : ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
        addLog(`Erreur de réseau : ${error.message}`, 'error');
    } finally {
        elements.loadingModal.hide();
        elements.autoConnectBtn.disabled = false;
    }
}

// Special message handling
async function handleSendSpecialMessage(e) {
    e.preventDefault();
    
    if (!appState.connected) {
        showAlert('Bot non connecté', 'danger');
        return;
    }
    
    const guildId = elements.specialGuildSelect.value;
    const channelId = elements.specialChannelSelect.value;
    
    if (!guildId || !channelId) {
        showAlert('Veuillez sélectionner un serveur et un canal', 'warning');
        return;
    }
    
    elements.loadingModal.show();
    elements.sendSpecialBtn.disabled = true;
    
    try {
        const response = await fetch('/api/send-special-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                guild_id: guildId,
                channel_id: channelId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Message spécial envoyé avec succès dans ${data.channel} !`, 'success');
            addLog(`Message spécial envoyé dans ${data.guild} ${data.channel}: "${data.content}"`, 'success');
        } else {
            showAlert(`Erreur d'envoi : ${data.error}`, 'danger');
            addLog(`Échec d'envoi du message spécial : ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
        addLog(`Erreur d'envoi du message spécial : ${error.message}`, 'error');
    } finally {
        elements.loadingModal.hide();
        elements.sendSpecialBtn.disabled = false;
    }
}

// Special guild selection change
async function handleSpecialGuildChange() {
    const guildId = elements.specialGuildSelect.value;
    
    // Reset channel select
    elements.specialChannelSelect.innerHTML = '<option value="">Sélectionner un channel...</option>';
    
    if (guildId) {
        await loadSpecialChannels(guildId);
    }
}

// Load channels for special message
async function loadSpecialChannels(guildId) {
    try {
        const response = await fetch(`/api/channels/${guildId}`);
        const data = await response.json();
        
        if (data.success) {
            updateSpecialChannelSelect(data.channels);
        } else {
            showAlert(`Erreur de chargement des channels : ${data.error}`, 'danger');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
    }
}

// Update special channel select
function updateSpecialChannelSelect(channels) {
    elements.specialChannelSelect.innerHTML = '<option value="">Sélectionner un channel...</option>';
    
    let currentCategory = '';
    channels.forEach(channel => {
        if (channel.category !== currentCategory) {
            currentCategory = channel.category;
            const optgroup = document.createElement('optgroup');
            optgroup.label = currentCategory;
            elements.specialChannelSelect.appendChild(optgroup);
        }
        
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}${channel.nsfw ? ' (NSFW)' : ''}`;
        
        const optgroup = elements.specialChannelSelect.lastElementChild;
        if (optgroup.tagName === 'OPTGROUP') {
            optgroup.appendChild(option);
        } else {
            elements.specialChannelSelect.appendChild(option);
        }
    });
}

// Disconnection handling
async function handleDisconnection() {
    elements.loadingModal.show();
    
    try {
        const response = await fetch('/api/disconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Déconnexion réussie', 'info');
            await updateConnectionStatus(false);
            addLog('Bot Discord déconnecté', 'info');
            resetForm();
        } else {
            showAlert(`Erreur de déconnexion : ${data.error}`, 'danger');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
    } finally {
        elements.loadingModal.hide();
    }
}

// Message sending
async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!appState.connected) {
        showAlert('Bot non connecté', 'danger');
        return;
    }
    
    const guildId = elements.guildSelect.value;
    const roleId = elements.roleSelect.value;
    const message = elements.customMessage.value.trim();
    
    // Utiliser le canal prédéfini si configuré, sinon celui sélectionné
    const channelId = appState.config.hasDefaultChannel 
        ? appState.config.defaultChannelId 
        : elements.channelSelect.value;
    
    if (!guildId || !roleId) {
        showAlert('Veuillez sélectionner un serveur et un rôle', 'warning');
        return;
    }
    
    if (!channelId) {
        showAlert('Aucun canal configuré pour l\'envoi', 'warning');
        return;
    }
    
    elements.loadingModal.show();
    elements.sendBtn.disabled = true;
    
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                guild_id: guildId,
                channel_id: channelId,
                role_id: roleId,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Message envoyé avec succès dans ${data.channel} !`, 'success');
            addLog(`Message envoyé dans ${data.guild} ${data.channel} mentionnant ${data.role}`, 'success');
            
            // Clear custom message
            elements.customMessage.value = '';
            updateMessagePreview();
        } else {
            showAlert(`Erreur d'envoi : ${data.error}`, 'danger');
            addLog(`Échec d'envoi : ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
        addLog(`Erreur d'envoi : ${error.message}`, 'error');
    } finally {
        elements.loadingModal.hide();
        elements.sendBtn.disabled = false;
    }
}

// Guild selection change
async function handleGuildChange() {
    const guildId = elements.guildSelect.value;
    appState.selectedGuild = guildId;
    
    // Reset dependent selects
    elements.roleSelect.innerHTML = '<option value="">Sélectionner un rôle...</option>';
    elements.channelSelect.innerHTML = '<option value="">Sélectionner un channel...</option>';
    appState.selectedRole = null;
    appState.selectedChannel = null;
    
    if (guildId) {
        await Promise.all([loadRoles(guildId), loadChannels(guildId)]);
    }
    
    updateMessagePreview();
}

// Role selection change
function handleRoleChange() {
    appState.selectedRole = elements.roleSelect.value;
    updateMessagePreview();
}

// Channel selection change
function handleChannelChange() {
    appState.selectedChannel = elements.channelSelect.value;
    updateMessagePreview();
}

// Load guilds
async function loadGuilds() {
    if (!appState.connected) return;
    
    try {
        const response = await fetch('/api/guilds');
        const data = await response.json();
        
        if (data.success) {
            appState.guilds = data.guilds;
            updateGuildSelect();
        } else {
            showAlert(`Erreur de chargement des serveurs : ${data.error}`, 'danger');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
    }
}

// Load roles for a guild
async function loadRoles(guildId) {
    try {
        const response = await fetch(`/api/roles/${guildId}`);
        const data = await response.json();
        
        if (data.success) {
            appState.roles = data.roles;
            updateRoleSelect();
        } else {
            showAlert(`Erreur de chargement des rôles : ${data.error}`, 'danger');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
    }
}

// Load channels for a guild
async function loadChannels(guildId) {
    try {
        const response = await fetch(`/api/channels/${guildId}`);
        const data = await response.json();
        
        if (data.success) {
            appState.channels = data.channels;
            updateChannelSelect();
        } else {
            showAlert(`Erreur de chargement des channels : ${data.error}`, 'danger');
        }
    } catch (error) {
        showAlert(`Erreur de réseau : ${error.message}`, 'danger');
    }
}

// Update UI elements
function updateGuildSelect() {
    elements.guildSelect.innerHTML = '<option value="">Sélectionner un serveur...</option>';
    
    appState.guilds.forEach(guild => {
        const option = document.createElement('option');
        option.value = guild.id;
        option.textContent = `${guild.name} (${guild.member_count} membres)`;
        elements.guildSelect.appendChild(option);
    });
}

function updateRoleSelect() {
    elements.roleSelect.innerHTML = '<option value="">Sélectionner un rôle...</option>';
    
    appState.roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = `${role.name} (${role.members} membres)`;
        if (role.color && role.color !== '#000000') {
            option.style.color = role.color;
        }
        elements.roleSelect.appendChild(option);
    });
}

function updateChannelSelect() {
    elements.channelSelect.innerHTML = '<option value="">Sélectionner un channel...</option>';
    
    let currentCategory = '';
    appState.channels.forEach(channel => {
        if (channel.category !== currentCategory) {
            currentCategory = channel.category;
            const optgroup = document.createElement('optgroup');
            optgroup.label = currentCategory;
            elements.channelSelect.appendChild(optgroup);
        }
        
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}${channel.nsfw ? ' (NSFW)' : ''}`;
        
        const optgroup = elements.channelSelect.lastElementChild;
        if (optgroup.tagName === 'OPTGROUP') {
            optgroup.appendChild(option);
        } else {
            elements.channelSelect.appendChild(option);
        }
    });
}

// Message preview
function updateMessagePreview() {
    const customMessage = elements.customMessage.value.trim();
    const selectedGuild = appState.guilds.find(g => g.id === appState.selectedGuild);
    const selectedRole = appState.roles.find(r => r.id === appState.selectedRole);
    
    let preview = '';
    
    if (selectedGuild) {
        preview += `Bot / ${selectedGuild.name}\n`;
        
        if (customMessage) {
            preview += `${customMessage}\n`;
        }
        
        if (selectedRole) {
            preview += `<span class="role-mention">@${selectedRole.name}</span>`;
        }
    } else {
        preview = '<p class="text-muted">Sélectionnez les options pour voir l\'aperçu</p>';
    }
    
    elements.messagePreview.innerHTML = preview || '<p class="text-muted">Sélectionnez les options pour voir l\'aperçu</p>';
}

// Connection status
async function checkConnectionStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        await updateConnectionStatus(data.connected, data);
    } catch (error) {
        console.error('Erreur de vérification du statut:', error);
        await updateConnectionStatus(false);
    }
}

async function updateConnectionStatus(connected, botData = null) {
    appState.connected = connected;
    
    if (connected) {
        elements.connectionStatus.textContent = 'Connecté';
        elements.connectionStatus.className = 'badge bg-success';
        elements.connectBtn.disabled = true;
        elements.disconnectBtn.disabled = false;
        elements.sendBtn.disabled = false;
        
        if (botData) {
            elements.botInfo.innerHTML = `
                <div><strong>Nom :</strong> ${botData.bot_name}</div>
                <div><strong>ID :</strong> ${botData.bot_id}</div>
                <div><strong>Serveurs :</strong> ${botData.guild_count}</div>
            `;
        }
        
        // Load guilds if on message tab
        if (document.getElementById('messageTab').classList.contains('active')) {
            await loadGuilds();
        }
    } else {
        elements.connectionStatus.textContent = 'Déconnecté';
        elements.connectionStatus.className = 'badge bg-secondary';
        elements.connectBtn.disabled = false;
        elements.disconnectBtn.disabled = true;
        elements.sendBtn.disabled = true;
        
        elements.botInfo.innerHTML = '<p class="text-muted">Non connecté</p>';
        resetForm();
    }
}

// Utility functions
function resetForm() {
    elements.guildSelect.innerHTML = '<option value="">Sélectionner un serveur...</option>';
    elements.roleSelect.innerHTML = '<option value="">Sélectionner un rôle...</option>';
    elements.channelSelect.innerHTML = '<option value="">Sélectionner un channel...</option>';
    elements.customMessage.value = '';
    
    appState.guilds = [];
    appState.roles = [];
    appState.channels = [];
    appState.selectedGuild = null;
    appState.selectedRole = null;
    appState.selectedChannel = null;
    
    updateMessagePreview();
}

function toggleTokenVisibility() {
    const type = elements.botToken.type === 'password' ? 'text' : 'password';
    elements.botToken.type = type;
    
    const icon = elements.toggleToken.querySelector('i');
    icon.setAttribute('data-feather', type === 'password' ? 'eye' : 'eye-off');
    feather.replace();
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i data-feather="${getAlertIcon(type)}"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    elements.alertContainer.appendChild(alertDiv);
    feather.replace();
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    return icons[type] || 'info';
}

// Logging
// Load configuration
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        appState.config.hasDefaultChannel = config.has_default_channel;
        appState.config.defaultChannelId = config.default_channel_id;
        
        updateChannelInterface();
    } catch (error) {
        console.error('Erreur de chargement de la configuration:', error);
    }
}

// Update channel interface based on configuration
function updateChannelInterface() {
    const channelContainer = document.getElementById('channelSelectContainer');
    const channelInfo = document.getElementById('channelInfo');
    const channelSelect = elements.channelSelect;
    
    if (appState.config.hasDefaultChannel) {
        // Masquer la sélection de canal et afficher l'info
        channelSelect.style.display = 'none';
        channelInfo.innerHTML = `<i class="text-success">✓ Canal prédéfini configuré (ID: ${appState.config.defaultChannelId})</i>`;
        channelSelect.removeAttribute('required');
    } else {
        // Afficher la sélection normale
        channelSelect.style.display = 'block';
        channelInfo.innerHTML = 'Sélectionnez le canal de destination';
        channelSelect.setAttribute('required', 'required');
    }
}

// Logging
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-message">${message}</span>
    `;
    
    if (elements.logsContainer.querySelector('.text-muted')) {
        elements.logsContainer.innerHTML = '';
    }
    
    elements.logsContainer.appendChild(logEntry);
    elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;
    
    // Save to localStorage
    saveLogs();
}

function clearLogs() {
    elements.logsContainer.innerHTML = '<p class="text-muted">Aucun log disponible</p>';
    localStorage.removeItem('discord_bot_logs');
}

function saveLogs() {
    const logs = Array.from(elements.logsContainer.querySelectorAll('.log-entry')).map(entry => ({
        timestamp: entry.querySelector('.log-timestamp').textContent,
        message: entry.querySelector('.log-message').textContent,
        type: Array.from(entry.classList).find(cls => cls.startsWith('log-')).replace('log-', '')
    }));
    
    localStorage.setItem('discord_bot_logs', JSON.stringify(logs.slice(-50))); // Keep last 50 logs
}

function loadLogs() {
    const savedLogs = localStorage.getItem('discord_bot_logs');
    if (savedLogs) {
        const logs = JSON.parse(savedLogs);
        elements.logsContainer.innerHTML = '';
        
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${log.type}`;
            logEntry.innerHTML = `
                <span class="log-timestamp">${log.timestamp}</span>
                <span class="log-message">${log.message}</span>
            `;
            elements.logsContainer.appendChild(logEntry);
        });
        
        if (logs.length === 0) {
            elements.logsContainer.innerHTML = '<p class="text-muted">Aucun log disponible</p>';
        } else {
            elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;
        }
    }
}
