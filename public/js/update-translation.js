// Global variables
let currentTranslations = [];
let currentComparison = null;
let fieldStates = {};

// Language display names mapping
const languageNames = {
  'en': 'English',
  'es': 'Spanish (Español)',
  'fr': 'French (Français)',
  'de': 'German (Deutsch)',
  'it': 'Italian (Italiano)',
  'pt': 'Portuguese (Português)',
  'ru': 'Russian (Русский)',
  'ja': 'Japanese (日本語)',
  'ko': 'Korean (한국어)',
  'zh': 'Chinese (中文)',
  'ar': 'Arabic (العربية)',
  'hi': 'Hindi (हिन्दी)'
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  initializeFilters();
  loadTranslations();
  setupEventListeners();
});

// Initialize filters
async function initializeFilters() {
  try {
    const response = await fetch('/api/v1/model-names');
    const data = await response.json();
    
    if (data.success) {
      populateModelDropdown(data.data);
    }
  } catch (error) {
    console.error('Failed to load model names:', error);
  }
}

function populateModelDropdown(models) {
  const modelSelect = document.getElementById('filter-model');
  
  // Clear existing options except the first one
  modelSelect.innerHTML = '<option value="">All Models</option>';
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Filter and refresh buttons
  document.getElementById('apply-filters').addEventListener('click', loadTranslations);
  document.getElementById('refresh-list').addEventListener('click', loadTranslations);
  
  // Modal controls
  document.getElementById('close-editor').addEventListener('click', closeEditor);
  document.getElementById('cancel-edit').addEventListener('click', closeEditor);
  document.getElementById('save-changes').addEventListener('click', saveAllChanges);
  
  // Bulk actions
  document.getElementById('bulk-approve').addEventListener('click', () => bulkAction('approve'));
  document.getElementById('bulk-reject').addEventListener('click', () => bulkAction('reject'));
  document.getElementById('bulk-retranslate').addEventListener('click', () => bulkAction('retranslate'));
  
  // Close modal when clicking outside
  document.getElementById('translation-editor').addEventListener('click', function(e) {
    if (e.target === this) {
      closeEditor();
    }
  });

  document.getElementById('translations-grid').addEventListener('click', function(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const contentId = button.dataset.contentId;
    const modelName = button.dataset.modelName;
    const language = button.dataset.language;

    if (button.classList.contains('view-source-btn')) {
      viewSource(contentId, modelName);
    } else if (button.classList.contains('view-translation-btn')) {
      viewTranslation(contentId, modelName, language);
    } else if (button.classList.contains('edit-translation-btn')) {
      editTranslation(contentId, modelName, language);
    } else if (button.classList.contains('delete-btn')) {
      if (confirm(`Are you sure you want to delete the ${language} translation for ${modelName} - ${contentId}?`)) {
        deleteTranslation(contentId, modelName, language);
      }
    }
  });
}

// Load translations from API
async function loadTranslations() {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const translationsGrid = document.getElementById('translations-grid');
  
  // Show loading state
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  if (translationsGrid) {
    translationsGrid.classList.add('hidden');
    translationsGrid.innerHTML = '';
  }
  
  try {
    const filters = getFilters();
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`/api/v1/translated-list?${queryParams}`);
    const data = await response.json();
    
    // Transform grouped data into flat array
    const flatTranslations = [];
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(modelName => {
        const modelTranslations = data[modelName];
        if (Array.isArray(modelTranslations)) {
          modelTranslations.forEach(translationDoc => {
            // For each translation document, create entries for each language
            translationDoc.translations.forEach(translation => {
              const language = Object.keys(translation)[0];
              flatTranslations.push({
                _id: translationDoc._id,
                model_name: translationDoc.model_name,
                content_id: translationDoc.content_id,
                source_url: translationDoc.source_url,
                language: language,
                translation_data: translation[language],
                created_at: translationDoc.createdAt,
                updated_at: translationDoc.updatedAt
              });
            });
          });
        }
      });
    }
    
    if (flatTranslations.length > 0) {
      currentTranslations = flatTranslations;
      renderTranslations(flatTranslations);
      updateStatsSummary(flatTranslations);
      loadingState.classList.add('hidden');
    } else {
      loadingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
      if (translationsGrid) {
        translationsGrid.classList.add('hidden');
      }
      updateStatsSummary([]);
    }
  } catch (error) {
    console.error('Error loading translations:', error);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (translationsGrid) {
      translationsGrid.classList.add('hidden');
    }
  }
}

