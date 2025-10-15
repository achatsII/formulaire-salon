/* ------------- app.js ------------- */
document.addEventListener('DOMContentLoaded', () => {

  // Destructure elements, state, and utility functions from window
  const {
    // Elements
    leadForm, viewFichesButton, fichesModal, closeFichesModal,
    importExportButton, importExportModal, closeImportExportModal,
    formSteps, formSidebarItems, nextButtons, nextButtonsSimple,
    cancelButton, leadTypeButtons, leadTypeInput,
    recordNoteButton, notesTextarea, recordingIndicator,
    decisionButtons, sentimentButtons, decideurInput, nomDecideurGroup, nomDecideurInput,
    saveButton, saveButtonQualification, saveButtonNotes,
    clearInputButtons, modalTabs, modalTabContents,
    confirmDeleteModal, closeDeleteModalButton, cancelDeleteButton,
    confirmDeleteButton,
    fichesGridAll, fichesGridIncomplete, emptyFiches, emptyIncompleteFiches,
    exportAllFichesButton, exportSelectedFichesButton, clearSelectionButton, exportAllButton,
    importButton, importFileInput, offlineIndicator,
    prenomInput, nomInput, emailInput,
    settingsButton, settingsModal, modalSalonNameInput, closeSettingsModalButton, saveSettingsButton, cancelSettingsButton,
    participantsList, newParticipantNameInput, addParticipantButton,

    // Utils (assuming these are attached to window by utils.js)
    generateId, formatDate, showToast,
    downloadFile, parseCSV,
    getAllLeadsFromDB, saveLeadToDB, deleteLeadFromDB,
    transcribeAudio, blobToBase64, base64ToBlob,

    // Functions from app-init.js (attached to window)
    // initDB, updateOnlineStatus, processPendingTranscriptions,

    // Functions from app-form.js (attached to window)
    // initForm, showStep, updateSidebarItems, validateStep, goToNextStep,
    // updateEmail, saveLead,

    // Functions from app-fiches.js (attached to window)
    // renderFiches, editLead, closeDeleteModal, exportAllLeads, exportToCSV,
    // exportToJSON, updateExportSelectedButton,

    // Functions from app-audio.js (attached to window)
    // toggleRecording,

    // New elements for vendor selection
    vendeurButtons, vendeurInput,

    telephoneInput, // Added telephone input

    // Fullscreen toggle button
    fullscreenToggleButton,

  } = window;

  // Access functions directly from window where needed, e.g., window.initDB()
  // Access state variables directly from window, e.g., window.currentStep

  /* ---------- 1. Initialisation IndexedDB et chargement des données ---------- */
  window.initDB().then(() => { // Call function from window
    return getAllLeadsFromDB();
  }).then(savedLeadsFromDB => {
    window.leadsData = savedLeadsFromDB;
    console.log('Leads loaded from IndexedDB:', window.leadsData);
  }).catch(error => {
    console.error('Error initializing DB or fetching leads:', error);
    showToast('Erreur', 'Impossible de charger les fiches depuis IndexedDB.', 'error');
    window.leadsData = [];
  }).finally(() => {
    /* ---------- 2. État online/offline ---------- */
    window.addEventListener('online', window.updateOnlineStatus); // Call function from window
    window.addEventListener('offline', window.updateOnlineStatus); // Call function from window
    window.updateOnlineStatus(); // Initial check

    /* ---------- Initialize Salon Name Management ---------- */
    if (window.initSalonName) {
        window.initSalonName(); // Load salon name and set listener
    } else {
        console.error("initSalonName function not found.");
    }

    /* ---------- 3. Initialisation du formulaire ---------- */
    window.initForm(); // Call function from window

    /* ---------- 4. Attacher les Event Listeners ---------- */

    // --- Settings Modal Listeners ---
    if (settingsButton && settingsModal && modalSalonNameInput && closeSettingsModalButton && saveSettingsButton && cancelSettingsButton) {
        // Open Modal
        settingsButton.addEventListener('click', () => {
            // Ensure the input reflects the current global state when opening
            modalSalonNameInput.value = window.salonName || '';
            // Render participants when opening
            if (participantsList && window.loadParticipants) {
                const participants = window.loadParticipants();
                participantsList.innerHTML = participants.map((participant, idx) => {
                  const name = typeof participant === 'string' ? participant : participant.name;
                  return `
                    <div class="participant-row" data-index="${idx}">
                      <input type="text" class="participant-name-input" value="${name}">
                      <button type="button" class="remove-participant">Supprimer</button>
                    </div>
                  `;
                }).join('');
            }
            settingsModal.classList.remove('hidden');
        });

        // Close Modal (X button)
        closeSettingsModalButton.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Close Modal (Cancel button)
        cancelSettingsButton.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Save Settings
        saveSettingsButton.addEventListener('click', () => {
            const newName = modalSalonNameInput.value;
            if (window.saveSalonName) { // Check if function exists
                window.saveSalonName(newName);
                showToast('Succès', 'Nom du salon sauvegardé !', 'success');
            } else {
                console.error("saveSalonName function not found.");
                showToast('Erreur', 'Impossible de sauvegarder le nom du salon.', 'error');
            }

            // Save participants
            if (participantsList && window.saveParticipants) {
                const rows = participantsList.querySelectorAll('.participant-row');
                const updated = Array.from(rows).map(row => {
                  const nameInput = row.querySelector('.participant-name-input');
                  const name = nameInput ? nameInput.value.trim() : '';
                  // Image will be automatically generated based on first name
                  const image = name ? window.getDefaultImageForParticipant(name) : null;
                  return { name, image };
                }).filter(p => p.name);
                window.saveParticipants(updated);
                // Re-render vendor buttons after save
                if (window.renderVendeurButtons) {
                    window.renderVendeurButtons();
                }
            }
            settingsModal.classList.add('hidden');
        });
    } else {
        console.warn("One or more settings modal elements not found. Settings functionality disabled.");
    }
    // --- End Settings Modal Listeners ---

    // --- Initial render of vendor buttons from participants ---
    if (window.renderVendeurButtons) {
        window.renderVendeurButtons();
    }

    // Form Navigation Listeners
    nextButtons.forEach(btn => btn.addEventListener('click', () => {
      if (window.validateStep(window.currentStep)) window.goToNextStep(); // Call functions from window
    }));
    nextButtonsSimple.forEach(btn => btn.addEventListener('click', window.goToNextStep)); // Call function from window

    formSidebarItems.forEach((item, idx) => item.addEventListener('click', () => {
      if (window.visitedSteps.includes(1) || idx <= 1) {
          window.currentStep = idx;
          window.showStep(idx); // Call function from window
      } else {
          showToast('Navigation', 'Veuillez d\'abord remplir le type de lead et les informations de contact.', 'warning');
      }
    }));

    cancelButton.addEventListener('click', () => {
      const hasData = Array.from(leadForm.elements).some(el => {
        if (el.type === 'radio' || el.type === 'checkbox') return el.checked;
        if (['hidden', 'submit', 'button'].includes(el.type)) return false;
        return el.value && el.value.trim() !== '';
      });
      if (hasData && !window.isEditing) {
        if (confirm('Êtes-vous sûr de vouloir annuler ? Les données saisies seront perdues.'))
          window.initForm(); // Call function from window
      } else {
        window.initForm(); // Call function from window
      }
    });

    // Form Input Listeners
    // --- Vendeur Selection with Event Delegation ---
    const vendeurButtonsContainer = document.querySelector('.vendeur-buttons');
    if (vendeurButtonsContainer && vendeurInput) {
        vendeurButtonsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.vendeur-button');
            if (!btn) return;
            const nameEl = btn.querySelector('.vendeur-name');
            const vendeurName = nameEl ? nameEl.textContent.trim() : btn.dataset.value;
            if (!vendeurName) return;
            vendeurInput.value = vendeurName;
            vendeurButtonsContainer.querySelectorAll('.vendeur-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            setTimeout(window.goToNextStep, 300);
        });
    } else {
        console.warn('Vendor buttons container not found.');
    }
    // --- End Vendeur Selection ---

    // Participants add/remove handlers
    if (participantsList) {
        participantsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-participant')) {
                const row = e.target.closest('.participant-row');
                if (!row) return;
                row.remove();
            }
        });
    }
    if (addParticipantButton && newParticipantNameInput && participantsList) {
        addParticipantButton.addEventListener('click', () => {
            const name = newParticipantNameInput.value.trim();
            if (!name) return;
            const idx = participantsList.querySelectorAll('.participant-row').length;
            const row = document.createElement('div');
            row.className = 'participant-row';
            row.dataset.index = String(idx);
            row.innerHTML = `
              <input type="text" class="participant-name-input" value="${name}">
              <button type="button" class="remove-participant">Supprimer</button>
            `;
            participantsList.appendChild(row);
            newParticipantNameInput.value = '';
        });
    }

    leadTypeButtons.forEach(btn => btn.addEventListener('click', () => {
      leadTypeButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      leadTypeInput.value = btn.dataset.value;
      setTimeout(window.goToNextStep, 300); // Call function from window
    }));

    clearInputButtons.forEach(btn => btn.addEventListener('click', () => {
      const inputId = btn.dataset.for;
      const inputElement = document.getElementById(inputId);
      if (inputElement) {
          inputElement.value = '';
          inputElement.focus();
      }
    }));

    prenomInput.addEventListener('blur', window.updateEmail); // Call function from window
    nomInput.addEventListener('blur', window.updateEmail); // Call function from window

    // --- Phone Number Formatting Listener ---
    if (telephoneInput && window.formatPhoneNumber) {
      telephoneInput.addEventListener('input', (e) => {
        // Format the phone number as the user types
        const formattedNumber = window.formatPhoneNumber(e.target.value);
        // Update the input value. Cursor position handling might be needed for complex cases,
        // but for this format, it often works acceptably well.
        e.target.value = formattedNumber;
      });
    } else {
        console.warn("Telephone input or formatting function not found. Formatting disabled.");
    }
    // --- End Phone Number Formatting ---

    // --- Contact Step Save Button Logic ---
    
    // Define the validation/toggle function globally
    window.updateContactSaveButtonState = () => {
      const emailInput = window.emailInput;
      const saveButton = window.saveButtonContact;
      if (emailInput && saveButton && window.isValidEmail) {
          const isValid = window.isValidEmail(emailInput.value);
          saveButton.disabled = !isValid;
      } else {
          // Ensure button is disabled if elements or function are missing
          if (saveButton) saveButton.disabled = true;
      }
    };

    // Add listener to email input to call the global function
    if (window.emailInput) {
        window.emailInput.addEventListener('input', window.updateContactSaveButtonState);
    } else {
        console.warn("Email input element not found for adding validation listener.");
    }

    // Add click listener to the save button itself
    if (window.saveButtonContact) {
        window.saveButtonContact.addEventListener('click', async () => { 
            try {
              await window.saveLead(); 
              window.initForm(); 
            } catch (error) {
              console.error("Error during saveLead called from contact save button:", error);
            }
        });
    } else {
        console.warn("Contact save button not found for adding click listener.");
    }

    // Initial check is now handled by initForm/editLead calls
    // --- End Contact Step Save Button Logic ---

    decisionButtons.forEach(btn => btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        decideurInput.value = value;
        btn.parentElement.querySelectorAll('.decision-button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        nomDecideurGroup.classList.toggle('hidden', value !== 'Non');
        if (value === 'Oui') {
            nomDecideurInput.value = '';
        }
    }));

    sentimentButtons.forEach(btn => btn.addEventListener('click', () => {
      const group = btn.parentElement.dataset.group;
      const value = btn.dataset.value;
      let targetInput;
      if (group === 'interetClient') targetInput = interetClientInput;
      else if (group === 'interetII') targetInput = interetIIInput;

      if(targetInput) targetInput.value = value;

      btn.parentElement.querySelectorAll('.sentiment-button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }));

    // Modal Listeners
    modalTabs.forEach(tab => tab.addEventListener('click', () => {
        // Find the closest modal parent of the clicked tab
        const clickedModal = tab.closest('.modal-backdrop');
        if (!clickedModal) return; // Exit if the tab is not inside a modal backdrop

        const targetId = tab.dataset.tab;
        if (!targetId) return; // Exit if the tab doesn't have a target

        // Select tabs and content ONLY within the clicked modal
        const currentModalTabs = clickedModal.querySelectorAll('.modal-tab');
        const currentModalContents = clickedModal.querySelectorAll('.modal-tab-content');

        // Remove active only from siblings within the same modal
        currentModalTabs.forEach(t => t.classList.remove('active'));
        currentModalContents.forEach(c => c.classList.remove('active'));

        // Activate the clicked tab and its content
        tab.classList.add('active');
        const targetContent = document.getElementById(targetId); // Use getElementById is fine as IDs should be unique
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Re-render fiches with current search term when switching tabs in fiches modal
        if (clickedModal.id === 'fiches-modal') {
            const searchInput = document.getElementById('search-fiches');
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            window.renderFiches(window.leadsData, searchTerm);
        }
    }));

    viewFichesButton.addEventListener('click', () => {
      // Explicitly set the "All Fiches" tab as active
      const allFichesTabId = 'all-fiches'; // CORRECT ID of the content pane for all fiches
      const allFichesTabSelector = `[data-tab="${allFichesTabId}"]`; // CORRECT selector using the ID

      // Select tabs and content specific to the fiches modal
      const modalSpecificTabs = fichesModal.querySelectorAll('.modal-tab');
      const modalSpecificContents = fichesModal.querySelectorAll('.modal-tab-content');

      modalSpecificTabs.forEach(t => t.classList.remove('active'));
      modalSpecificContents.forEach(c => c.classList.remove('active'));

      const allFichesTabElement = fichesModal.querySelector(allFichesTabSelector);
      const allFichesContentElement = document.getElementById(allFichesTabId); // CORRECT ID is unique, no need to scope

      if (allFichesTabElement) allFichesTabElement.classList.add('active');
      else console.warn('Could not find the "All Fiches" tab element.');
      
      if (allFichesContentElement) allFichesContentElement.classList.add('active');
      else console.warn('Could not find the "All Fiches" content element.');

      // Clear search field when opening modal
      const searchInput = document.getElementById('search-fiches');
      if (searchInput) {
        searchInput.value = '';
      }

      // Render ALL leads initially for the "All Fiches" tab
      window.renderFiches(window.leadsData); // Pass the full list, renderFiches handles internal display logic
      
      fichesModal.classList.remove('hidden'); // Show modal after setting tab and rendering
    });
    closeFichesModal.addEventListener('click', () => fichesModal.classList.add('hidden'));

    // Search functionality for fiches
    const searchFichesInput = document.getElementById('search-fiches');
    const searchFichesButton = document.querySelector('.modal-search-button');
    
    if (searchFichesInput) {
      // Search on input change (real-time search)
      searchFichesInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        window.renderFiches(window.leadsData, searchTerm);
        
        // Show/hide clear button based on input content
        const clearButton = document.querySelector('.search-clear-button');
        if (clearButton) {
          clearButton.style.display = searchTerm ? 'block' : 'none';
        }
      });
      
      // Search on Enter key
      searchFichesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const searchTerm = e.target.value.trim();
          window.renderFiches(window.leadsData, searchTerm);
        }
      });
    }
    
    if (searchFichesButton) {
      // Search on button click
      searchFichesButton.addEventListener('click', () => {
        const searchTerm = searchFichesInput ? searchFichesInput.value.trim() : '';
        window.renderFiches(window.leadsData, searchTerm);
      });
    }
    
    // Clear search functionality
    const clearSearchButton = document.querySelector('.search-clear-button');
    if (clearSearchButton) {
      clearSearchButton.addEventListener('click', () => {
        if (searchFichesInput) {
          searchFichesInput.value = '';
          clearSearchButton.style.display = 'none';
          window.renderFiches(window.leadsData, '');
        }
      });
    }

    importExportButton.addEventListener('click', () => {
        // Ensure the 'Export' tab is active by default
        const exportTabId = 'export-tab'; // Assuming this is the ID of the content pane
        const exportTabSelector = `[data-tab="${exportTabId}"]`;

        // Select tabs and content specific to the import/export modal
        const modalSpecificTabs = importExportModal.querySelectorAll('.modal-tab');
        const modalSpecificContents = importExportModal.querySelectorAll('.modal-tab-content');

        modalSpecificTabs.forEach(t => t.classList.remove('active'));
        modalSpecificContents.forEach(c => c.classList.remove('active'));

        const exportTabElement = importExportModal.querySelector(exportTabSelector); // Scope to modal
        const exportContentElement = document.getElementById(exportTabId); // ID is unique

        if (exportTabElement) exportTabElement.classList.add('active');
        else console.warn("Could not find export tab element within importExportModal");

        if (exportContentElement) exportContentElement.classList.add('active');
        else console.warn("Could not find export content element");
        
        importExportModal.classList.remove('hidden');
    });
    closeImportExportModal.addEventListener('click', () => importExportModal.classList.add('hidden'));

    // Save Listeners
    saveButton.addEventListener('click', window.saveLead); // Call function from window
    saveButtonQualification.addEventListener('click', window.saveLead); // Call function from window
    saveButtonNotes.addEventListener('click', window.saveLead); // Call function from window

    // Delete Listeners
    confirmDeleteButton.addEventListener('click', async () => {
      if (!window.leadToDelete) return;
      try {
        await deleteLeadFromDB(window.leadToDelete);
        window.leadsData = window.leadsData.filter(lead => lead.leadId !== window.leadToDelete);
        window.closeDeleteModal(); // Call function from window
        window.renderFiches(); // Call function from window
        showToast('Succès', 'Fiche supprimée avec succès !', 'success');
        window.leadToDelete = null;
      } catch (error) {
        console.error('Failed to delete lead from DB:', error);
        showToast('Erreur', 'La suppression de la fiche a échoué.', 'error');
      }
    });

    closeDeleteModalButton.addEventListener('click', window.closeDeleteModal); // Call function from window
    cancelDeleteButton.addEventListener('click', window.closeDeleteModal); // Call function from window

    // Import/Export Listeners
    exportAllFichesButton.addEventListener('click', window.exportAllLeads); // Call function from window
    exportAllButton.addEventListener('click', window.exportAllLeads); // Call function from window

    exportSelectedFichesButton.addEventListener('click', () => {
        if (window.selectedLeads.length === 0) {
          showToast('Information', "Aucune fiche sélectionnée.", 'warning');
          return;
        }
        const selectedLeadsData = window.leadsData.filter(lead => window.selectedLeads.includes(lead.leadId));
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
        if (format === 'csv') {
          window.exportToCSV(selectedLeadsData);
        } else if (format === 'json') {
          window.exportToJSON(selectedLeadsData);
        }
      });

    clearSelectionButton.addEventListener('click', window.clearAllSelections);

    // Audio Recording Listener
    recordNoteButton.addEventListener('click', window.toggleRecording); // Call function from window

    // Fullscreen Toggle Listener
    if (fullscreenToggleButton) {
        fullscreenToggleButton.addEventListener('click', () => {
            const fullscreenIcon = fullscreenToggleButton.querySelector('.fullscreen-icon');
            const exitFullscreenIcon = fullscreenToggleButton.querySelector('.exit-fullscreen-icon');
            
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        if (fullscreenIcon) fullscreenIcon.classList.add('hidden');
                        if (exitFullscreenIcon) exitFullscreenIcon.classList.remove('hidden');
                        fullscreenToggleButton.title = "Quitter le plein écran";
                    })
                    .catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                        showToast('Erreur', "Impossible d'activer le mode plein écran.", 'error');
                    });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen()
                        .then(() => {
                            if (fullscreenIcon) fullscreenIcon.classList.remove('hidden');
                            if (exitFullscreenIcon) exitFullscreenIcon.classList.add('hidden');
                             fullscreenToggleButton.title = "Passer en plein écran";
                        })
                        .catch(err => {
                            console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
                            showToast('Erreur', "Impossible de désactiver le mode plein écran.", 'error');
                        });
                }
            }
        });

        // Optional: Listener to update icon if fullscreen is exited via Esc key
        document.addEventListener('fullscreenchange', () => {
             const fullscreenIcon = fullscreenToggleButton.querySelector('.fullscreen-icon');
             const exitFullscreenIcon = fullscreenToggleButton.querySelector('.exit-fullscreen-icon');
            if (!document.fullscreenElement) {
                if (fullscreenIcon) fullscreenIcon.classList.remove('hidden');
                if (exitFullscreenIcon) exitFullscreenIcon.classList.add('hidden');
                 fullscreenToggleButton.title = "Passer en plein écran";
            } else {
                if (fullscreenIcon) fullscreenIcon.classList.add('hidden');
                if (exitFullscreenIcon) exitFullscreenIcon.classList.remove('hidden');
                 fullscreenToggleButton.title = "Quitter le plein écran";
            }
        });
    } else {
        console.warn("Fullscreen toggle button not found.");
    }

  }); // End .finally block

  // --- Add listener to close modals on backdrop click --- 
  const allModalBackdrops = document.querySelectorAll('.modal-backdrop');
  allModalBackdrops.forEach(backdrop => {
      backdrop.addEventListener('click', (event) => {
          // Check if the click was directly on the backdrop itself
          if (event.target === backdrop) {
              backdrop.classList.add('hidden');

              // Specific cleanup for delete confirmation modal
              if (backdrop.id === 'confirm-delete-modal') {
                  window.leadToDelete = null;
                  console.log('Delete modal closed by backdrop click, leadToDelete reset.');
              }
              // Add other specific cleanups here if needed (e.g., clearing search fields)
          }
      });
  });
  // --- End backdrop click listener ---

  // --- Add listener to close modals with Escape key ---
  document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
          const visibleModals = document.querySelectorAll('.modal-backdrop:not(.hidden)');
          visibleModals.forEach(modal => {
              // Use specific close function for delete modal to handle state reset
              if (modal.id === 'confirm-delete-modal') {
                  if (window.closeDeleteModal) {
                      window.closeDeleteModal();
                  } else {
                      console.warn('closeDeleteModal function not found, fallback to hiding modal.');
                      modal.classList.add('hidden');
                  }
              } else {
                  modal.classList.add('hidden');
              }
          });
      }
  });
  // --- End Escape key listener ---

}); // End DOMContentLoaded listener

/* === Function Definitions Removed === */
// All function definitions previously here have been moved to separate app-*.js files.

// Render vendor buttons from participants list
window.renderVendeurButtons = () => {
  try {
    const container = document.querySelector('.vendeur-buttons');
    if (!container || !window.loadParticipants) return;
    const participants = window.loadParticipants();
    container.innerHTML = participants.map(participant => {
      const name = typeof participant === 'string' ? participant : participant.name;
      const image = typeof participant === 'object' ? participant.image : null;
      
      return `
        <div class="vendeur-button" data-value="${name}">
          <div class="vendeur-image">
            ${image ? `<img src="${image}" alt="${name}">` : `
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            `}
          </div>
          <div class="vendeur-name">${name}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Failed to render vendor buttons', e);
  }
};
