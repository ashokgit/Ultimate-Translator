// Professional Source Content Management
class SourceContentManager {
  constructor() {
    this.fetchButton = $("#fetch-button");
    this.updateButton = $("#update-button");
    this.modelNameInput = $("#model-name");
    this.contentIdInput = $("#content-id");
    this.sourceEditor = $("#source-editor");
    this.sourceContent = $("#source-content");
    this.errorContainer = $("#error-message");
    this.errorText = $("#error-text");
    this.fetchSpinner = $(".fetch-spinner");
    this.updateSpinner = $(".update-spinner");
    this.fetchBtnText = $(".fetch-btn-text");
    this.updateBtnText = $(".update-btn-text");
    this.sampleDataButtons = $(".sample-data-btn");
    this.formatJsonButton = $("#format-json");
    this.resetButton = $("#reset-source");
    this.copyButton = $("#copy-source");
    this.charCount = $("#char-count");
    
    // Info elements
    this.infoModel = $("#info-model");
    this.infoContentId = $("#info-content-id");
    this.infoSize = $("#info-size");
    this.infoUpdated = $("#info-updated");
    
    this.originalSource = '';
    
    this.initializeEventListeners();
    this.addFormValidation();
  }

  initializeEventListeners() {
    // Main action buttons
    this.fetchButton.on("click", (e) => {
      e.preventDefault();
      this.handleFetch();
    });
    
    this.updateButton.on("click", (e) => {
      e.preventDefault();
      this.handleUpdate();
    });

    // Sample data buttons
    this.sampleDataButtons.on("click", (e) => {
      e.preventDefault();
      const button = $(e.target);
      this.loadSampleData(
        button.data("model"),
        button.data("content")
      );
    });

    // Utility buttons
    this.formatJsonButton.on("click", () => this.formatJson());
    this.resetButton.on("click", () => this.resetSource());
    this.copyButton.on("click", () => this.copySource());

    // Form change handlers
    this.modelNameInput.add(this.contentIdInput)
      .on("change input", () => {
        this.hideError();
        this.updateButton.prop("disabled", true);
      });

    // Source content change handler
    this.sourceContent.on("input", () => {
      this.updateButton.prop("disabled", false);
      this.hideError();
      this.updateCharCount();
    });

    // Auto-generate content ID based on model name
    this.modelNameInput.on("input", () => {
      const modelName = this.modelNameInput.val().trim();
      if (modelName && this.contentIdInput.val() === 'demo123') {
        const timestamp = Date.now().toString().slice(-4);
        this.contentIdInput.val(`${modelName}${timestamp}`);
      }
    });

    // Initial character count
    this.updateCharCount();
  }

  addFormValidation() {
    // Model name validation (alphanumeric only)
    this.modelNameInput.on("input", (e) => {
      let value = e.target.value;
      value = value.replace(/[^a-zA-Z0-9]/g, '');
      if (value !== e.target.value) {
        e.target.value = value;
      }
    });

    // Content ID validation (alphanumeric only)
    this.contentIdInput.on("input", (e) => {
      let value = e.target.value;
      value = value.replace(/[^a-zA-Z0-9]/g, '');
      if (value !== e.target.value) {
        e.target.value = value;
      }
    });
  }

  loadSampleData(model, contentId) {
    this.modelNameInput.val(model);
    this.contentIdInput.val(contentId);
    
    this.hideError();
    this.hideEditor();
    
    // Show visual feedback
    [this.modelNameInput, this.contentIdInput].forEach(input => {
      input.addClass('highlight');
      setTimeout(() => input.removeClass('highlight'), 1000);
    });
  }

  async handleFetch() {
    const formData = this.getFormData();
    
    // Validation
    const validationError = this.validateForm(formData);
    if (validationError) {
      this.showError(validationError.message);
      if (validationError.field) {
        validationError.field.focus();
      }
      return;
    }

    // Start loading state
    this.setFetchLoadingState(true);
    this.hideError();
    this.hideEditor();

    try {
      const response = await this.fetchSource(formData);
      this.displaySource(response, formData);
      this.showSuccess("Source content fetched successfully!");
    } catch (error) {
      this.showError(this.getErrorMessage(error, 'fetch'));
    } finally {
      this.setFetchLoadingState(false);
    }
  }