// Get current filter values
function getFilters() {
  return {
    language: document.getElementById('filter-language').value,
    model_name: document.getElementById('filter-model').value,
    content_id: document.getElementById('filter-content-id').value
  };
}

// Update statistics summary
function updateStatsSummary(translations) {
  const totalTranslations = translations.length;
  const languages = new Set();
  const models = new Set();
  
  translations.forEach(translation => {
    if (translation.model_name) models.add(translation.model_name);
    if (translation.language) languages.add(translation.language);
  });
  
  document.getElementById('total-translations').textContent = totalTranslations;
  document.getElementById('total-languages').textContent = languages.size;
  document.getElementById('total-models').textContent = models.size;
  document.getElementById('pending-count').textContent = 0; // Will be updated after comparison
}

// Render translations list
function renderTranslations(translations) {
  const translationsGrid = document.getElementById('translations-grid');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  
  if (!translationsGrid) {
    console.error('translations-grid element not found');
    return;
  }
  
  // Clear previous content
  translationsGrid.innerHTML = '';
  
  // Show the grid and hide loading/empty states
  translationsGrid.classList.remove('hidden');
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  
  translations.forEach(translation => {
    const card = createTranslationCard(translation);
    translationsGrid.appendChild(card);
  });
}

// Helper function to safely format dates
function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available';
  }
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Not available';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Not available';
  }
}

// Create translation card
function createTranslationCard(translation) {
  const card = document.createElement('div');
  card.className = 'translation-card';
  
  // Safely format the date
  const lastUpdated = formatDate(translation.updated_at || translation.created_at);
  
  card.innerHTML = `
    <div class="translation-header">
      <h3>${translation.model_name} - ${translation.content_id}</h3>
      <div class="translation-status">
        <span class="status-badge complete">Complete</span>
      </div>
    </div>
    
    <div class="translation-meta">
      <div class="meta-item">
        <span class="meta-label">LANGUAGE</span>
        <span class="meta-value">${translation.language}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">LAST UPDATED</span>
        <span class="meta-value">${lastUpdated}</span>
      </div>
    </div>
    
    <div class="translation-actions">
      <button class="action-btn view-source-btn" data-content-id="${translation.content_id}" data-model-name="${translation.model_name}">
        🔍 View Source
      </button>
      <button class="action-btn view-translation-btn" data-content-id="${translation.content_id}" data-model-name="${translation.model_name}" data-language="${translation.language}">
        🔍 View Translation
      </button>
      <button class="action-btn primary edit-translation-btn" data-content-id="${translation.content_id}" data-model-name="${translation.model_name}" data-language="${translation.language}">
        ✏️ Review Translation
      </button>
      <button class="action-btn danger delete-btn" data-content-id="${translation.content_id}" data-model-name="${translation.model_name}" data-language="${translation.language}">
        🗑️ Delete
      </button>
    </div>
  `;
  
  return card;
}

