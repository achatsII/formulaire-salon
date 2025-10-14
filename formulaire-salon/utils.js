/* ------------- utils.js ------------- */
document.addEventListener('DOMContentLoaded', () => {
  const { offlineIndicator } = window;

  /* ---------- IndexedDB Configuration ---------- */
  const DB_NAME = 'LeadsDB';
  const STORE_NAME = 'leads';
  let db;

  /* ---------- API Endpoints ---------- */
  const TRANSCRIPTION_ENDPOINT = 'https://n8n.tools.intelligenceindustrielle.com/webhook/aa2a5214-16bc-4d13-a41e-d76d76eb0212';

  /* ---------- Fonctions d'identifiant, dates, stockage ---------- */
  window.initDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = (event) => {
        console.error('Database error:', event.target.error);
        showToast('Erreur DB', "Erreur d'initialisation IndexedDB.", 'error');
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database initialised successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
          dbInstance.createObjectStore(STORE_NAME, { keyPath: 'leadId' });
          console.log('Leads object store created');
        }
      };
    });
  };

  window.getAllLeadsFromDB = () => {
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error('DB not initialized for getAllLeadsFromDB');
        return reject('DB not initialized');
      }
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = (event) => {
        console.error('Error fetching leads:', event.target.error);
        showToast('Erreur DB', 'Impossible de récupérer les fiches.', 'error');
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
    });
  };

  window.saveLeadToDB = (lead) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error('DB not initialized for saveLeadToDB');
        return reject('DB not initialized');
      }
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(lead);

      request.onerror = (event) => {
        console.error('Error saving lead:', event.target.error);
        showToast('Erreur DB', 'Impossible de sauvegarder la fiche.', 'error');
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        console.log('Lead saved successfully:', lead.leadId);
        resolve(event.target.result);
      };
    });
  };

  window.deleteLeadFromDB = (leadId) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error('DB not initialized for deleteLeadFromDB');
        return reject('DB not initialized');
      }
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(leadId);

      request.onerror = (event) => {
        console.error('Error deleting lead:', event.target.error);
        showToast('Erreur DB', 'Impossible de supprimer la fiche.', 'error');
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        console.log('Lead deleted successfully:', leadId);
        resolve();
      };
    });
  };

  window.generateId = () =>
    'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  window.formatDate = (d) => {
    const y=d.getFullYear(),
          m=('0'+(d.getMonth()+1)).slice(-2),
          day=('0'+d.getDate()).slice(-2),
          h=('0'+d.getHours()).slice(-2),
          mn=('0'+d.getMinutes()).slice(-2);
    return `${y}-${m}-${day}_${h}-${mn}`;
  };

  /* ---------- Toast (identique à l'original) ---------- */
  window.showToast = function(title, message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="toast-icon" style="color: var(--success-color)">
                   <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                   <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="toast-icon" style="color: var(--error-color)">
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="12" y1="8" x2="12" y2="12"></line>
                   <line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="toast-icon" style="color: var(--warning-color)">
                   <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                   <line x1="12" y1="9" x2="12" y2="13"></line>
                   <line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
          <div class="toast-title">${title}</div>
          <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <line x1="18" y1="6" x2="6" y2="18"></line>
               <line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>`;

    toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('slide-out');
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (document.getElementById(toastId)) {
        toast.classList.add('slide-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  };

  /* ---------- Fichier & CSV ---------- */
  window.downloadFile = (content, mimeType, filename) => {
    const blob = new Blob(["\uFEFF" + content], { type: mimeType });
    const link = document.createElement("a"),
          url  = URL.createObjectURL(blob);
    Object.assign(link, { href: url, download: filename, style: 'visibility:hidden' });
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  };

  window.parseCSV = function(csvText) {
    const lines   = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    console.log("CSV Headers Found:", headers);
    const result  = [];

    for (let i=1; i<lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = []; let inQuote=false, cur='';
      for (let ch of lines[i]) {
        if (ch === '"') inQuote = !inQuote;
        else if (ch === ',' && !inQuote) { values.push(cur); cur=''; }
        else cur += ch;
      }
      values.push(cur);

      const obj = {};
      headers.forEach((h, idx) => {
        if (idx < values.length) obj[h] = values[idx].trim().replace(/^"(.*)"$/, '$1');
      });
      
      if (i === 1) {
        console.log("First Data Row Object (obj):", JSON.parse(JSON.stringify(obj))); 
      }

      if (i === 1) {
          console.log('Checking interetClient value:', obj["Intérêt Client (1-3)"]);
          console.log('Checking interetII value:', obj["Intérêt Pour Nous (1-3)"] || obj["Intérêt I.I. (1-3)"]);
      }

      result.push({
        leadId: generateId(),
        leadType: obj["Type Lead"] || '',
        email: obj["Courriel"] || '',
        prenom: obj["Prénom"] || '',
        nom: obj["Nom"] || '',
        telephone: obj["Téléphone"] || '',
        entreprise: obj["Nom Entreprise"] || '',
        intitule: obj["Fonction"] || obj["Intitulé Contact"] || '',
        secteur: obj["Secteur"] || '',
        decideur: obj["Décideur"] || 'Oui',
        nomDecideur: obj["Nom Décideur"] || '',
        interetClient: (() => {
          // Convert numeric interest values to text format
          const val = obj["Intérêt Client (1-3)"] || '';
          if (val === '1') return 'Froid';
          if (val === '2') return 'Tempéré';
          if (val === '3') return 'Chaud';
          return val; // Return original if not a number we recognize
        })(),
        interetII: (() => {
          // Convert numeric interest values to text format
          const val = obj["Intérêt Pour Nous (1-3)"] || obj["Intérêt I.I. (1-3)"] || '';
          if (val === '1') return 'Froid';
          if (val === '2') return 'Tempéré';
          if (val === '3') return 'Chaud';
          return val; // Return original if not a number we recognize
        })(),
        notes: obj["Notes"] || '',
        salonName: obj["Nom Salon"] || '',
        vendeur: obj["Vendeur"] || '',
        // Parse Audio Recordings JSON
        audioRecordings: (() => {
            const jsonString = obj["Audio Recordings (JSON)"];
            if (!jsonString) return [];
            try {
                const parsed = JSON.parse(jsonString);
                return Array.isArray(parsed) ? parsed : []; // Ensure it's an array
            } catch (e) {
                console.warn('Failed to parse Audio Recordings JSON:', jsonString, e);
                return []; // Return empty array on parse error
            }
        })(),
        timestamp: new Date().toISOString(),
        isComplete: (obj["Courriel"]||'').trim() !== ''
      });
    }
    return result;
  };

  /* ---------- Phone Number Formatting ---------- */
  
  /**
   * Formats a phone number string to (XXX) XXX-XXXX as the user types.
   * @param {string} value The input phone number string.
   * @returns {string} The formatted phone number string.
   */
  window.formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, ''); // Remove non-digit chars
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  /**
   * Removes formatting from a phone number string.
   * @param {string} formattedValue The formatted phone number string (e.g., (XXX) XXX-XXXX).
   * @returns {string} The unformatted phone number string (only digits).
   */
  window.unformatPhoneNumber = (formattedValue) => {
    if (!formattedValue) return formattedValue;
    return formattedValue.replace(/[^\d]/g, '');
  };

  /* ---------- Email Validation ---------- */
  
  /**
   * Validates an email address format using a regex.
   * @param {string} email The email address string.
   * @returns {boolean} True if the format is valid, false otherwise.
   */
  window.isValidEmail = (email) => {
    if (!email) return false;
    // Basic email regex - adjust if more complex validation is needed
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(String(email).toLowerCase());
  };

  /* ---------- Transcription ---------- */
  window.transcribeAudio = async (audioBlob) => {
    if (!navigator.onLine) {
      throw new Error('Offline');
    }
    const formData = new FormData();
    // Détecter l'extension basée sur le type MIME si possible
    let fileExtension = 'wav'; // Default
    if (audioBlob.type) {
      if (audioBlob.type.includes('webm')) fileExtension = 'webm';
      else if (audioBlob.type.includes('mp4')) fileExtension = 'mp4';
      else if (audioBlob.type.includes('aac')) fileExtension = 'aac';
      // Garder 'wav' si le type n'est pas reconnu ou est 'audio/wav'
    }
    const filename = `recording_${Date.now()}.${fileExtension}`;
    formData.append('file', audioBlob, filename);

    try {
      const response = await fetch(TRANSCRIPTION_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription API error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const transcription = await response.text();
      return transcription;
    } catch (error) {
      console.error('Error calling transcription API:', error);
      showToast('Erreur Transcription', 'Impossible de transcrire la note vocale.', 'error');
      throw error;
    }
  };

  window.blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  window.base64ToBlob = (base64, mimeType = 'audio/webm') => {
    // Extrait les données pures et le type MIME si présent dans la chaîne base64
    const match = base64.match(/^data:(.+);base64,(.+)$/);
    let base64Data, actualMimeType;
    if (match) {
        actualMimeType = match[1];
        base64Data = match[2];
    } else {
        // Si le préfixe n'est pas là, on assume que c'est juste la data
        base64Data = base64;
        actualMimeType = mimeType;
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: actualMimeType});
}

  /* ---------- Online / Offline ---------- */
  window.updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    if (isOnline) {
      offlineIndicator.classList.add('hidden');
      // Déclencher le traitement des transcriptions en attente
      window.processPendingTranscriptions && window.processPendingTranscriptions();
    } else {
      offlineIndicator.classList.remove('hidden');
      showToast('Mode Hors-ligne',
        'Vous êtes en mode hors-ligne. Vos données sont sauvegardées localement.',
        'warning');
    }
  };
});
