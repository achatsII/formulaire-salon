/* ------------- app-init.js ------------- */

// Flag to prevent concurrent transcription processing
window.isProcessingPending = false;

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<void>}
 */
async function initDB() {
    return window.initDB(); // Assuming initDB is globally available from utils.js or similar
}

/**
 * Updates the UI based on the network connection status and processes pending transcriptions if online.
 */
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const { showToast, currentStep, currentLeadId } = window; // Ensure showToast, currentStep, currentLeadId are accessible
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (!offlineIndicator) {
        console.warn("Offline indicator element not found.");
        // Decide how to handle this - maybe return or proceed cautiously
    }

    if (offlineIndicator) {
        offlineIndicator.classList.toggle('hidden', isOnline);
    }
    document.body.classList.toggle('offline', !isOnline);

    if (isOnline) {
        showToast('Info', 'Vous êtes de retour en ligne.', 'info');

        if (currentStep === 5 && currentLeadId) {
            console.log(`[updateOnlineStatus] Online on Notes step (${currentStep}) for lead ${currentLeadId}. Scheduling TARGETED transcription check (delay 1s)...`);
        setTimeout(() => {
                console.log(`[updateOnlineStatus] Executing delayed TARGETED check for ${currentLeadId}`);
            if (window.processPendingTranscriptions) {
                    window.processPendingTranscriptions(currentLeadId); 
                }
            }, 1000); 
            } else {
            // If not on notes step, or no specific lead, schedule a global check sooner.
            console.log("[updateOnlineStatus] Not on Notes step or no current lead. Scheduling GLOBAL check (delay 2s).");
            setTimeout(() => {
                 console.log("[updateOnlineStatus] Executing delayed GLOBAL check (triggered by not being on notes step).");
                if (window.processPendingTranscriptions) {
                    window.processPendingTranscriptions(); // Global check
            }
            }, 2000); // Shorter delay for general global check
        }
        // The old separate global check is removed to prevent double runs / contention

    } else {
        showToast('Avertissement', 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.', 'warning');
    }
}

/**
 * Processes pending audio transcriptions.
 * If targetLeadId is provided, processes only that lead immediately.
 * Otherwise, processes all leads globally, AND any remaining pendingAudioRecordings.
 * @param {string} [targetLeadId] - Optional ID of a specific lead to process.
 */
