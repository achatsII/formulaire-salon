/* ------------- app-form.js ------------- */

/**
 * Initializes or resets the lead form to its default state.
 */
function initForm() {
    const { leadForm, nomDecideurGroup, leadTypeButtons, leadTypeInput,
            decisionButtons, decideurInput, sentimentButtons, interetClientInput,
            interetIIInput, generateId, vendeurInput,
            /* Add audio functions */ isAudioRecording, stopRecording, displayAudioPlayersList } = window;

    // Stop recording if it's active when resetting the form
    if (isAudioRecording && isAudioRecording()) {
      stopRecording();
    }

    // Reset form state variables (assuming these are globally managed or accessible)
    window.currentLeadId = generateId();
    document.getElementById('leadId').value = window.currentLeadId;
    leadForm.reset();

    nomDecideurGroup.classList.add('hidden');
    leadTypeButtons.forEach(b => b.classList.remove('selected'));
    leadTypeInput.value = '';
    decisionButtons.forEach(b => b.classList.remove('selected'));
    decideurInput.value = '';
    sentimentButtons.forEach(b => b.classList.remove('selected'));
    interetClientInput.value = '';
    interetIIInput.value = '';

    // Reset vendor selection
    const vendeurButtonsContainer = document.querySelector('.vendeur-buttons');
    if (vendeurButtonsContainer) {
        vendeurButtonsContainer.querySelectorAll('.vendeur-button').forEach(b => b.classList.remove('selected'));
    }
    vendeurInput.value = '';

    window.currentStep = 0;
    window.visitedSteps = [0];
    window.isEditing = false;

    // Assuming showStep and updateSidebarItems are globally available after this script loads
    showStep(window.currentStep);
    updateSidebarItems();
    displayAudioPlayersList([]); // Hide player list on init/reset

    // Ensure contact save button is disabled for new form
    if (window.updateContactSaveButtonState) {
        window.updateContactSaveButtonState();
    }
}

/**
 * Displays the specified step in the form.
 * @param {number} idx - The index of the step to show.
 */
function showStep(idx) {
    const { formSteps, formSidebarItems,
            /* Add audio functions */ isAudioRecording, stopRecording } = window;

    // --- Stop recording logic ---
    // Check if recording is active AND the step we are moving TO is NOT the Notes step (now index 5)
    if (isAudioRecording && isAudioRecording() && idx !== 5) {
      stopRecording();
    }
    // --- End stop recording logic ---

    formSteps.forEach((step, i) => step.classList.toggle('hidden', i !== idx));
    formSidebarItems.forEach((it, i) => it.classList.toggle('active', i === idx));
    if (!window.visitedSteps.includes(idx)) window.visitedSteps.push(idx);
    updateSidebarItems(); // Assumes updateSidebarItems is globally available
}

/**
 * Updates the visual state of the sidebar items (visited, active).
 */
function updateSidebarItems() {
    const { formSidebarItems } = window;
    formSidebarItems.forEach((it, i) => it.classList.toggle('visited', window.visitedSteps.includes(i)));
    // Active state is handled within showStep
}

/**
 * Validates the required fields in the current step.
 * @param {number} idx - The index of the step to validate.
 * @returns {boolean} True if the step is valid, false otherwise.
 */
function validateStep(idx) {
    const { formSteps, showToast } = window;
    const step = formSteps[idx];
    const required = step.querySelectorAll('[required]');
    for (let input of required) {
      if (!input.value.trim()) {
        showToast('Champ requis', 'Veuillez remplir tous les champs obligatoires.', 'error');
        input.focus(); return false;
      }
      if (input.type === 'email' &&
        !/^\S+@\S+\.\S+$/.test(input.value.trim())) {
        showToast('Format invalide', "Veuillez entrer une adresse courriel valide.", "error");
        input.focus(); return false;
      }
    }
    return true;
}

/**
 * Moves to the next step in the form sequence.
 */
function goToNextStep() {
    const { formSteps } = window;
    if (window.currentStep < formSteps.length - 1) {
        window.currentStep++;
        showStep(window.currentStep); // Assumes showStep is globally available
    }
}

/**
 * Updates the email input based on first and last names if the email field is empty.
 */
function updateEmail() {
    const { prenomInput, nomInput, emailInput } = window;
    const p = prenomInput.value.trim().toLowerCase();
    const n = nomInput.value.trim().toLowerCase();
    if (p && n && !emailInput.value) {
      const np = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nn = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      emailInput.value = `${np}.${nn}@`;
    }
}

/**
 * Saves the current lead data to the database.
 */
