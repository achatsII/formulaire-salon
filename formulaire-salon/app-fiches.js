/* ------------- app-fiches.js ------------- */

/**
 * Updates the enabled state and text of the "Export Selected" button.
 */
function updateExportSelectedButton() {
    const { exportSelectedFichesButton, selectedLeads } = window;
    const count = selectedLeads.length;
    exportSelectedFichesButton.disabled = count === 0;
    exportSelectedFichesButton.textContent = count > 0 ? `Exporter ${count} sélectionnée(s)` : 'Exporter sélection';
}

/**
 * Renders the list of fiches (all and incomplete) in the modal.
 * @param {Array<Object>} [leadsToDisplay=null] - Optional array of leads to display. Defaults to window.leadsData if null.
 * @param {string} [searchTerm=''] - Optional search term to filter fiches.
 */
function renderFiches(leadsToDisplay = null, searchTerm = '') {
    const { fichesGridAll, emptyFiches, fichesGridIncomplete,
            emptyIncompleteFiches, confirmDeleteModal, selectedLeads,
            fichesModal, showToast } = window; // Destructure needed elements/functions

    const mqlTodayCountEl = document.getElementById('mql-today-count');
    const fichesDayGroupsEl = document.getElementById('fiches-day-groups');

    // Use provided list or default to global data
    const currentLeadData = leadsToDisplay || window.leadsData;

    // Ensure leadsData is available
    if (!currentLeadData) {
        console.error("Leads data is not available for rendering fiches.");
        showToast('Erreur', 'Impossible de charger les données des fiches.', 'error');
        return;
    }

    // Filter fiches if search term provided
    let filteredFiches = currentLeadData; // Use currentLeadData instead of leadsData
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredFiches = currentLeadData.filter(lead => { // Use currentLeadData
        return (
          (lead.prenom && lead.prenom.toLowerCase().includes(term)) ||
          (lead.nom && lead.nom.toLowerCase().includes(term)) ||
          (lead.email && lead.email.toLowerCase().includes(term)) ||
          (lead.entreprise && lead.entreprise.toLowerCase().includes(term))
        );
      });
    }

    // Sort by timestamp (newest first)
    filteredFiches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // --- Compute MQL today and group by day ---
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    const isSameDay = (date) => date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;

    let mqlToday = 0;
    const groups = new Map(); // key: yyyy-mm-dd => { label, count, mqlCount }
    const toKey = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    filteredFiches.forEach(lead => {
      const dt = new Date(lead.timestamp);
      if (lead.leadType === 'MQL' && isSameDay(dt)) mqlToday++;
      const key = toKey(dt);
      const label = dt.toLocaleDateString();
      const existing = groups.get(key) || { label, count: 0, mqlCount: 0 };
      existing.count++;
      if (lead.leadType === 'MQL') existing.mqlCount++;
      groups.set(key, existing);
    });

    if (mqlTodayCountEl) {
      mqlTodayCountEl.textContent = String(mqlToday);
    }

    // Separate complete and incomplete fiches FROM THE FILTERED LIST
    const completeFiches = filteredFiches.filter(lead => lead.isComplete);
    const incompleteFiches = filteredFiches.filter(lead => !lead.isComplete);

    // Don't clear selections when re-rendering - preserve user selections

    // --- Render All Fiches Tab ---
    if (filteredFiches.length === 0) {
      fichesGridAll.innerHTML = '';
      emptyFiches.classList.remove('hidden');
    } else {
      emptyFiches.classList.add('hidden');
      // Render day group headers (newest first by key)
      if (fichesDayGroupsEl) {
        const sortedGroupEntries = Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
        let groupHtml = '';
        sortedGroupEntries.forEach(([key, info]) => {
          groupHtml += `<div class="day-group"><div class="day-label">${info.label}</div><div class="day-count">(${info.count} total, ${info.mqlCount} MQL)</div><div class="day-line"></div></div>`;
        });
        fichesDayGroupsEl.innerHTML = groupHtml;
      }
      let html = '';
      filteredFiches.forEach(lead => {
        const name = `${lead.prenom || ''} ${lead.nom || ''}`.trim() || 'Sans nom';
        const email = lead.email || 'Email non renseigné';
        const type = lead.leadType || 'Type non spécifié';
        const entreprise = lead.entreprise || 'Entreprise non spécifiée';
        const date = new Date(lead.timestamp).toLocaleDateString();
        const isIncomplete = !lead.isComplete;

        const isSelected = selectedLeads.includes(lead.leadId);
        html += `
            <div class="fiche-card ${isIncomplete ? 'incomplete' : ''} ${isSelected ? 'selected' : ''}" data-lead-id="${lead.leadId}">
                <input type="checkbox" class="fiche-checkbox" data-id="${lead.leadId}" ${isSelected ? 'checked' : ''}>
                <div class="fiche-header">
                    <div class="fiche-title">${name}</div>
                    <div class="fiche-type">${type}</div>
                </div>
                <div class="fiche-info"><strong>Email:</strong> ${email}</div>
                <div class="fiche-info"><strong>Entreprise:</strong> ${entreprise}</div>
                <div class="fiche-info"><strong>Date:</strong> ${date}</div>
                <div class="fiche-actions">
                    <button type="button" class="fiche-action edit-fiche" data-id="${lead.leadId}" title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="fiche-action delete-fiche" data-id="${lead.leadId}" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            `;
      });
      fichesGridAll.innerHTML = html;
    }

    // --- Render Incomplete Fiches Tab ---
    if (incompleteFiches.length === 0) {
        fichesGridIncomplete.innerHTML = '';
        emptyIncompleteFiches.classList.remove('hidden');
    } else {
        emptyIncompleteFiches.classList.add('hidden');
        let html = '';
        incompleteFiches.forEach(lead => {
            const name = `${lead.prenom || ''} ${lead.nom || ''}`.trim() || 'Sans nom';
            const email = lead.email || 'Email non renseigné';
            const type = lead.leadType || 'Type non spécifié';
            const date = new Date(lead.timestamp).toLocaleDateString();

            // Calculate completion percentage
            const totalFields = 8; // Adjust based on required fields
            let filledFields = 0;
            if (lead.leadType) filledFields++;
            if (lead.prenom) filledFields++;
            if (lead.nom) filledFields++;
            if (lead.email) filledFields++;
            if (lead.entreprise) filledFields++;
            if (lead.decideur) filledFields++;
            if (lead.interetClient) filledFields++;
            if (lead.interetII) filledFields++;
            const completionPercentage = Math.round((filledFields / totalFields) * 100);

            const isSelected = selectedLeads.includes(lead.leadId);
            html += `
                <div class="fiche-card incomplete ${isSelected ? 'selected' : ''}" data-lead-id="${lead.leadId}">
                    <input type="checkbox" class="fiche-checkbox" data-id="${lead.leadId}" ${isSelected ? 'checked' : ''}>
                    <div class="fiche-header">
                        <div class="fiche-title">${name}</div>
                        <div class="fiche-type">${type}</div>
                    </div>
                    <div class="fiche-info"><strong>Email:</strong> ${email}</div>
                    <div class="fiche-info"><strong>Date:</strong> ${date}</div>
                    <div class="fiche-info">
                        <strong>Progression:</strong> ${completionPercentage}%
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${completionPercentage}%"></div>
                        </div>
                    </div>
                    <div class="fiche-actions">
                        <button type="button" class="fiche-action edit-fiche" data-id="${lead.leadId}" title="Modifier">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" class="fiche-action delete-fiche" data-id="${lead.leadId}" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                `;
        });
        fichesGridIncomplete.innerHTML = html;
    }

    // --- Add Event Listeners (Common for both grids) ---
    // Use event delegation on the parent grids for efficiency
    const handleGridClick = (event) => {
        const target = event.target;
        const card = target.closest('.fiche-card');
        if (!card) return;
        const leadId = card.dataset.leadId;

        if (target.closest('.edit-fiche')) {
            // Use the globally exposed editLead from app-form.js
            window.editLead(leadId);
            fichesModal.classList.add('hidden');
        } else if (target.closest('.delete-fiche')) {
            window.leadToDelete = leadId; // Set global variable
            confirmDeleteModal.classList.remove('hidden');
        } else if (target.matches('.fiche-checkbox')) {
            // Handle checkbox change
            if (target.checked) {
                if (!selectedLeads.includes(leadId)) {
                    selectedLeads.push(leadId);
                }
            } else {
                window.selectedLeads = selectedLeads.filter(id => id !== leadId);
            }
            updateExportSelectedButton(); // Assumes globally available
        } else if (!target.closest('.fiche-action') && !target.matches('.fiche-checkbox')) {
             // Click on card itself (not buttons/checkbox)
             // Use the globally exposed editLead from app-form.js
            window.editLead(leadId);
            fichesModal.classList.add('hidden');
        }
    };

    // Remove previous listeners before adding new ones to avoid duplication
    fichesGridAll.removeEventListener('click', handleGridClick);
    fichesGridAll.addEventListener('click', handleGridClick);
    fichesGridIncomplete.removeEventListener('click', handleGridClick);
    fichesGridIncomplete.addEventListener('click', handleGridClick);

    updateExportSelectedButton();
}

