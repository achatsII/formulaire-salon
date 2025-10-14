/* ------------- elements.js ------------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Sélecteurs DOM : exposés sur window pour rester globaux */
  window.leadForm            = document.getElementById('lead-form');
  window.viewFichesButton    = document.getElementById('view-fiches-button');
  window.fichesModal         = document.getElementById('fiches-modal');
  window.closeFichesModal    = document.getElementById('close-fiches-modal');

  window.importExportButton      = document.getElementById('import-export-button');
  window.importExportModal       = document.getElementById('import-export-modal');
  window.closeImportExportModal  = document.getElementById('close-import-export-modal');

  window.formSteps         = Array.from(document.querySelectorAll('.form-step'));
  window.formSidebarItems  = document.querySelectorAll('.form-sidebar-item');
  window.nextButtons       = document.querySelectorAll('.next-step');
  window.nextButtonsSimple = document.querySelectorAll('.next-step-simple');
  window.cancelButton      = document.getElementById('cancel-form-button');

  window.leadTypeButtons = document.querySelectorAll('.lead-type-button');
  window.leadTypeInput   = document.getElementById('leadType');

  window.decisionButtons     = document.querySelectorAll('.decision-button');
  window.sentimentButtons    = document.querySelectorAll('.sentiment-button');
  window.decideurInput       = document.getElementById('decideur');
  window.interetClientInput  = document.getElementById('interetClient');
  window.interetIIInput      = document.getElementById('interetII');

  window.nomDecideurGroup = document.getElementById('nomDecideurGroup');
  window.nomDecideurInput = document.getElementById('nomDecideur');

  window.saveButton             = document.getElementById('save-button');
  window.saveButtonQualification= document.getElementById('save-button-qualification');
  window.saveButtonNotes        = document.getElementById('save-button-notes');

  window.clearInputButtons = document.querySelectorAll('.clear-input');

  window.modalTabs        = document.querySelectorAll('.modal-tab');
  window.modalTabContents = document.querySelectorAll('.modal-tab-content');

  window.confirmDeleteModal      = document.getElementById('confirm-delete-modal');
  window.closeDeleteModalButton  = document.getElementById('close-delete-modal');
  window.cancelDeleteButton      = document.getElementById('cancel-delete-button');
  window.confirmDeleteButton     = document.getElementById('confirm-delete-button');

  window.fichesGridAll        = document.getElementById('fiches-grid-all');
  window.fichesGridIncomplete = document.getElementById('fiches-grid-incomplete');
  window.emptyFiches          = document.getElementById('empty-fiches');
  window.emptyIncompleteFiches= document.getElementById('empty-incomplete-fiches');

  window.exportAllFichesButton     = document.getElementById('export-all-fiches-button');
  window.exportSelectedFichesButton= document.getElementById('export-selected-fiches-button');
  window.exportAllButton           = document.getElementById('export-all-button');
  // window.importButton              = document.getElementById('import-button'); // Removed
  // window.importFileInput           = document.getElementById('import-file'); // Removed

  window.offlineIndicator = document.getElementById('offline-indicator');

  /* Auto‑fill courriel */
  window.prenomInput = document.getElementById('prenom');
  window.nomInput    = document.getElementById('nom');
  window.emailInput  = document.getElementById('email');

  window.telephoneInput = document.getElementById('telephone');

  window.recordNoteButton = document.getElementById('record-note-button');
  window.recordingIndicator = document.getElementById('recording-indicator');
  window.notesTextarea = document.getElementById('notes');

  // New save button for contact step
  window.saveButtonContact = document.getElementById('save-button-contact');

  // --- Settings Modal Elements ---
  window.settingsButton = document.getElementById('settings-button'); // Button in header
  window.settingsModal = document.getElementById('settings-modal'); // The modal itself
  window.closeSettingsModalButton = document.getElementById('close-settings-modal'); // Close button (X)
  window.modalSalonNameInput = document.getElementById('modal-salon-name-input'); // Input inside modal
  window.saveSettingsButton = document.getElementById('save-settings-button'); // Save button in modal footer
  window.cancelSettingsButton = document.getElementById('cancel-settings-button'); // Cancel button in modal footer

  // --- Vendor Selection Elements ---
  window.vendeurButtons = document.querySelectorAll('.vendeur-button');
  window.vendeurInput = document.getElementById('vendeur');

  // Fullscreen Toggle Button
  window.fullscreenToggleButton = document.getElementById('fullscreen-toggle-button');
});
