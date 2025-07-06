// Professional Page Translator
class PageTranslator {
  constructor() {
    this.translateButton = $("#translate-button");
    this.languageSelect = $("#language");
    this.modelNameInput = $("#model-name");
    this.contentIdInput = $("#id");
    this.sourceUrlInput = $("#source-url");
    this.translationResult = $("#translation-result");
    this.translationContent = $("#translation-content");
    this.errorContainer = $("#error-message");
    this.errorText = $("#error-text");
    this.spinner = $(".spinner");
    this.btnText = $(".btn-text");
    this.sampleUrlButtons = $(".sample-url-btn");
    
    this.initializeEventListeners();
    this.addFormValidation();
    this.loadSampleDataFromSelection();
  }

  initializeEventListeners() {
    // Translate button click handler
    this.translateButton.on("click", (e) => {
      e.preventDefault();
      this.handleTranslate();
    });
    
    // Sample URL buttons
    this.sampleUrlButtons.on("click", (e) => {
      e.preventDefault();
      const url = $(e.target).data("url");
      this.loadSampleUrl(url);
    });

    // Form change handlers to hide errors
    this.languageSelect.add(this.modelNameInput).add(this.contentIdInput).add(this.sourceUrlInput)
      .on("change input", () => {
        this.hideError();
      });

    // Auto-generate content ID based on model name
    this.modelNameInput.on("input", () => {
      const modelName = this.modelNameInput.val().trim();
      if (modelName && (this.contentIdInput.val() === 'demo123' || this.contentIdInput.val().includes('_page_'))) {
        const timestamp = Date.now().toString().slice(-4);
        this.contentIdInput.val(`${modelName}_page_${timestamp}`);
      }
    });

    // Listen for cross-tab sample data selection
    window.addEventListener('sampleDataSelected', (event) => {
      this.handleCrossTabSampleSelection(event.detail);
    });

    // Listen for localStorage changes (cross-tab communication)
    window.addEventListener('storage', (event) => {
      if (event.key === 'ultimateTranslator_selectedSample') {
        this.loadSampleDataFromStorage();
      }
    });
  }

  addFormValidation() {
    // Real-time URL validation
    this.sourceUrlInput.on("blur", () => {
      const url = this.sourceUrlInput.val().trim();
      if (url && !this.isValidUrl(url)) {
        this.showError("Please enter a valid HTTP or HTTPS URL");
        this.sourceUrlInput.focus();
      }
    });

    // Model name validation (alphanumeric only)
    this.modelNameInput.on("input", (e) => {
      let value = e.target.value;
      // Remove non-alphanumeric characters
      value = value.replace(/[^a-zA-Z0-9]/g, '');
      if (value !== e.target.value) {
        e.target.value = value;
      }
    });

    // Content ID validation (alphanumeric only)
    this.contentIdInput.on("input", (e) => {
      let value = e.target.value;
      // Remove non-alphanumeric characters
      value = value.replace(/[^a-zA-Z0-9]/g, '');
      if (value !== e.target.value) {
        e.target.value = value;
      }
    });
  }

  loadSampleUrl(url) {
    this.sourceUrlInput.val(url);
    
    // Extract sample type from URL to generate appropriate IDs
    const sampleType = url.split('/').pop();
    if (sampleType) {
      const timestamp = Date.now().toString().slice(-4);
      const modelName = sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, '');
      
      this.modelNameInput.val(modelName);
      this.contentIdInput.val(`${modelName}page${timestamp}`);
    }
    
    this.hideError();
    