/**
 * Populates the form with data from the selected lead for editing.
 * @param {string} leadId - The ID of the lead to edit.
 * This function is now defined in app-form.js
 */
// function editLead(leadId) {
//    ... implementation removed ...
// }

/**
 * Closes the delete confirmation modal and resets the lead to delete.
 */
function closeDeleteModal() {
    const { confirmDeleteModal } = window;
    confirmDeleteModal.classList.add('hidden');
    window.leadToDelete = null;
}

/**
 * Exports all leads to the selected format (CSV or JSON).
 */
function exportAllLeads() {
    const { leadsData, showToast } = window;
    if (leadsData.length === 0) {
      showToast('Information', "Aucune fiche à exporter.", 'warning');
      return;
    }
    const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
    if (format === 'csv') {
      exportToCSV(leadsData); // Assumes exportToCSV is globally available
    } else if (format === 'json') {
      exportToJSON(leadsData); // Assumes exportToJSON is globally available
    }
}

/**
 * Exports the given data array to a CSV file.
 * @param {Array<Object>} data - The array of lead objects to export.
 */
function exportToCSV(data) {
    const { downloadFile, formatDate, showToast } = window;
    const headers = [
      "ID Fiche", "Type Lead", "Courriel", "Prénom", "Nom",
      "Téléphone", "Nom Entreprise", "Fonction", "Secteur",
      "Décideur", "Nom Décideur",
      "Intérêt Client (1-3)", "Intérêt Pour Nous (1-3)",
      "Notes", "Date de création",
      "Est Complète", "Nom Salon",
      "Vendeur"
    ];
    const fieldToHeaderMap = {
      leadId: "ID Fiche",
      leadType: "Type Lead", email: "Courriel", prenom: "Prénom", nom: "Nom",
      telephone: "Téléphone", entreprise: "Nom Entreprise", intitule: "Fonction", secteur: "Secteur",
      decideur: "Décideur", nomDecideur: "Nom Décideur",
      interetClient: "Intérêt Client (1-3)", interetII: "Intérêt Pour Nous (1-3)",
      notes: "Notes", timestamp: "Date de création",
      isComplete: "Est Complète",
      salonName: "Nom Salon",
      vendeur: "Vendeur"
    };

    let csvContent = headers.join(",") + "\n";
    data.forEach(lead => {
      const row = headers.map(header => {
        const fieldName = Object.keys(fieldToHeaderMap).find(key => fieldToHeaderMap[key] === header);
        let value = lead[fieldName]; // Get value directly first

        // Specific handling for different types
        if (fieldName === 'audioRecordings') {
          value = JSON.stringify(value || []); // Stringify the array
        } else if (fieldName === 'timestamp' && value) {
          try { value = new Date(value).toLocaleString(); } catch (e) {} // Keep original on error
        } else if (fieldName === 'interetClient' || fieldName === 'interetII') {
          // Convert interest values from text to numbers (Froid=1, Tempéré=2, Chaud=3)
          if (value === 'Froid') value = '1';
          else if (value === 'Tempéré') value = '2';
          else if (value === 'Chaud') value = '3';
          else value = ''; // Default to empty if undefined or unexpected value
        } else {
          value = value || ""; // Default to empty string for others
        }
        
        // Ensure value is a string before escaping/quoting
        value = value.toString(); 

        // Escape double quotes
        value = value.replace(/"/g, '""');
        
        // Add quotes if value contains comma, newline, or double quote
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          value = `"${value}"`;
        }
        return value;
      }).join(",");
      csvContent += row + "\n";
    });

    // Use window.salonName for the filename
    const safeSalonName = window.salonName ? window.salonName.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase() : 'export';
    downloadFile(csvContent, 'text/csv;charset=utf-8;', `leads_${safeSalonName}_${formatDate(new Date())}.csv`);
    showToast('Succès', `${data.length} fiche(s) exportée(s) !`, 'success');
}

/**
 * Exports the given data array to a JSON file.
 * @param {Array<Object>} data - The array of lead objects to export.
 */
function exportToJSON(data) {
    const { downloadFile, formatDate, showToast } = window;
    const jsonContent = JSON.stringify(data, null, 2);
    // Use window.salonName for the filename
    const safeSalonName = window.salonName ? window.salonName.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase() : 'export';
    downloadFile(jsonContent, 'application/json', `leads_${safeSalonName}_${formatDate(new Date())}.json`);
    showToast('Succès', `${data.length} fiche(s) exportée(s) en JSON !`, 'success');
}


/**
 * Clears all selected fiches and updates the UI.
 */
function clearAllSelections() {
    window.selectedLeads = [];
    updateExportSelectedButton();
    // Re-render to update checkbox states
    renderFiches();
}

// Expose functions globally
window.renderFiches = renderFiches;
// window.editLead = editLead; // Now exposed from app-form.js
window.closeDeleteModal = closeDeleteModal;
window.exportAllLeads = exportAllLeads;
window.exportToCSV = exportToCSV;
window.exportToJSON = exportToJSON;
window.updateExportSelectedButton = updateExportSelectedButton;
window.clearAllSelections = clearAllSelections; 