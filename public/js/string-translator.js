// Professional String Translator
class StringTranslator {
  constructor() {
    this.translateButton = $("#translate-button");
    this.languageSelect = $("#language");
    this.textInput = $("#string-data");
    this.translationResult = $("#translation-result");
    this.originalContent = $("#original-content");
    this.translatedContent = $("#translated-content");
    this.errorContainer = $("#error-message");
    this.errorText = $("#error-text");
    this.spinner = $(".spinner");
    this.btnText = $(".btn-text");
    this.providerInfo = $("#provider-info");
    this.languageInfo = $("#language-info");
    this.copyButton = $("#copy-translation");
    
    this.initializeEventListeners();
    this.loadSampleDataFromSelection();
  }

  initializeEventListeners() {
    // Translate button click handler
    this.translateButton.on("click", (e) => {
      e.preventDefault();
      this.handleTranslate();
    });
    
    // Enter key handler for textarea (Ctrl+Enter or Cmd+Enter)
    this.textInput.on("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.which === 13) {
        e.preventDefault();
        this.handleTranslate();
      }
    });

    // Character counter
    this.textInput.on("input", () => {
      this.updateCharacterCount();
    });

    // Copy translation button
    this.copyButton.on("click", () => {
      this.copyTranslation();
    });

    // Language select change
    this.languageSelect.on("change", () => {
      this.hideError();
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

  async handleTranslate() {
    const language = this.languageSelect.val();
    const text = this.textInput.val().trim();
    
    // Validation
    if (!language) {
      this.showError("Please select a target language");
      this.languageSelect.focus();
      return;
    }

    if (!text) {
      this.showError("Please enter text to translate");
      this.textInput.focus();
      return;
    }

    if (text.length > 50000) {
      this.showError("Text exceeds maximum length of 50,000 characters");
      this.textInput.focus();
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
      const response = await this.translateText(text, language);
      this.displayResult(text, response, language);
      this.showSuccess("Translation completed successfully!");
    } catch (error) {
      this.showError(this.getErrorMessage(error));
      // Reset progress on error
      this.updateProgressStep(1, 'active');
      this.updateProgressStep(2, '');
    } finally {
      this.setLoadingState(false);
    }
  }

  async translateText(text, language) {
    const response = await $.ajax({
      url: "/api/v1/string-translate",
      method: "POST",
      data: {
        language: language,
        text: text
      },
      dataType: "json",
      timeout: 30000 // 30 second timeout
    });

    return response;
  }

  displayResult(originalText, response, targetLanguage) {
    if (!response.success || !response.data) {
      throw new Error("Invalid response format");
    }

    const data = response.data;
    
    // Display original and translated text
    this.originalContent.text(originalText);
    this.translatedContent.text(data.translated_text);
    
    // Update translation info
    this.providerInfo.text(data.provider || 'Unknown');
    this.languageInfo.text(this.getLanguageName(targetLanguage));
    
    // Update progress
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
      this.btnText.text("Translate Text");
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
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.hideError();
    }, 5000);
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
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      successAlert.fadeOut(300, () => successAlert.remove());
    }, 3000);
  }

  updateCharacterCount() {
    const text = this.textInput.val();
    const length = text.length;
    const maxLength = 50000;
    
    // Remove existing character count
    this.textInput.siblings('.char-count').remove();
    
    // Add character count
    const countDisplay = $(`
      <small class="char-count" style="color: ${length > maxLength ? 'var(--error-color)' : 'var(--gray-500)'}; font-size: 0.75rem; float: right;">
        ${length.toLocaleString()} / ${maxLength.toLocaleString()} characters
      </small>
    `);
    
    this.textInput.after(countDisplay);
  }

  copyTranslation() {
    const translatedText = this.translatedContent.text();
    
    if (navigator.clipboard && translatedText) {
      navigator.clipboard.writeText(translatedText).then(() => {
        // Show temporary feedback
        const originalText = this.copyButton.text();
        this.copyButton.text("Copied!").prop("disabled", true);
        
        setTimeout(() => {
          this.copyButton.text(originalText).prop("disabled", false);
        }, 2000);
      }).catch(() => {
        this.showError("Failed to copy translation to clipboard");
      });
    } else {
      this.showError("Copy functionality not supported in this browser");
    }
  }

  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };
    
    return languages[code] || code.toUpperCase();
  }

  loadSampleDataFromSelection() {
    // Check if there's sample data from a previous selection
    try {
      const toolConfigs = localStorage.getItem('ultimateTranslator_toolConfigs');
      if (toolConfigs) {
        const configs = JSON.parse(toolConfigs);
        if (configs.stringTranslator) {
          this.populateFormWithConfig(configs.stringTranslator);
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
        if (configs.stringTranslator) {
          this.populateFormWithConfig(configs.stringTranslator);
          this.showSuccess('Sample text loaded from showcase selection!');
        }
      }
    } catch (error) {
      console.log('Failed to load sample data from storage');
    }
  }

  handleCrossTabSampleSelection(detail) {
    const { toolConfigs } = detail;
    if (toolConfigs.stringTranslator) {
      this.populateFormWithConfig(toolConfigs.stringTranslator);
      this.showSuccess('Sample text synchronized from showcase!');
    }
  }

  populateFormWithConfig(config) {
    // Animate the form updates
    this.textInput.val(config.sampleText).addClass('highlight');
    this.languageSelect.val(config.targetLanguage).addClass('highlight');

    // Update character count
    this.updateCharacterCount();

    // Remove highlight after animation
    setTimeout(() => {
      [this.textInput, this.languageSelect].forEach(input => {
        input.removeClass('highlight');
      });
    }, 1000);

    this.hideError();
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
    switch (action) {
      case 'translate-page':
        window.open('interceptor.html', '_blank');
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
        
      case 'manage-translations':
        window.open('update-translation.html', '_blank');
        break;
        
      case 'home':
        window.open('index.html', '_blank');
        break;
    }
  }

  resetForm() {
    // Reset form fields but keep sample data if available
    const hasStoredConfig = localStorage.getItem('ultimateTranslator_toolConfigs');
    if (!hasStoredConfig) {
      this.languageSelect.val('');
      this.textInput.val('');
    }
    this.updateCharacterCount();
    this.hideError();
  }

  getErrorMessage(error) {
    if (error.status === 422) {
      return "Invalid input. Please check your text and language selection.";
    } else if (error.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    } else if (error.status === 500) {
      return "Translation service temporarily unavailable. Please try again later.";
    } else if (error.statusText === "timeout") {
      return "Translation request timed out. Please try again.";
    } else if (error.responseJSON && error.responseJSON.error) {
      return error.responseJSON.error.message || error.responseJSON.error;
    } else if (error.message) {
      return error.message;
    } else {
      return "Failed to translate text. Please try again.";
    }
  }
}

// Initialize the application when DOM is ready
$(document).ready(function() {
  new StringTranslator();
  
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
  
  // Add focus enhancements
  $(".form-input, .form-select, .form-textarea").on("focus", function() {
    $(this).parent().addClass("focused");
  }).on("blur", function() {
    $(this).parent().removeClass("focused");
  });
}); 