  async handleUpdate() {
    const formData = this.getFormData();
    const sourceData = this.sourceContent.val().trim();
    
    // Validation
    if (!sourceData) {
      this.showError("Please enter source content to update");
      this.sourceContent.focus();
      return;
    }

    // Validate JSON format
    try {
      JSON.parse(sourceData);
    } catch (e) {
      this.showError("Invalid JSON format. Please check your source content.");
      this.sourceContent.focus();
      return;
    }

    // Start loading state
    this.setUpdateLoadingState(true);
    this.hideError();

    try {
      const response = await this.updateSource(formData, sourceData);
      this.showSuccess("Source content updated successfully!");
      this.updateInfoPanel(formData, sourceData);
      
      // Refresh the source to show updated content
      setTimeout(() => {
        this.handleFetch();
      }, 1000);
    } catch (error) {
      this.showError(this.getErrorMessage(error, 'update'));
    } finally {
      this.setUpdateLoadingState(false);
    }
  }

  getFormData() {
    return {
      model_name: this.modelNameInput.val().trim(),
      content_id: this.contentIdInput.val().trim()
    };
  }

  validateForm(data) {
    if (!data.model_name) {
      return { message: "Please enter a model name", field: this.modelNameInput };
    }

    if (data.model_name.length < 2) {
      return { message: "Model name must be at least 2 characters", field: this.modelNameInput };
    }

    if (!data.content_id) {
      return { message: "Please enter a content ID", field: this.contentIdInput };
    }

    if (data.content_id.length < 2) {
      return { message: "Content ID must be at least 2 characters", field: this.contentIdInput };
    }

    return null;
  }

  async fetchSource(data) {
    const response = await $.ajax({
      url: "/api/v1/translation-filter",
      method: "GET",
      data: data,
      dataType: "json",
      timeout: 30000
    });

    return response;
  }

  async updateSource(formData, sourceData) {
    const response = await $.ajax({
      url: "/api/v1/update-source",
      method: "PUT",
      data: {
        content_id: formData.content_id,
        model_name: formData.model_name,
        updatedJson: sourceData
      },
      dataType: "json",
      timeout: 30000
    });

    return response;
  }

  displaySource(response, formData) {
    let sourceData;
    
    if (response.source_data) {
      sourceData = response.source_data;
    } else if (response.data && response.data.source_data) {
      sourceData = response.data.source_data;
    } else if (response.source) {
      sourceData = response.source;
    } else {
      throw new Error("No source data found in response");
    }

    if (!sourceData) {
      throw new Error("Source data is empty or null");
    }

    // Format and display the source content
    const formattedJson = js_beautify(JSON.stringify(sourceData), {
      indent_size: 2,
      space_in_empty_paren: true,
      preserve_newlines: true,
      max_preserve_newlines: 2
    });

    this.originalSource = formattedJson;
    this.sourceContent.val(formattedJson);
    this.updateButton.prop("disabled", false);
    
    this.updateInfoPanel(formData, formattedJson);
    this.updateCharCount();
    this.showEditor();
  }

  formatJson() {
    const content = this.sourceContent.val().trim();
    if (!content) {
      this.showError("No content to format");
      return;
    }

    try {
      const parsed = JSON.parse(content);
      const formatted = js_beautify(JSON.stringify(parsed), {
        indent_size: 2,
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2
      });
      
      this.sourceContent.val(formatted);
      this.updateCharCount();
      this.showSuccess("JSON formatted successfully!");
    } catch (e) {
      this.showError("Invalid JSON format. Cannot format.");
    }
  }

  resetSource() {
    if (this.originalSource) {
      this.sourceContent.val(this.originalSource);
      this.updateCharCount();
      this.showSuccess("Source content reset to original");
    } else {
      this.showError("No original source content to reset to");
    }
  }

