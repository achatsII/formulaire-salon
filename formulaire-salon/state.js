/* ------------- state.js ------------- */
/* Variables d’application (accessibles partout) */
window.currentStep     = 0;
window.leadsData       = [];   // Fiches complètes + incomplètes
window.currentLeadId   = null;
window.selectedLeads   = [];
window.isEditing       = false;
window.leadToDelete    = null;
window.visitedSteps    = [0];  // Étapes déjà parcourues