    // Show visual feedback
    [this.sourceUrlInput, this.modelNameInput, this.contentIdInput].forEach(input => {
      input.addClass('highlight');
      setTimeout(() => input.removeClass('highlight'), 1000);
    });
  }

  loadSampleDataFromSelection() {
    // Check if there's sample data from a previous selection
    try {
      const toolConfigs = localStorage.getItem('ultimateTranslator_toolConfigs');
      if (toolConfigs) {
        const configs = JSON.parse(toolConfigs);
        if (configs.interceptor) {
          this.populateFormWithConfig(configs.interceptor);
        }
      }
    } catch (error) {
      console.log('No previous sample data found');
    }
  }

  loadSampleDataFromStorage() {
    try {
      const toolConfigs = localStorage.getItem('ultimateTranslator_toolConfigs');
      if (toolConfigs) {
        const configs = JSON.parse(toolConfigs);
        if (configs.interceptor) {
          this.populateFormWithConfig(configs.interceptor);
          this.showSuccess('Sample data loaded from showcase selection!');
        }
      }
    } catch (error) {
      console.log('Failed to load sample data from storage');
    }
  }

  handleCrossTabSampleSelection(detail) {
    const { toolConfigs } = detail;
    if (toolConfigs.interceptor) {
      this.populateFormWithConfig(toolConfigs.interceptor);
      this.showSuccess('Sample data synchronized from showcase!');
    }
  }

  populateFormWithConfig(config) {
    // Animate the form updates
    this.sourceUrlInput.val(config.sourceUrl).addClass('highlight');
    this.languageSelect.val(config.language).addClass('highlight');
    this.modelNameInput.val(config.modelName).addClass('highlight');
    this.contentIdInput.val(config.contentId).addClass('highlight');

    // Remove highlight after animation
    setTimeout(() => {
      [this.sourceUrlInput, this.languageSelect, this.modelNameInput, this.contentIdInput].forEach(input => {
        input.removeClass('highlight');
      });
    }, 1000);

    this.hideError();
  }

  async handleTranslate() {
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

    // Update progress to translation step
    this.updateProgressStep(1, 'completed');
    this.updateProgressStep(2, 'active');

    // Start loading state
    this.setLoadingState(true);
    this.hideError();
    this.hideResult();

    try {
      const response = await this.translatePage(formData);
      this.displayResult(response);
      this.showSuccess("Page translation completed successfully!");
    } catch (error) {
      this.showError(this.getErrorMessage(error));
      // Reset progress on error
      this.updateProgressStep(1, 'active');
      this.updateProgressStep(2, '');
    } finally {
      this.setLoadingState(false);
    }
  }

  getFormData() {
    return {
      language: this.languageSelect.val(),
      model_name: this.modelNameInput.val().trim(),
      content_id: this.contentIdInput.val().trim(),
      source_url: this.sourceUrlInput.val().trim()
    };
  }

  validateForm(data) {
    if (!data.language) {
      return { message: "Please select a target language", field: this.languageSelect };
    }

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

    if (!data.source_url) {
      return { message: "Please enter a source URL", field: this.sourceUrlInput };
    }

    if (!this.isValidUrl(data.source_url)) {
      return { message: "Please enter a valid HTTP or HTTPS URL", field: this.sourceUrlInput };
    }

    return null;
  }

  async translatePage(data) {
    const response = await $.ajax({
      url: "/api/v1/translate",
      method: "GET",
      data: data,
      dataType: "json",
      timeout: 60000 // 60 second timeout for page translation
    });

    return response;
  }

  displayResult(response) {
    let displayContent;
    
    if (response.message) {
      // Simple message response
      displayContent = response.message;
    } else if (response.data) {
      // Structured response with data
      displayContent = js_beautify(JSON.stringify(response.data), {
        indent_size: 2,
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2
      });
    } else if (response.success !== undefined) {
      // Full response object
      displayContent = js_beautify(JSON.stringify(response), {
        indent_size: 2,
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2
      });
    } else {
      // Fallback for any other response format
      displayContent = JSON.stringify(response, null, 2);
    }

    this.translationContent.text(displayContent);
    this.updateProgressStep(2, 'completed');
    this.updateProgressStep(3, 'active');
    this.showResult();
    this.initializeNextStepsHandlers();
  }

  setLoadingState(isLoading) {
    if (isLoading) {
      this.translateButton.prop("disabled", true);
      this.btnText.text("Translating...");
      this.spinner.removeClass("hidden");
    } else {
      this.translateButton.prop("disabled", false);
      this.btnText.text("Start Translation");
      this.spinner.addClass("hidden");
    }
  }

  showResult() {
    this.translationResult.removeClass("hidden");
    // Smooth scroll to result
    $("html, body").animate({
      scrollTop: this.translationResult.offset().top - 20
    }, 600);
  }

  hideResult() {
    this.translationResult.addClass("hidden");
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
    
    this.translationResult.before(successAlert);
    
    // Auto-hide success message after 4 seconds
    setTimeout(() => {
      successAlert.fadeOut(300, () => successAlert.remove());
    }, 4000);
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  updateProgressStep(stepNumber, status) {
    const step = $(`.progress-step[data-step="${stepNumber}"]`);
    const line = step.next('.progress-line');
    
    // Remove all status classes
    step.removeClass('active completed');
    line.removeClass('completed');
    
    // Add new status class
    if (status) {
      step.addClass(status);
      if (status === 'completed') {
        line.addClass('completed');
      }
    }
  }

  initializeNextStepsHandlers() {
    // Remove existing handlers to prevent duplicates
    $('.next-step-card').off('click');
    
    $('.next-step-card').on('click', (e) => {
      const action = $(e.currentTarget).data('action');
      this.handleNextStepAction(action);
    });
  }

  handleNextStepAction(action) {
    const formData = this.getFormData();
    
    switch (action) {
      case 'manage-translations':
        // Store current translation data for management
        localStorage.setItem('ultimateTranslator_currentTranslation', JSON.stringify({
          language: formData.language,
          modelName: formData.model_name,
          contentId: formData.content_id,
          timestamp: Date.now()
        }));
        window.open('update-translation.html', '_blank');
        break;
        
      case 'translate-text':
        window.open('string-translator.html', '_blank');
        break;
        
      case 'view-all-translations':
        // For now, redirect to management page - could be enhanced with a dedicated view
        window.open('update-translation.html', '_blank');
        break;
        
      case 'translate-another':
        // Reset the form and progress
        this.resetForm();
        this.updateProgressStep(1, 'active');
        this.updateProgressStep(2, '');
        this.updateProgressStep(3, '');
        this.hideResult();
        // Smooth scroll to top
        $("html, body").animate({ scrollTop: 0 }, 600);
        break;
    }
  }

  resetForm() {
    // Reset form fields but keep sample data if available
    const hasStoredConfig = localStorage.getItem('ultimateTranslator_toolConfigs');
    if (!hasStoredConfig) {
      this.languageSelect.val('es');
      this.modelNameInput.val('blog');
      this.contentIdInput.val('demo123');
      this.sourceUrlInput.val('http://localhost:3000/api/v1/sample/ecommerce-product');
    }
    this.hideError();
  }

  getErrorMessage(error) {
    if (error.status === 400) {
      return "Invalid request. Please check your input parameters.";
    } else if (error.status === 404) {
      return "The specified URL could not be found (404)";
    } else if (error.status === 422) {
      return "Invalid input data. Please verify all fields are correct.";
    } else if (error.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    } else if (error.status === 500) {
      return "Translation service temporarily unavailable. Please try again later.";
    } else if (error.statusText === "timeout") {
      return "Translation request timed out. This may happen with large content. Please try again.";
    } else if (error.responseJSON && error.responseJSON.error) {
      return error.responseJSON.error.message || error.responseJSON.error;
    } else if (error.message) {
      return error.message;
    } else {
      return "Failed to translate page content. Please check your inputs and try again.";
    }
  }
}

// Initialize the application when DOM is ready
$(document).ready(function() {
  new PageTranslator();
  
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
  $(".form-input, .form-select").on("focus", function() {
    $(this).parent().addClass("focused");
  }).on("blur", function() {
    $(this).parent().removeClass("focused");
  });

  // Add copy functionality to output
  $(document).on("click", "#translation-result pre", function() {
    const text = $(this).text();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Show temporary tooltip
        const tooltip = $('<div class="copy-tooltip">Copied to clipboard!</div>');
        $("body").append(tooltip);
        
        const rect = this.getBoundingClientRect();
        tooltip.css({
          position: "fixed",
          top: rect.top - 40,
          left: rect.left + rect.width / 2 - tooltip.width() / 2,
          background: "var(--gray-900)",
          color: "var(--white)",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000,
          pointerEvents: "none"
        });
        
        setTimeout(() => {
          tooltip.fadeOut(300, () => tooltip.remove());
        }, 2000);
      });
    }
  });
}); 