  async copySource() {
    const content = this.sourceContent.val().trim();
    if (!content) {
      this.showError("No content to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      this.showSuccess("Source content copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      this.sourceContent.select();
      document.execCommand('copy');
      this.showSuccess("Source content copied to clipboard!");
    }
  }

  updateCharCount() {
    const content = this.sourceContent.val();
    const count = content.length;
    this.charCount.text(`${count.toLocaleString()} characters`);
  }

  updateInfoPanel(formData, sourceContent = '') {
    this.infoModel.text(formData.model_name);
    this.infoContentId.text(formData.content_id);
    
    if (sourceContent) {
      const sizeInBytes = new Blob([sourceContent]).size;
      this.infoSize.text(this.formatBytes(sizeInBytes));
    }
    
    this.infoUpdated.text(new Date().toLocaleString());
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  setFetchLoadingState(isLoading) {
    if (isLoading) {
      this.fetchButton.prop("disabled", true);
      this.fetchBtnText.text("Fetching...");
      this.fetchSpinner.removeClass("hidden");
    } else {
      this.fetchButton.prop("disabled", false);
      this.fetchBtnText.text("Fetch Source Content");
      this.fetchSpinner.addClass("hidden");
    }
  }

  setUpdateLoadingState(isLoading) {
    if (isLoading) {
      this.updateButton.prop("disabled", true);
      this.updateBtnText.text("Updating...");
      this.updateSpinner.removeClass("hidden");
    } else {
      this.updateButton.prop("disabled", !this.sourceContent.val().trim());
      this.updateBtnText.text("Update Source Content");
      this.updateSpinner.addClass("hidden");
    }
  }

  showEditor() {
    this.sourceEditor.removeClass("hidden");
    // Smooth scroll to editor
    $("html, body").animate({
      scrollTop: this.sourceEditor.offset().top - 20
    }, 600);
  }

  hideEditor() {
    this.sourceEditor.addClass("hidden");
  }

  showError(message) {
    this.errorText.text(message);
    this.errorContainer.removeClass("hidden");
    
    // Auto-hide error after 8 seconds
    setTimeout(() => {
      this.hideError();
    }, 8000);
  }

  hideError() {
    this.errorContainer.addClass("hidden");
  }

  showSuccess(message) {
    // Create temporary success message
    const successAlert = $(`
      <div class="alert alert-success">
        <strong>Success:</strong> ${message}
      </div>
    `);
    
    this.sourceEditor.before(successAlert);
    
    // Auto-hide success message after 4 seconds
    setTimeout(() => {
      successAlert.fadeOut(300, () => successAlert.remove());
    }, 4000);
  }

  getErrorMessage(error, operation) {
    const operationName = operation === 'fetch' ? 'fetch source content' : 'update source content';
    
    if (error.status === 404) {
      return `Source content not found. Please check your model name and content ID.`;
    } else if (error.status === 400) {
      return `Invalid request. Please verify all input fields are correct.`;
    } else if (error.status === 422) {
      return `Invalid input data. Please check your form inputs and try again.`;
    } else if (error.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    } else if (error.status === 500) {
      return `Server error occurred while trying to ${operationName}. Please try again later.`;
    } else if (error.statusText === "timeout") {
      return `Request timed out while trying to ${operationName}. Please try again.`;
    } else if (error.responseJSON && error.responseJSON.error) {
      return error.responseJSON.error.message || error.responseJSON.error;
    } else if (error.message) {
      return error.message;
    } else {
      return `Failed to ${operationName}. Please check your inputs and try again.`;
    }
  }
}

// Initialize the application when DOM is ready
$(document).ready(function() {
  new SourceContentManager();
  
  // Add entrance animations
  $(".nav-card").each(function(index) {
    $(this).css({
      opacity: 0,
      transform: "translateY(20px)"
    }).delay(index * 100).animate({
      opacity: 1
    }, 600).css({
      transform: "translateY(0)"
    });
  });
  
  // Add form enhancements
  $(".form-input, .form-select, .form-textarea").on("focus", function() {
    $(this).parent().addClass("focused");
  }).on("blur", function() {
    $(this).parent().removeClass("focused");
  });

  // Add keyboard shortcuts
  $(document).on("keydown", function(e) {
    // Ctrl+Enter to fetch
    if (e.ctrlKey && e.keyCode === 13) {
      e.preventDefault();
      $("#fetch-button").click();
    }
    
    // Ctrl+S to save/update (prevent browser save)
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      if (!$("#update-button").prop("disabled")) {
        $("#update-button").click();
      }
    }
  });
}); 