window.processPendingTranscriptions = async (targetLeadId) => {
    if (window.isProcessingPending) {
        console.log("[processPending] Already running, skipping new request.");
        return;
    }
    window.isProcessingPending = true;

    const isTargetedRun = !!targetLeadId;
    console.log(`[processPending] Starting run. Targeted: ${isTargetedRun}${isTargetedRun ? ' for lead ' + targetLeadId : ''}`);

    const { showToast, base64ToBlob, transcribeAudio, saveLeadToDB, getAllLeadsFromDB, notesTextarea, currentLeadId: currentLeadIdOnForm } = window;
    if (!base64ToBlob || !transcribeAudio || !saveLeadToDB || !getAllLeadsFromDB) {
        console.error("Required functions for pending transcription not found on window object.");
        showToast('Erreur Système', 'Fonctions manquantes pour traiter les transcriptions.', 'error');
        window.isProcessingPending = false;
      return;
    }

    let leadsToProcessFromDB = [];
    let leadsToUpdateInDB = [];
    let processError = null;

    try {
        if (isTargetedRun) {
            console.log(`[processPending Targeted] Looking for lead ${targetLeadId} in window.leadsData...`);
            const targetLeadFromState = window.leadsData?.find(l => l.leadId === targetLeadId);
            
            if (targetLeadFromState) {
                console.log(`[processPending Targeted] Found lead ${targetLeadId} in window.leadsData. Processing its recordings.`);
                await processRecordingsForLead(targetLeadFromState, true, leadsToUpdateInDB); // Process and collect for DB save
            } else {
                console.warn(`[processPending Targeted] Lead ${targetLeadId} not found in window.leadsData. Checking window.pendingAudioRecordings...`);
                await processPendingAudioOnly(targetLeadId, true); // Process only pending, no DB save here
            }
        } else {
            // Global run
            console.log('[processPending Global] Fetching all leads from DB...');
            const allLeadsFromDB = await getAllLeadsFromDB();
            if (allLeadsFromDB && allLeadsFromDB.length > 0) {
                leadsToProcessFromDB = allLeadsFromDB;
                for (const lead of leadsToProcessFromDB) {
                    await processRecordingsForLead(lead, false, leadsToUpdateInDB);
                }
            }

            // Global run ALSO processes any remaining pendingAudioRecordings not tied to a DB lead yet
            console.log('[processPending Global] Checking all window.pendingAudioRecordings...');
            if (window.pendingAudioRecordings) {
                for (const leadIdStr in window.pendingAudioRecordings) {
                    if (window.pendingAudioRecordings.hasOwnProperty(leadIdStr)) {
                        // Check if this leadId was already processed from DB (if it got saved in interim)
                        const alreadyProcessedFromDB = leadsToUpdateInDB.some(l => l.leadId === leadIdStr) || 
                                                   (leadsToProcessFromDB && leadsToProcessFromDB.some(l => l.leadId === leadIdStr));
                        
                        if (!alreadyProcessedFromDB) {
                            console.log(`[processPending Global] Found pending recordings for new/unsaved lead ${leadIdStr}.`);
                            await processPendingAudioOnly(leadIdStr, false); // isTargeted = false
                        } else {
                            console.log(`[processPending Global] Pending recordings for ${leadIdStr} likely handled by DB processing. Skipping direct pending processing.`);
                        }
                    }
                }
            }
        }

        // Save all leads that were modified and need DB update
        if (leadsToUpdateInDB.length > 0) {
             console.log(`[processPending] Saving ${leadsToUpdateInDB.length} leads with updated transcriptions to DB...`);
             await Promise.all(leadsToUpdateInDB.map(l => saveLeadToDB(l)));
             console.log("[processPending] Finished saving updated leads to DB.");

             if (!isTargetedRun) { // Only refresh global state on global run DB saves
                 console.log("[processPending Global] Refreshing window.leadsData...");
                 window.leadsData = await getAllLeadsFromDB();
             }

             // UI update for current lead after global processing (if applicable)
             if (!isTargetedRun && currentLeadIdOnForm && notesTextarea) {
                 const currentLeadData = window.leadsData.find(l => l.leadId === currentLeadIdOnForm);
                 if (currentLeadData) {
                     notesTextarea.value = currentLeadData.notes || '';
                 }
             }
             const fichesModal = document.getElementById('fiches-modal');
             if (window.renderFiches && fichesModal && !fichesModal.classList.contains('hidden')) {
                window.renderFiches();
             }
        }
        // Toasts for success/error are now handled within processRecordingsForLead and processPendingAudioOnly

    } catch (error) {
        console.error(`[processPending] Error during main processing (Targeted: ${isTargetedRun}):`, error);
        showToast('Erreur', 'Erreur majeure lors du traitement des transcriptions.', 'error');
        processError = error; // Store error to potentially handle in finally
    } finally {
        window.isProcessingPending = false;
        console.log(`[processPending] Finished run. Targeted: ${isTargetedRun}`);
    }
};

// Refactored helper to process recordings for a single lead object (from DB or state)
async function processRecordingsForLead(lead, isTargeted, leadsToUpdateCollector) {
    const { showToast, base64ToBlob, transcribeAudio, notesTextarea, currentLeadId: currentLeadIdOnForm } = window;
    if (!lead.audioRecordings || !Array.isArray(lead.audioRecordings) || lead.audioRecordings.length === 0) {
        return; 
    }
    let leadModified = false;
    let successCount = 0;
    let errorCount = 0;
    for (const recording of lead.audioRecordings) {
        if (recording.needsTranscription === true) {
            console.log(`[processRecordingsForLead | ${isTargeted ? 'Targeted' : 'Global'}] Found recording for lead ${lead.leadId}:`, recording.timestamp);
      try {
                const audioBlob = await base64ToBlob(recording.data);
                if (!audioBlob) throw new Error("Failed to convert Base64 to Blob.");
                showToast('Synchronisation', `Transcription pour ${lead.leadId}...`, 'info', 2000);
        const transcription = await transcribeAudio(audioBlob);
                const transcriptionText = typeof transcription === 'string' ? transcription.trim() : '';
                lead.notes = (lead.notes ? lead.notes.trim() + '\n\n' : '') + transcriptionText;
                recording.needsTranscription = false;
                leadModified = true;
        successCount++;
                if (isTargeted && lead.leadId === currentLeadIdOnForm && notesTextarea) {
                    notesTextarea.value = lead.notes;
                }
      } catch (error) {
                console.error(`[processRecordingsForLead | ${isTargeted ? 'Targeted' : 'Global'}] Failed transcription for lead ${lead.leadId}, recording ${recording.timestamp}:`, error);
        errorCount++;
            }
        }
    }
    if (leadModified) {
        leadsToUpdateCollector.push(lead);
    }
    // Handle toasts
    if (successCount > 0) showToast('Succès', `${successCount} audio(s) pour ${lead.leadId} transcrits !`, 'success');
    if (errorCount > 0) showToast('Erreur', `${errorCount} transcription(s) pour ${lead.leadId} échouée(s).`, 'error');
}