async function saveLead() {
    const { leadForm, emailInput, showToast, saveLeadToDB, leadsData, isEditing, initForm,
            pendingTranscriptionAudioData, isAudioRecording, stopRecording,
            vendeurInput } = window;

    // Stop recording if it's active
    if (isAudioRecording && isAudioRecording()) {
      stopRecording();
      // Optional: Add a small delay to ensure recording stops fully before proceeding?
      // await new Promise(resolve => setTimeout(resolve, 100)); // e.g., 100ms delay
    }

    if (!emailInput.value.trim()) {
      showToast('Champ requis', 'Veuillez remplir le champ email.', 'error');
      // Assuming currentStep and showStep are globally managed
      if (window.currentStep !== 2) { window.currentStep = 2; showStep(window.currentStep); }
      emailInput.focus(); return;
    }

    const data = Object.fromEntries(new FormData(leadForm).entries());
    data.timestamp = new Date().toISOString();
    data.isComplete = !!data.email.trim();
    if (data.decideur === 'Oui') data.nomDecideur = '';
    // Add the current salon name to the lead data
    data.salonName = window.salonName || ''; // Use global salonName at the time of saving
    // Add the selected vendor
    data.vendeur = vendeurInput.value; // Read from the hidden input
    // Unformat phone number before saving
    if (data.telephone && window.unformatPhoneNumber) {
        data.telephone = window.unformatPhoneNumber(data.telephone);
    }
    // Initialize audio field as array - This will be on the 'data' object from the form
    // data.audioRecordings = data.audioRecordings || []; 
    // Let's refine this: we need to preserve existing recordings if editing.

    // Remove legacy pending audio data
    if (window.pendingTranscriptionAudioData) {
        console.warn('Clearing legacy pendingTranscriptionAudioData during save.');
        window.pendingTranscriptionAudioData = null;
    }

    try {
      // If editing, preserve existing audioRecordings from the currently loaded lead data
      // before merging with form data.
      let leadToSave = { ...data }; // Start with form data

      if (isEditing) {
        const existingLeadInState = leadsData.find(l => l.leadId === data.leadId);
        if (existingLeadInState && existingLeadInState.audioRecordings) {
          // Ensure audioRecordings is an array on leadToSave before spreading
          leadToSave.audioRecordings = [...(existingLeadInState.audioRecordings || [])]; 
        } else {
          leadToSave.audioRecordings = []; // Initialize if not present in existing state
        }
      } else {
        // For new leads, initialize audioRecordings (it might have been set if an audio was recorded before first save)
        leadToSave.audioRecordings = data.audioRecordings || []; 
      }
      
      // At this point, leadToSave.audioRecordings contains audios from the form (if any) 
      // or existing audios (if editing and they existed). 
      // Pending audios will be merged later.

      await saveLeadToDB(leadToSave); // Save the potentially merged object
      
      // After successful save, update the local leadsData array
      const idx = leadsData.findIndex(l => l.leadId === leadToSave.leadId);
      if (idx !== -1) {
        leadsData[idx] = { ...leadToSave }; // Update existing with the version saved to DB
      } else {
        leadsData.push({ ...leadToSave }); // Add new with the version saved to DB
      }

      // --- Check and apply pending AUDIO RECORDINGS (Array) ---
      // Use the reference from leadsData which should now be the most up-to-date
      let leadInStateAfterSave = leadsData.find(l => l.leadId === leadToSave.leadId);
      
      if (window.pendingAudioRecordings && window.pendingAudioRecordings[leadToSave.leadId]) {
          const pendingRecordings = window.pendingAudioRecordings[leadToSave.leadId];
          console.log(`Applying ${pendingRecordings.length} pending audio recordings for lead ${leadToSave.leadId}`);
          
          if (leadInStateAfterSave) {
              // Ensure audioRecordings is an array before spreading
              const existingRecordingsInState = Array.isArray(leadInStateAfterSave.audioRecordings) ? leadInStateAfterSave.audioRecordings : [];
              leadInStateAfterSave.audioRecordings = [...existingRecordingsInState, ...pendingRecordings];
              
              try {
                  await saveLeadToDB(leadInStateAfterSave); // Save again with pending audios merged
                  console.log(`Successfully saved pending audio recordings for lead ${leadInStateAfterSave.leadId}`);
                  // Update leadsData again with the final final version
                  const finalIdx = leadsData.findIndex(l => l.leadId === leadInStateAfterSave.leadId);
                  if (finalIdx !== -1) leadsData[finalIdx] = { ...leadInStateAfterSave };

                  delete window.pendingAudioRecordings[leadToSave.leadId]; // Clear pending only on success
                  // audioApplied = true; // Not strictly needed anymore for logic
              } catch (dbError) {
                  console.error(`Failed to save pending audio recordings for lead ${leadInStateAfterSave.leadId}:`, dbError);
                  showToast('Erreur', 'Impossible d\'enregistrer les audios en attente.', 'error');
              }
          } else {
               console.error(`Could not find lead ${leadToSave.leadId} in leadsData after saving?!`);
          }
      }

      // --- Check and apply pending transcription (REMOVED) ---
      /*
      // Refresh reference in case audio save updated it
      savedLead = leadsData.find(l => l.leadId === data.leadId);
      if (savedLead && window.pendingTranscriptions && window.pendingTranscriptions[data.leadId]) {
        console.log(`Applying pending transcription for lead ${data.leadId}`);
        const pendingText = window.pendingTranscriptions[data.leadId];
        savedLead.notes = (savedLead.notes ? savedLead.notes + '\n\n' : '') + pendingText;
        try {
          await saveLeadToDB(savedLead);
          console.log(`Successfully saved pending transcription for lead ${data.leadId}`);
          if (document.getElementById('leadId').value === data.leadId) {
              window.notesTextarea.value = savedLead.notes;
          }
          delete window.pendingTranscriptions[data.leadId]; // Clear pending transcription on success
        } catch (dbError) {
          console.error(`Failed to save pending transcription for lead ${data.leadId}:`, dbError);
          showToast('Erreur', 'Impossible d\'enregistrer la transcription en attente.', 'error');
        }
      } else if (window.pendingTranscriptions && window.pendingTranscriptions[data.leadId]){
         console.log(`No pending transcription found for lead ${data.leadId} or lead missing`);
      }
      */
      // --- End pending checks ---

      showToast('Succès', isEditing ? 'Fiche mise à jour avec succès !' : 'Nouvelle fiche ajoutée !');
      initForm(); // Reset form
    } catch (error) {
      console.error('Failed to save lead to DB:', error);
      showToast('Erreur', 'La sauvegarde de la fiche a échoué.', 'error');
    }
}