// View source data
async function viewSource(contentId, modelName) {
  try {
    // Fetch the source data
    const response = await fetch(`/api/v1/translation-comparison?content_id=${contentId}&model_name=${modelName}&language=en`);
    const data = await response.json();
    
    if (data.success) {
      showJsonViewer(data.data.source_data, `Source Data - ${modelName} (${contentId})`);
    } else {
      // Fallback: try to get any translation to extract source data
      const translations = currentTranslations.filter(t => t.content_id === contentId && t.model_name === modelName);
      if (translations.length > 0) {
        const firstTranslation = translations[0];
        const fallbackResponse = await fetch(`/api/v1/translation-comparison?content_id=${contentId}&model_name=${modelName}&language=${firstTranslation.language}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.success) {
          showJsonViewer(fallbackData.data.source_data, `Source Data - ${modelName} (${contentId})`);
        } else {
          alert('Failed to load source data: ' + (data.error || 'Unknown error'));
        }
      } else {
        alert('Failed to load source data: ' + (data.error || 'Unknown error'));
      }
    }
  } catch (error) {
    console.error('Error loading source data:', error);
    alert('Failed to load source data: ' + error.message);
  }
}

// Show JSON viewer modal
function showJsonViewer(jsonData, title) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('json-viewer-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'json-viewer-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1001;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    `;
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 1.5rem; max-width: 90vw; width: 800px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--gray-200); padding-bottom: 1rem;">
          <h3 id="json-viewer-title" style="margin: 0; color: var(--gray-900);"></h3>
          <button type="button" id="close-json-viewer" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--gray-500);">✕</button>
        </div>
        <div style="flex: 1; overflow: auto;">
          <pre id="json-viewer-content" style="background: var(--gray-50); padding: 1rem; border-radius: 8px; overflow: auto; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.875rem; line-height: 1.4; margin: 0; white-space: pre-wrap; word-wrap: break-word;"></pre>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid var(--gray-200); padding-top: 1rem;">
          <button type="button" id="copy-json" class="btn btn-secondary">📋 Copy JSON</button>
          <button type="button" id="download-json" class="btn btn-primary">💾 Download JSON</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('close-json-viewer').addEventListener('click', closeJsonViewer);
    document.getElementById('copy-json').addEventListener('click', copyJsonToClipboard);
    document.getElementById('download-json').addEventListener('click', downloadJson);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeJsonViewer();
      }
    });
  }
  
  // Update content
  document.getElementById('json-viewer-title').textContent = title;
  document.getElementById('json-viewer-content').textContent = JSON.stringify(jsonData, null, 2);
  
  // Store current data for copy/download
  modal.currentData = jsonData;
  modal.currentTitle = title;
  
  // Show modal
  modal.style.display = 'flex';
}