// Refactored helper to process recordings from window.pendingAudioRecordings
async function processPendingAudioOnly(leadId, isTargeted) {
    const { showToast, base64ToBlob, transcribeAudio, notesTextarea, currentLeadId: currentLeadIdOnForm } = window;
    const pendingRecordings = window.pendingAudioRecordings ? window.pendingAudioRecordings[leadId] : null;
    if (!pendingRecordings || !Array.isArray(pendingRecordings) || pendingRecordings.length === 0) {
        return;
    }
    let successCount = 0;
    let errorCount = 0;
    for (const recording of pendingRecordings) {
        if (recording.needsTranscription === true) {
            console.log(`[processPendingAudioOnly | ${isTargeted ? 'Targeted' : 'Global'}] Found PENDING recording for lead ${leadId}:`, recording.timestamp);
            try {
                const audioBlob = await base64ToBlob(recording.data);
                if (!audioBlob) throw new Error("Failed to convert Base64 to Blob.");
                showToast('Synchronisation', `Transcription (nouvelle fiche) ${leadId}...`, 'info', 2000);
                const transcription = await transcribeAudio(audioBlob);
                const transcriptionText = typeof transcription === 'string' ? transcription.trim() : '';
                if (leadId === currentLeadIdOnForm && notesTextarea) {
                    notesTextarea.value = (notesTextarea.value ? notesTextarea.value.trim() + '\n\n' : '') + transcriptionText;
                }
                recording.needsTranscription = false;
                successCount++;
            } catch (error) {
                console.error(`[processPendingAudioOnly | ${isTargeted ? 'Targeted' : 'Global'}] Failed PENDING transcription for ${leadId}:`, error);
                errorCount++;
    }
        }
    }
    // Handle toasts
    if (successCount > 0) showToast('Succès', `${successCount} audio(s) pour nouvelle fiche ${leadId} transcrits !`, 'success');
    if (errorCount > 0) showToast('Erreur', `${errorCount} PENDING transcription(s) pour ${leadId} échouée(s).`, 'error');
}

// ------------- Salon Name Management -------------
const DEFAULT_SALON_NAME = "SIE-2025";
const SALON_NAME_STORAGE_KEY = 'salonName';
const PARTICIPANTS_STORAGE_KEY = 'salonParticipants';

/**
 * Loads the salon name from localStorage or uses the default.
 */
function loadSalonName() {
  const storedName = localStorage.getItem(SALON_NAME_STORAGE_KEY);
  window.salonName = storedName || DEFAULT_SALON_NAME;
  // Update input inside the modal as well
  const modalInputElement = document.getElementById('modal-salon-name-input');
  if (modalInputElement) {
    modalInputElement.value = window.salonName;
  }
}

/**
 * Loads participants from localStorage or returns defaults.
 * @returns {string[]} Array of participant names
 */
function loadParticipants() {
  try {
    const raw = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    }
  } catch (e) {
    console.warn('Failed to load participants, using defaults.', e);
  }
  // Defaults (existing hard-coded names)
  return [
    'Hugues Gaudreau',
    'Vincent Choucrallah'
  ];
}

/**
 * Saves participants to localStorage.
 * @param {string[]} participants
 */
function saveParticipants(participants) {
  try {
    const sanitized = participants
      .map(p => (typeof p === 'string' ? p.trim() : ''))
      .filter(p => p);
    localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save participants', e);
  }
}

/**
 * Saves the salon name to localStorage and updates the global variable.
 * @param {string} name The new salon name.
 */
function saveSalonName(name) {
  window.salonName = name.trim();
  localStorage.setItem(SALON_NAME_STORAGE_KEY, window.salonName);
  // No UI update needed here as the input triggers this
}

/**
 * Initializes salon name management: only loads name now.
 */
function initSalonName() {
    loadSalonName();
    // Listener is removed, will be added in app.js for modal buttons
}

// Call initialization function (ensure this runs after DOM is ready,
// perhaps by calling it within the DOMContentLoaded listener in app.js or similar)
// For now, just define it and expose it.

// ------------- End Salon Name Management -------------

// Expose functions globally
window.updateOnlineStatus = updateOnlineStatus;
window.initSalonName = initSalonName; // Expose initialization function
window.initDB = initDB; // Assuming initDB was meant to be exposed
window.loadParticipants = loadParticipants;
window.saveParticipants = saveParticipants;
// processPendingTranscriptions is already attached to window 
// Expose the flag
// window.isProcessingPending = false; // Added at the top