/**
 * Populates the form with data from an existing lead for editing.
 * @param {string} leadId The ID of the lead to edit.
 */
function editLead(leadId) {
    const { leadForm, leadsData, showToast, fichesModal, showStep,
            updateSidebarItems, nomDecideurGroup, leadTypeButtons,
            decisionButtons, sentimentButtons, vendeurInput,
            displayAudioPlayersList, formatPhoneNumber, updateContactSaveButtonState } = window;

    const lead = leadsData.find(l => l.leadId === leadId);
    if (!lead) {
      showToast('Erreur', 'Impossible de trouver la fiche à éditer.', 'error');
      return;
    }

    console.log("Editing lead:", lead);
    console.log("Audio recordings found in lead object:", lead.audioRecordings);

    // Stop any active recording before loading
    if (window.isAudioRecording && window.isAudioRecording()) {
        window.stopRecording();
    }

    window.currentLeadId = leadId;
    window.isEditing = true;
    leadForm.reset(); // Clear previous state

    // Populate form fields
    for (const key in lead) {
        if (lead.hasOwnProperty(key)) {
            const element = leadForm.elements[key];
            if (element) {
                // Handle radio/button groups separately if needed
                if (key === 'leadType' || key === 'decideur' || key === 'interetClient' || key === 'interetII' || key === 'vendeur') {
                   // Skip for now, handled below
                } else if (element.type === 'checkbox') {
                    element.checked = !!lead[key];
                } else if (key === 'telephone' && formatPhoneNumber) {
                    // Format phone number for display
                    element.value = formatPhoneNumber(lead[key] || '');
                } else {
                    element.value = lead[key] || '';
                }
            }
        }
    }

    // --- Set button/radio states ---
    // Vendeur
    const vendeurButtonsContainer = document.querySelector('.vendeur-buttons');
    if (vendeurButtonsContainer) {
        vendeurButtonsContainer.querySelectorAll('.vendeur-button').forEach(btn => {
            const nameEl = btn.querySelector('.vendeur-name');
            const btnName = nameEl ? nameEl.textContent.trim() : btn.dataset.value;
            const isSelected = btnName === lead.vendeur;
            btn.classList.toggle('selected', isSelected);
            if (isSelected) vendeurInput.value = lead.vendeur;
        });
    }

    // Lead Type
    leadTypeButtons.forEach(btn => {
        const isSelected = btn.dataset.value === lead.leadType;
        btn.classList.toggle('selected', isSelected);
        if (isSelected) leadForm.elements.leadType.value = lead.leadType;
    });

    // Décideur
    decisionButtons.forEach(btn => {
        const isSelected = btn.dataset.value === lead.decideur;
        btn.classList.toggle('selected', isSelected);
        if (isSelected) leadForm.elements.decideur.value = lead.decideur;
    });
    nomDecideurGroup.classList.toggle('hidden', lead.decideur !== 'Non');

    // Sentiment Buttons
    sentimentButtons.forEach(btn => {
        const group = btn.parentElement.dataset.group;
        const value = btn.dataset.value;
        let isSelected = false;
        if (group === 'interetClient' && value === lead.interetClient) {
            isSelected = true;
            leadForm.elements.interetClient.value = value;
        }
        else if (group === 'interetII' && value === lead.interetII) {
            isSelected = true;
            leadForm.elements.interetII.value = value;
        }
        btn.classList.toggle('selected', isSelected);
    });

    // Set state and UI
    window.visitedSteps = [0, 1, 2, 3, 4, 5]; // Assume all steps are visitable when editing
    window.currentStep = 1; // Start editing from step 1 (Type de Lead)
    showStep(window.currentStep);
    updateSidebarItems();
    displayAudioPlayersList(lead.audioRecordings || []); // Use new function and pass array
    fichesModal.classList.add('hidden'); // Close the list modal

    showToast('Mode Édition', `Modification de la fiche ${lead.prenom || ''} ${lead.nom || ''}.`, 'info');

    // Trigger email validation check AFTER populating the form
    if (updateContactSaveButtonState) {
        updateContactSaveButtonState();
    }
}

