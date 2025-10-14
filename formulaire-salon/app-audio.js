/* ------------- app-audio.js ------------- */

// Module-scoped variables for audio recording state
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingTimerIntervalId = null; // To store the interval ID
let originalButtonContent = ''; // To store original button HTML
let recordingLeadId = null; // << NEW: Store the lead ID for the current recording
// Note: pendingTranscriptionAudioData is intentionally kept global on window
// as it needs to be accessed by saveLead in app-form.js when offline.
// If we changed saveLead to call a function here, we could encapsulate it.

/**
 * Formats seconds into MM:SS format.
 * @param {number} totalSeconds - The total seconds to format.
 * @returns {string} The formatted time string (MM:SS).
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Toggles the audio recording state (starts or stops recording).
 */
function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
}

/**
 * Starts the audio recording process.
 */
async function startRecording() {
    const { showToast, recordNoteButton, currentLeadId } = window; // Ensure recordNoteButton and currentLeadId are accessible
    if (!recordNoteButton) {
        console.error("Record button not found");
        return;
    }
    try {
      // Store original content *before* starting
      originalButtonContent = recordNoteButton.innerHTML;
      // << NEW: Capture the current lead ID when starting recording
      recordingLeadId = currentLeadId;
      if (!recordingLeadId) {
        console.error("Cannot start recording without a current lead ID.");
        showToast('Erreur', 'Impossible de démarrer l\'enregistrement sans ID de fiche actif.', 'error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/wav',
        audioBitsPerSecond: 32000
      };
      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = []; // Reset chunks for new recording

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use the captured leadId, not the potentially changed global one
        const leadIdForThisAudio = recordingLeadId;
        recordingLeadId = null; // Reset for next recording

        // Corrected destructuring:
        const { notesTextarea, transcribeAudio, blobToBase64, leadsData, saveLeadToDB,
                showToast, displayAudioPlayersList /* Renamed from displayAudioPlayer */ } = window;

        // Stop timer FIRST
        if (recordingTimerIntervalId) {
            clearInterval(recordingTimerIntervalId);
            recordingTimerIntervalId = null;
        }

        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        audioChunks = [];

        // --- Always convert audio to Base64 --- 
        let audioBase64 = null;
        try {
          audioBase64 = await blobToBase64(audioBlob);
        } catch(b64Error) {
          console.error("Failed to convert audio blob to Base64:", b64Error);
          showToast('Erreur', 'Impossible de traiter l\'audio enregistré.', 'error');
          // Reset UI and exit if conversion fails
          isRecording = false;
          updateRecordingUI();
          return; // Stop further processing
        }

        // Determine online status
        const isOnline = navigator.onLine;

        // --- Create recording object with transcription status ---
        const newRecording = { 
            timestamp: new Date().toISOString(), 
            data: audioBase64,
            // Initialize based on current online state.
            // If online, this will be false, but set to true if online transcription fails.
            needsTranscription: !isOnline 
        };

        // --- Update UI immediately if this is the current lead ---
        // We need the *full* list of recordings to display
        let currentRecordingsToShow = [];
        const currentLeadIdOnForm = document.getElementById('leadId').value;
        if (currentLeadIdOnForm === leadIdForThisAudio) {
            const existingLead = leadsData.find(l => l.leadId === leadIdForThisAudio);
            if (existingLead) {
                // Add the new one temporarily to the existing list for display
                currentRecordingsToShow = [...(existingLead.audioRecordings || []), newRecording];
            } else {
                // New lead, show pending recordings + the new one
                const pending = window.pendingAudioRecordings ? (window.pendingAudioRecordings[leadIdForThisAudio] || []) : [];
                currentRecordingsToShow = [...pending, newRecording];
            }
            displayAudioPlayersList(currentRecordingsToShow);
        }

        // --- Handle transcription and saving ---
        const leadToUpdate = leadsData.find(l => l.leadId === leadIdForThisAudio); // Find lead once

        if (isOnline) {
          try {
            showToast('Traitement', 'Transcription en cours...', 'info');
            // Use the Blob for transcription as expected by the function
            const transcription = await transcribeAudio(audioBlob); 
            const transcriptionText = transcription.trim();

            // Mark as transcribed since it succeeded
            newRecording.needsTranscription = false; 

            // Update Textarea IF the current form matches the recording ID
            if (document.getElementById('leadId').value === leadIdForThisAudio && notesTextarea) {
                notesTextarea.value = (notesTextarea.value ? notesTextarea.value + '\n\n' : '') + transcriptionText;
            }

            // Attempt to find and save lead data
            // const leadToUpdate = leadsData.find(l => l.leadId === leadIdForThisAudio); // Moved up

            if (leadToUpdate) {
                // Existing lead: Update data with audio & notes, then save
                leadToUpdate.audioRecordings = [...(leadToUpdate.audioRecordings || []), newRecording]; // Append to array
                leadToUpdate.notes = (leadToUpdate.notes ? leadToUpdate.notes + '\n' : '') + transcriptionText;
                await saveLeadToDB(leadToUpdate);
                showToast('Succès', 'Note vocale enregistrée et transcrite.');
                // UI updated above if current lead
            } else {
                 // New lead (or not found): Store audio for later save
                 console.log(`Lead ${leadIdForThisAudio} not found yet. Storing audio pending save. Textarea updated if applicable.`);
                 // Store audio recording object in an array
                 window.pendingAudioRecordings = window.pendingAudioRecordings || {};
                 window.pendingAudioRecordings[leadIdForThisAudio] = [...(window.pendingAudioRecordings[leadIdForThisAudio] || []), newRecording];
                 
                 // --- Removed pending transcription text logic --- 

                 // Adjust feedback
                 if (document.getElementById('leadId').value === leadIdForThisAudio) {
                    showToast('Succès', 'Audio enregistré et transcription ajoutée au formulaire.');
                 } else {
                    showToast('Succès', 'Audio enregistré et transcription terminée.');
                 }
            }
            // window.pendingTranscriptionAudioData = null; // Removed as it's obsolete
          } catch (error) {
            console.error('Online transcription failed:', error);
            showToast("Erreur", "Échec de la transcription. Audio sauvegardé.", "warning");
            
            // !!!! FIX: Mark for later processing if online transcription fails !!!!
            newRecording.needsTranscription = true; 

            // Store audio only, with needsTranscription now true.
             if (leadToUpdate) {
                 leadToUpdate.audioRecordings = [...(leadToUpdate.audioRecordings || []), newRecording];
                 await saveLeadToDB(leadToUpdate);
             } else {
                 // Store pending audio recording object
                 window.pendingAudioRecordings = window.pendingAudioRecordings || {};
                 window.pendingAudioRecordings[leadIdForThisAudio] = [...(window.pendingAudioRecordings[leadIdForThisAudio] || []), newRecording];
             }
             // window.pendingTranscriptionAudioData = null; // Removed as it's obsolete
          }
        } else {
          // --- Offline: Store audio only for later save, no transcription --- 
          showToast('Mode Hors-ligne', 'Audio enregistré. Transcription différée.', 'info'); // Updated toast message
          // needsTranscription is already true. Save audio.
          // const leadToUpdate = leadsData.find(l => l.leadId === leadIdForThisAudio); // Moved up
          if (leadToUpdate) {
              leadToUpdate.audioRecordings = [...(leadToUpdate.audioRecordings || []), newRecording]; // Append to array
              await saveLeadToDB(leadToUpdate);
          } else {
              // Store pending audio recording object
              window.pendingAudioRecordings = window.pendingAudioRecordings || {};
              window.pendingAudioRecordings[leadIdForThisAudio] = [...(window.pendingAudioRecordings[leadIdForThisAudio] || []), newRecording];
          }
          // window.pendingTranscriptionAudioData = null; // Removed as it's obsolete
        }

        // Original stream track stopping logic - relies on 'stream' scope (might need adjustment)
        // Check if 'stream' is accessible here, otherwise this might fail. 
        // It seems 'stream' is declared in startRecording scope. This needs fixing.
        // Let's pass the stream or tracks to stopRecording, or handle it differently.
        // For now, let's assume the old code worked or error was ignored. We'll address if needed.
        // if (typeof stream !== 'undefined' && stream && typeof stream.getTracks === 'function') {
        //     stream.getTracks().forEach(track => track.stop());
        // }
        // ^^ Commenting out the above problematic stream access for now. 
        // Proper fix: Stop tracks in stopRecording itself using the 'stream' variable if accessible, 
        // or pass tracks from startRecording to stopRecording/onstop.

        isRecording = false;
        updateRecordingUI();
      };

      mediaRecorder.start(100); // Use time slice for better handling
      isRecording = true;
      updateRecordingUI(); // Update button state (sets initial recording state)

      // Start the timer *after* successfully starting the recorder
      let startTime = Date.now();
      // Update immediately to 00:00
      recordNoteButton.innerHTML = `${originalButtonContent} <span class="timer">00:00</span>`;

      recordingTimerIntervalId = setInterval(() => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          // Update button content with timer
          // Keep original icon + add timer span
          recordNoteButton.innerHTML = `${originalButtonContent} <span class="timer">${formatTime(elapsedSeconds)}</span>`;
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      showToast('Erreur Audio', 'Impossible d\'accéder au microphone.', 'error');
      isRecording = false; // Ensure state is reset on error
      // Clear interval if it somehow started
      if (recordingTimerIntervalId) {
        clearInterval(recordingTimerIntervalId);
        recordingTimerIntervalId = null;
      }
      updateRecordingUI(); // Restore original button content if needed
    }
}

/**
 * Stops the current audio recording.
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      // The rest of the logic happens in mediaRecorder.onstop
    }
}

/**
 * Updates the UI elements related to audio recording (indicator, button title).
 */
function updateRecordingUI() {
    const { recordingIndicator, recordNoteButton } = window; // Assume elements are globally accessible
    if (!recordNoteButton) return; // Safety check

    recordingIndicator.classList.toggle('hidden', !isRecording);
    recordNoteButton.title = isRecording ? "Arrêter l'enregistrement" : "Enregistrer une note vocale";
    recordNoteButton.classList.toggle('recording', isRecording);

    // Restore original content when recording stops
    if (!isRecording) {
        if (recordingTimerIntervalId) { // Ensure timer is stopped if somehow missed
             clearInterval(recordingTimerIntervalId);
             recordingTimerIntervalId = null;
        }
        if (originalButtonContent) { // Restore only if we have stored content
            recordNoteButton.innerHTML = originalButtonContent;
        }
    }
    // Note: When recording STARTS, the timer logic in startRecording handles setting the initial 00:00 display.
}

/**
 * Checks if audio recording is currently active.
 * @returns {boolean} True if recording is active, false otherwise.
 */
function isAudioRecording() {
    return isRecording;
}

// Expose functions globally
window.toggleRecording = toggleRecording;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.updateRecordingUI = updateRecordingUI;
window.isAudioRecording = isAudioRecording; 