// Close JSON viewer
function closeJsonViewer() {
  const modal = document.getElementById('json-viewer-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Copy JSON to clipboard
function copyJsonToClipboard() {
  const modal = document.getElementById('json-viewer-modal');
  const jsonString = JSON.stringify(modal.currentData, null, 2);
  
  navigator.clipboard.writeText(jsonString).then(() => {
    const copyBtn = document.getElementById('copy-json');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    copyBtn.style.background = '#10b981';
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    alert('Failed to copy to clipboard');
  });
}

// Download JSON file
function downloadJson() {
  const modal = document.getElementById('json-viewer-modal');
  const jsonString = JSON.stringify(modal.currentData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${modal.currentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Edit translation - load comparison view
async function editTranslation(contentId, modelName, language) {
  console.log('editTranslation called with:', { contentId, modelName, language });
  
  const modal = document.getElementById('translation-editor');
  const loading = document.getElementById('comparison-loading');
  const container = document.getElementById('comparison-container');
  
  console.log('Modal elements found:', { modal: !!modal, loading: !!loading, container: !!container });
  
  // Show modal and loading state
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  loading.classList.remove('hidden');
  container.classList.add('hidden');
  
  // Update editor info
  document.getElementById('editor-info').textContent = `${modelName} - ${contentId} (${language})`;
  
  try {
    const response = await fetch(`/api/v1/translation-comparison?content_id=${contentId}&model_name=${modelName}&language=${language}`);
    const data = await response.json();
    
    if (data.success) {
      currentComparison = data.data;
      fieldStates = {};
      
      // Initialize field states from database
      if (currentComparison.field_approvals) {
        Object.keys(currentComparison.field_approvals).forEach(fieldPath => {
          const approval = currentComparison.field_approvals[fieldPath];
          // Convert field path to field ID format used in frontend
          const fieldId = `field-${Object.keys(fieldStates).length}`;
          fieldStates[fieldId] = approval.status;
        });
      }
      
      // Generate field comparison
      const fields = compareFields(currentComparison.source_data, currentComparison.translation_data);
      
      if (fields.length === 0) {
        // No fields need review - show a message
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
            <h3 style="color: var(--gray-700); margin-bottom: 0.5rem;">Translation Complete</h3>
            <p>All fields have been properly translated. No review needed.</p>
            <button type="button" onclick="closeEditor()" class="btn btn-primary" style="margin-top: 1rem;">Close</button>
          </div>
        `;
        loading.classList.add('hidden');
        container.classList.remove('hidden');
        
        // Update field counts to show all approved
        document.getElementById('approved-count').textContent = 'All';
        document.getElementById('rejected-count').textContent = '0';
        document.getElementById('pending-count').textContent = '0';
      } else {
        renderFieldComparison(fields);
        
        // Hide loading, show comparison
        loading.classList.add('hidden');
        container.classList.remove('hidden');
        
        updateFieldCounts();
      }
    } else {
      throw new Error(data.error || 'Failed to load comparison data');
    }
  } catch (error) {
    console.error('Error loading comparison:', error);
    alert('Failed to load translation comparison: ' + error.message);
    closeEditor();
  }
}

// Compare fields recursively
function compareFields(source, translation, path = '') {
  const fields = [];
  
  function traverse(sourceObj, translationObj, currentPath) {
    if (typeof sourceObj === 'object' && sourceObj !== null) {
      if (Array.isArray(sourceObj)) {
        sourceObj.forEach((item, index) => {
          const itemPath = `${currentPath}[${index}]`;
          const translationItem = translationObj && translationObj[index];
          
          if (typeof item === 'object' && item !== null) {
            traverse(item, translationItem, itemPath);
          } else {
            // Only add if translation exists and is different from original
            if (translationItem !== undefined && String(item) !== String(translationItem)) {
              fields.push({
                path: itemPath,
                original: item,
                translation: translationItem,
                type: 'primitive'
              });
            }
          }
        });
      } else {
        Object.keys(sourceObj).forEach(key => {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          const sourceValue = sourceObj[key];
          const translationValue = translationObj && translationObj[key];
          
          if (typeof sourceValue === 'object' && sourceValue !== null) {
            traverse(sourceValue, translationValue, newPath);
          } else {
            // Only add if translation exists and is different from original
            if (translationValue !== undefined && String(sourceValue) !== String(translationValue)) {
              fields.push({
                path: newPath,
                original: sourceValue,
                translation: translationValue,
                type: 'primitive'
              });
            }
          }
        });
      }
    }
  }
  
  traverse(source, translation, path);
  return fields;
}

// Render field comparison
function renderFieldComparison(fields) {
  const container = document.getElementById('fields-container');
  container.innerHTML = '';
  
  fields.forEach((field, index) => {
    const fieldRow = createFieldRow(field, index);
    container.appendChild(fieldRow);
  });
}

// Create field row
function createFieldRow(field, index) {
  const fieldId = `field-${index}`;
  
  // Check if there's existing approval status for this field
  let status = 'pending';
  if (currentComparison.field_approvals && currentComparison.field_approvals[field.path]) {
    status = currentComparison.field_approvals[field.path].status;
  }
  fieldStates[fieldId] = status;
  
  const row = document.createElement('div');
  row.className = `field-row ${status}`;
  row.id = fieldId;
  row.dataset.fieldPath = field.path;
  row.dataset.originalText = field.original;
  row.dataset.translatedText = field.translation;
  
  const originalValue = field.original !== undefined ? String(field.original) : '';
  const translationValue = field.translation !== undefined ? String(field.translation) : '';
  
  row.innerHTML = `
    <div>
      <div class="field-path">${field.path}</div>
      <div class="field-content original">${originalValue}</div>
    </div>
    <div>
      <div class="field-path">Translation</div>
      <div class="field-content translation" contenteditable="true" data-field="${fieldId}">${translationValue}</div>
    </div>
    <div class="field-actions">
      <button class="field-action-btn approve ${status === 'approved' ? 'approved' : ''}" 
              data-field-id="${fieldId}" data-action="approve">
        ${status === 'approved' ? '✓ Approved' : '✓ Approve'}
      </button>
      <button class="field-action-btn reject ${status === 'rejected' ? 'rejected' : ''}" 
              data-field-id="${fieldId}" data-action="reject">
        ${status === 'rejected' ? '⚠️ Rejected' : '⚠️ Reject'}
      </button>
      <button class="field-action-btn retranslate" 
              data-field-id="${fieldId}" data-action="retranslate">
        🔄 Re-translate
      </button>
      <div class="field-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
    </div>
  `;
  
  // Add event listeners for field actions
  const approveBtn = row.querySelector('.approve');
  const rejectBtn = row.querySelector('.reject');
  const retranslateBtn = row.querySelector('.retranslate');
  const editableContent = row.querySelector('.field-content.translation');
  
  approveBtn.addEventListener('click', () => setFieldStatus(fieldId, 'approve'));
  rejectBtn.addEventListener('click', () => setFieldStatus(fieldId, 'reject'));
  retranslateBtn.addEventListener('click', () => retranslateField(fieldId));
  
  // Add event listener for content editing
  editableContent.addEventListener('input', function() {
    markFieldAsModified(fieldId);
  });
  
  return row;
}

// Set field status
async function setFieldStatus(fieldId, action) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  fieldStates[fieldId] = status;
  
  // Update the row appearance
  const row = document.getElementById(fieldId);
  row.className = `field-row ${status}`;
  
  // Update buttons
  const approveBtn = row.querySelector('.approve');
  const rejectBtn = row.querySelector('.reject');
  const statusDiv = row.querySelector('.field-status');
  
  if (status === 'approved') {
    approveBtn.textContent = '✓ Approved';
    approveBtn.classList.add('approved');
    rejectBtn.textContent = '⚠️ Reject';
    rejectBtn.classList.remove('rejected');
  } else {
    rejectBtn.textContent = '⚠️ Rejected';
    rejectBtn.classList.add('rejected');
    approveBtn.textContent = '✓ Approve';
    approveBtn.classList.remove('approved');
  }
  
  statusDiv.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  statusDiv.className = `field-status ${status}`;
  
  // Save to database
  try {
    const fieldPath = row.dataset.fieldPath;
    const originalText = row.dataset.originalText;
    const translatedText = row.dataset.translatedText;
    
    const response = await fetch('/api/v1/field-approval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content_id: currentComparison.metadata.content_id,
        model_name: currentComparison.metadata.model_name,
        language: currentComparison.metadata.language,
        field_path: fieldPath,
        original_text: originalText,
        translated_text: translatedText,
        status: status
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Field ${status} saved successfully. Affected ${result.affected_documents} documents.`);
      // Show a brief success indicator
      const successIndicator = document.createElement('span');
      successIndicator.textContent = ' ✓';
      successIndicator.style.color = '#10b981';
      statusDiv.appendChild(successIndicator);
      
      setTimeout(() => {
        if (successIndicator.parentNode) {
          successIndicator.parentNode.removeChild(successIndicator);
        }
      }, 2000);
    } else {
      console.error('Failed to save field approval:', result.error);
      // Optionally show error to user
    }
  } catch (error) {
    console.error('Error saving field approval:', error);
  }
  
  updateFieldCounts();
}

// Mark field as modified
function markFieldAsModified(fieldId) {
  if (fieldStates[fieldId] !== 'approved' && fieldStates[fieldId] !== 'rejected') {
    fieldStates[fieldId] = 'modified';
    
    const row = document.getElementById(fieldId);
    row.className = 'field-row modified';
    
    const statusDiv = row.querySelector('.field-status');
    statusDiv.textContent = 'Modified';
    statusDiv.className = 'field-status modified';
  }
}

// Re-translate field
async function retranslateField(fieldId) {
  const fieldRow = document.getElementById(fieldId);
  if (!fieldRow) return;
  
  const fieldPath = fieldRow.dataset.fieldPath;
  const originalText = fieldRow.dataset.originalText;
  const translatedContent = fieldRow.querySelector('.field-content.translation');
  
  if (!currentComparison) {
    alert('No comparison data available');
    return;
  }
  
  const confirmed = confirm('Re-translate this field? This will replace the current translation with a new one.');
  if (!confirmed) return;
  
  try {
    // Show loading state
    translatedContent.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>';
    
    const response = await fetch('/api/v1/retranslate-field', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content_id: currentComparison.metadata.content_id,
        model_name: currentComparison.metadata.model_name,
        language: currentComparison.metadata.language,
        field_path: fieldPath,
        original_text: originalText,
        customer_id: 'default'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update the field with the new translation
      translatedContent.textContent = result.data.new_translated_text;
      
      // Update the dataset
      fieldRow.dataset.translatedText = result.data.new_translated_text;
      
      // Mark as modified
      markFieldAsModified(fieldId);
      
      // Set status to pending (user needs to approve the new translation)
      setFieldStatus(fieldId, 'pending');
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success';
      successMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 1rem; border-radius: 6px; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
      successMessage.innerHTML = `
        <strong>Success:</strong> Field re-translated with fresh translation (cache bypassed)!
        <button onclick="this.parentElement.remove()" style="margin-left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
      `;
      document.body.appendChild(successMessage);
      
      // Auto-remove success message after 5 seconds
      setTimeout(() => {
        if (successMessage.parentElement) {
          successMessage.remove();
        }
      }, 5000);
      
    } else {
      // Show error and restore original content
      translatedContent.textContent = fieldRow.dataset.translatedText;
      alert('Failed to re-translate field: ' + result.message);
    }
    
  } catch (error) {
    console.error('Error re-translating field:', error);
    translatedContent.textContent = fieldRow.dataset.translatedText;
    alert('Failed to re-translate field: ' + error.message);
  }
}

// Bulk actions
async function bulkAction(action) {
  const fieldRows = document.querySelectorAll('.field-row');
  
  if (action === 'approve' || action === 'reject') {
    const confirmed = confirm(`Are you sure you want to ${action} all fields?`);
    if (!confirmed) return;
    
    const approvals = [];
    
    fieldRows.forEach(row => {
      const fieldId = row.id;
      const fieldPath = row.dataset.fieldPath;
      const originalText = row.dataset.originalText;
      const translatedText = row.dataset.translatedText;
      const status = action === 'approve' ? 'approved' : 'rejected';
      
      // Update frontend state
      setFieldStatus(fieldId, action);
      
      // Prepare for bulk save
      approvals.push({
        content_id: currentComparison.metadata.content_id,
        model_name: currentComparison.metadata.model_name,
        language: currentComparison.metadata.language,
        field_path: fieldPath,
        original_text: originalText,
        translated_text: translatedText,
        status: status
      });
    });
    
    // Save all changes to database
    try {
      const response = await fetch('/api/v1/field-approvals/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvals: approvals
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Bulk ${action} completed: ${result.successful}/${result.processed} successful`);
      } else {
        console.error(`Bulk ${action} failed:`, result.error);
      }
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
    }
    
  } else if (action === 'retranslate') {
    // Implement bulk re-translation
    const confirmed = confirm('Re-translate all fields? This will replace all current translations with new ones.');
    if (!confirmed) return;
    
    const retranslatePromises = [];
    
    fieldRows.forEach(row => {
      const fieldId = row.id;
      const fieldPath = row.dataset.fieldPath;
      const originalText = row.dataset.originalText;
      const translatedContent = row.querySelector('.field-content.translation');
      
      // Show loading state
      translatedContent.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>';
      
      // Add to bulk retranslate promises
      retranslatePromises.push(
        fetch('/api/v1/retranslate-field', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_id: currentComparison.metadata.content_id,
            model_name: currentComparison.metadata.model_name,
            language: currentComparison.metadata.language,
            field_path: fieldPath,
            original_text: originalText,
            customer_id: 'default'
          })
        })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            // Update the field with the new translation
            translatedContent.textContent = result.data.new_translated_text;
            
            // Update the dataset
            row.dataset.translatedText = result.data.new_translated_text;
            
            // Mark as modified
            markFieldAsModified(fieldId);
            
            // Set status to pending (user needs to approve the new translation)
            setFieldStatus(fieldId, 'pending');
            
            return { success: true, fieldId };
          } else {
            // Restore original content on error
            translatedContent.textContent = row.dataset.translatedText;
            return { success: false, fieldId, error: result.message };
          }
        })
        .catch(error => {
          console.error('Error re-translating field:', error);
          translatedContent.textContent = row.dataset.translatedText;
          return { success: false, fieldId, error: error.message };
        })
      );
    });
    
    try {
      const results = await Promise.all(retranslatePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success';
        successMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 1rem; border-radius: 6px; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
        successMessage.innerHTML = `
          <strong>Bulk Re-translation Complete:</strong> ${successful} fields re-translated with fresh translations${failed > 0 ? `, ${failed} failed` : ''}
          <button onclick="this.parentElement.remove()" style="margin-left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
        `;
        document.body.appendChild(successMessage);
        
        // Auto-remove success message after 7 seconds
        setTimeout(() => {
          if (successMessage.parentElement) {
            successMessage.remove();
          }
        }, 7000);
      }
      
      if (failed > 0) {
        console.log(`${failed} fields failed to re-translate:`, results.filter(r => !r.success));
      }
      
    } catch (error) {
      console.error('Error in bulk re-translation:', error);
      alert('Failed to complete bulk re-translation: ' + error.message);
    }
  }
}

// Update field counts
function updateFieldCounts() {
  const approved = Object.values(fieldStates).filter(s => s === 'approved').length;
  const rejected = Object.values(fieldStates).filter(s => s === 'rejected').length;
  const total = Object.keys(fieldStates).length;
  const pending = total - approved - rejected;
  
  document.getElementById('approved-count').textContent = approved;
  document.getElementById('rejected-count').textContent = rejected;
  document.getElementById('pending-count').textContent = pending;
}

// Save all changes
async function saveAllChanges() {
  const confirmed = confirm('Save all changes to this translation?');
  if (!confirmed) return;
  
  try {
    // Collect all field changes
    const approvals = [];
    const fieldRows = document.querySelectorAll('.field-row');
    
    fieldRows.forEach(row => {
      const fieldId = row.id;
      const editableContent = row.querySelector('.field-content.translation');
      const fieldPath = row.dataset.fieldPath;
      const originalText = row.dataset.originalText;
      const translatedText = editableContent.textContent;
      const status = fieldStates[fieldId] || 'pending';
      
      // Only save approved changes or rejected fields
      if (status === 'approved' || status === 'rejected') {
        approvals.push({
          content_id: currentComparison.metadata.content_id,
          model_name: currentComparison.metadata.model_name,
          language: currentComparison.metadata.language,
          field_path: fieldPath,
          original_text: originalText,
          translated_text: translatedText,
          status: status
        });
      }
    });
    
    if (approvals.length === 0) {
      alert('No approved or rejected fields to save.');
      return;
    }
    
    // Save using bulk API
    const response = await fetch('/api/v1/field-approvals/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        approvals: approvals
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Successfully saved ${result.successful}/${result.processed} field approvals!`);
      
      // Refresh the translations list
      closeEditor();
      loadTranslations();
    } else {
      alert('Failed to save changes: ' + result.error);
    }
    
  } catch (error) {
    console.error('Error saving changes:', error);
    alert('Failed to save changes: ' + error.message);
  }
}

// Close editor
function closeEditor() {
  const modal = document.getElementById('translation-editor');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  
  // Reset state
  currentComparison = null;
  fieldStates = {};
}

// Delete translation
async function deleteTranslation(contentId, modelName, language) {
  const confirmed = confirm(`Are you sure you want to delete the ${language} translation for "${contentId}"?`);
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/v1/delete-translation', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content_id: contentId,
        model_name: modelName,
        language: language
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(data.message);
      loadTranslations(); // Refresh the list
    } else {
      alert('Failed to delete translation: ' + data.error);
    }
  } catch (error) {
    console.error('Error deleting translation:', error);
    alert('Failed to delete translation: ' + error.message);
  }
}

// Global functions for translation management
window.viewSource = viewSource;
window.editTranslation = editTranslation;
window.deleteTranslation = deleteTranslation;
window.setFieldStatus = setFieldStatus;
window.retranslateField = retranslateField;

async function viewTranslation(contentId, modelName, language) {
  const translation = currentTranslations.find(t => 
    t.content_id === contentId && 
    t.model_name === modelName && 
    t.language === language
  );

  if (translation && translation.translation_data) {
    showJsonViewer(translation.translation_data, `Translation for: ${contentId} (${language})`);
  } else {
    alert('Translation data not found.');
  }
}