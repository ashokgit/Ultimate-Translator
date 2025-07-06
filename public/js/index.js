// Index Page Manager - Translation Capabilities Showcase
class IndexPageManager {
  constructor() {
    // Showcase elements
    this.showcaseCards = $(".showcase-card");
    this.sampleViewer = $("#sample-viewer");
    this.sampleTitle = $("#sample-title");
    this.sampleUrl = $("#sample-url");
    this.sampleFeatures = $("#sample-features");
    this.sampleDataPreview = $("#sample-data-preview");
    this.copySampleUrlButton = $("#copy-sample-url");
    this.closeSampleViewerButton = $("#close-sample-viewer");
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Showcase functionality
    this.showcaseCards.on("click", (e) => {
      const sampleType = $(e.currentTarget).data("sample");
      this.loadSampleData(sampleType);
    });

    this.copySampleUrlButton.on("click", () => this.copySampleUrl());
    this.closeSampleViewerButton.on("click", () => this.closeSampleViewer());
    $("#try-sample-btn").on("click", () => this.trySampleInPageTranslator());
  }



  async loadSampleData(sampleType) {
    try {
      this.setShowcaseLoadingState(true);
      
      const response = await $.ajax({
        url: `/api/v1/sample/${sampleType}`,
        method: "GET",
        dataType: "json",
        timeout: 10000
      });

      this.displaySampleData(sampleType, response);
      
    } catch (error) {
      this.showError(`Failed to load sample data: ${error.responseJSON?.error || error.message}`);
    } finally {
      this.setShowcaseLoadingState(false);
    }
  }

  displaySampleData(sampleType, response) {
    // Update sample viewer content
    this.sampleTitle.text(`${this.getSampleDisplayName(sampleType)} - Sample Data`);
    this.sampleUrl.text(`/api/v1/sample/${sampleType}`);
    
    // Display features
    const features = response.translation_features || [];
    this.sampleFeatures.empty();
    features.forEach(feature => {
      this.sampleFeatures.append(`<span class="feature-tag">${feature}</span>`);
    });

    // Format and display the sample data
    const formattedData = JSON.stringify(response.data, null, 2);
    this.sampleDataPreview.val(formattedData);

    // Store sample data for cross-tab synchronization
    this.storeSampleDataForCrossTabs(sampleType, response);

    // Show the viewer
    this.sampleViewer.removeClass("hidden");
    
    // Smooth scroll to viewer
    $("html, body").animate({
      scrollTop: this.sampleViewer.offset().top - 20
    }, 600);

    this.showSuccess(`${this.getSampleDisplayName(sampleType)} sample data loaded successfully!`);
  }

  storeSampleDataForCrossTabs(sampleType, response) {
    const sampleData = {
      type: sampleType,
      url: `${window.location.origin}/api/v1/sample/${sampleType}`,
      displayName: this.getSampleDisplayName(sampleType),
      features: response.translation_features || [],
      data: response.data,
      timestamp: Date.now()
    };

    // Store in localStorage for cross-tab communication
    localStorage.setItem('ultimateTranslator_selectedSample', JSON.stringify(sampleData));
    
    // Also store specific configurations for different tools
    const toolConfigs = this.generateToolConfigs(sampleType, sampleData);
    localStorage.setItem('ultimateTranslator_toolConfigs', JSON.stringify(toolConfigs));

    // Trigger custom event for any listening components
    window.dispatchEvent(new CustomEvent('sampleDataSelected', {
      detail: { sampleData, toolConfigs }
    }));
  }

  generateToolConfigs(sampleType, sampleData) {
    const baseTimestamp = Date.now().toString().slice(-4);
    
    return {
      interceptor: {
        sourceUrl: sampleData.url,
        language: 'es', // Default to Spanish
        modelName: sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, ''),
        contentId: `${sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, '')}page${baseTimestamp}`
      },
      stringTranslator: {
        // Extract a meaningful text sample for string translation
        sampleText: this.extractSampleText(sampleData.data),
        sourceLanguage: 'en',
        targetLanguage: 'es'
      },
      translationManager: {
        language: 'es',
        modelName: sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, ''),
        contentId: `${sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, '')}trans${baseTimestamp}`
      },
      sourceManager: {
        modelName: sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, ''),
        contentId: `${sampleType.replace(/[-]/g, '').replace(/[^a-zA-Z0-9]/g, '')}src${baseTimestamp}`
      }
    };
  }

  extractSampleText(data) {
    // Extract meaningful text from the sample data for string translation
    if (data.title) return data.title;
    if (data.name) return data.name;
    if (data.headline) return data.headline;
    if (data.description) return data.description;
    if (data.overview) return data.overview;
    if (data.restaurant_info?.description) return data.restaurant_info.description;
    if (data.api_info?.description) return data.api_info.description;
    
    // Fallback to a generic sample
    return "Experience the power of Ultimate Translator with this sample content.";
  }

  async copySampleUrl() {
    const url = window.location.origin + this.sampleUrl.text();
    
    try {
      await navigator.clipboard.writeText(url);
      this.showSuccess("Sample URL copied to clipboard!");
    } catch (err) {
      this.showError("Failed to copy URL to clipboard");
    }
  }

  closeSampleViewer() {
    this.sampleViewer.addClass("hidden");
  }

  trySampleInPageTranslator() {
    // The sample data is already stored in localStorage from when it was loaded
    // Just navigate to the interceptor page and it will automatically load the data
    window.open('interceptor.html', '_blank');
  }

  getSampleDisplayName(sampleType) {
    const names = {
      'ecommerce-product': 'E-commerce Product',
      'blog-article': 'Blog Article',
      'news-article': 'News Article',
      'restaurant-menu': 'Restaurant Menu',
      'api-documentation': 'API Documentation',
      'travel-guide': 'Travel Guide'
    };
    return names[sampleType] || sampleType;
  }



  setShowcaseLoadingState(isLoading) {
    if (isLoading) {
      this.showcaseCards.css("pointer-events", "none").css("opacity", "0.6");
    } else {
      this.showcaseCards.css("pointer-events", "auto").css("opacity", "1");
    }
  }

  showError(message) {
    this.errorText.text(message);
    this.errorContainer.removeClass("hidden");
    
    // Auto-hide error after 6 seconds
    setTimeout(() => {
      this.hideError();
    }, 6000);
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
    
    $(".container").prepend(successAlert);
    
    // Auto-hide success message after 4 seconds
    setTimeout(() => {
      successAlert.fadeOut(300, () => successAlert.remove());
    }, 4000);
  }
}

// Initialize the application when DOM is ready
$(document).ready(function() {
  new IndexPageManager();
  
  // Add entrance animations for navigation cards
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

  // Add staggered animation for showcase cards
  $(".showcase-card").each(function(index) {
    $(this).css({
      opacity: 0,
      transform: "translateY(30px)"
    }).delay((index * 150) + 500).animate({
      opacity: 1
    }, 800).css({
      transform: "translateY(0)"
    });
  });
  
  // Add form enhancements
  $(".form-input, .form-textarea").on("focus", function() {
    $(this).parent().addClass("focused");
  }).on("blur", function() {
    $(this).parent().removeClass("focused");
  });
}); 