/**
 * Displays a list of audio players based on the provided recordings array.
 * Manages the visibility of the parent <details> element.
 * @param {Array<{timestamp: string, data: string}>} recordingsArray An array of recording objects.
 */
function displayAudioPlayersList(recordingsArray) {
    // Get the details element and the container *inside* it
    const detailsElement = document.getElementById('audio-players-details');
    const container = document.getElementById('audio-player-container');

    if (!detailsElement || !container) {
        console.error("Audio player details or container element not found.");
        return;
    }

    container.innerHTML = ''; // Clear previous players within the container

    if (Array.isArray(recordingsArray) && recordingsArray.length > 0) {
        let validRecordingsFound = false; // Flag to check if we actually add any players
        console.log(`Processing ${recordingsArray.length} audio recordings for display.`);
        recordingsArray.forEach((recording, index) => {
            if (recording && typeof recording.data === 'string' && recording.data.startsWith('data:audio/')) {
                try {
                    const playerWrapper = document.createElement('div');
                    playerWrapper.style.marginBottom = '10px';

                    const label = document.createElement('div');
                    label.textContent = `Enregistrement ${index + 1}`;
                    if (recording.timestamp) {
                         try { label.textContent += ` (${new Date(recording.timestamp).toLocaleString()})`; } catch (e) {/* Ignore date parsing error */}                    }
                    label.style.fontSize = '0.9em';
                    label.style.color = 'var(--text-light)';
                    label.style.marginBottom = '5px';
                    playerWrapper.appendChild(label);

                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = recording.data;
                    playerWrapper.appendChild(audio);

                    container.appendChild(playerWrapper);
                    validRecordingsFound = true; // Mark that we added at least one player
                } catch (e) {
                    console.error(`Error creating audio element for recording ${index}:`, e);
                }
            } else {
                 console.warn(`Skipping invalid recording object at index ${index}:`, recording);
            }
        });

        // Show the <details> element only if valid players were added
        if (validRecordingsFound) {
            console.log(`Displaying audio player section.`);
            detailsElement.classList.remove('hidden');
            // Ensure it's closed by default when repopulating (unless we want it open)
            detailsElement.open = false; 
        } else {
            console.log("Hiding audio player section (no valid players found).");
            detailsElement.classList.add('hidden');
        }

    } else {
        // Hide the <details> element if the initial array is empty
        detailsElement.classList.add('hidden');
        console.log("Audio player section hidden (no recordings array provided).");
    }
}

// Expose functions globally if needed by other scripts or app.js
window.initForm = initForm;
window.showStep = showStep;
window.updateSidebarItems = updateSidebarItems;
window.validateStep = validateStep;
window.goToNextStep = goToNextStep;
window.updateEmail = updateEmail;
window.saveLead = saveLead;
window.editLead = editLead;
window.displayAudioPlayersList = displayAudioPlayersList; // Ensure it's exposed 