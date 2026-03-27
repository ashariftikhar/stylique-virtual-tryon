/**
 * Stylique Backend Integration Helper
 * Handles initialization of size recommendations and try-on images from backend API
 */

(function () {
  'use strict';

  // Wait for DOM to be ready and page to be fully loaded
  document.addEventListener('DOMContentLoaded', function () {
    initializeStyleTryOn();
  });

  // Also initialize on jQuery ready if jQuery is available
  if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(function () {
      initializeStyleTryOn();
    });
  }

  /**
   * Initialize try-on section with backend data
   */
  async function initializeStyleTryOn() {
    if (!window.styliqueConfig || !window.styliqueConfig.product) {
      console.warn('Stylique: Config not available');
      return;
    }

    const productId = window.styliqueConfig.product.id;
    const backendUrl = window.styliqueConfig.backendUrl || 'http://localhost:5000';

    console.log('Initializing Stylique try-on for product:', productId);

    // Fetch try-on image and inventory data
    const inventoryData = await fetchProductInventory(productId, backendUrl);
    if (inventoryData) {
      updateTryOnDisplay(inventoryData);
    }

    // Track try-on page view
    trackPageView(productId, backendUrl);
  }

  /**
   * Fetch product inventory and try-on image from backend
   */
  async function fetchProductInventory(productId, backendUrl) {
    try {
      const apiUrl = `${backendUrl}/api/inventory?product_id=${productId}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error('Failed to fetch inventory:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.inventory && data.inventory.length > 0) {
        const product = data.inventory[0];
        console.log('Fetched product inventory:', product);
        return product;
      } else {
        console.warn('No inventory data found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return null;
    }
  }

  /**
   * Update the try-on display with fetched data
   */
  function updateTryOnDisplay(inventoryData) {
    // Update try-on image if available
    if (inventoryData.tryon_image_url) {
      updateTryOnImage(inventoryData.tryon_image_url);
    }

    // Display available sizes
    if (inventoryData.sizes && inventoryData.sizes.length > 0) {
      displayAvailableSizes(inventoryData.sizes);
    }

    // Store measurements data for size recommendation
    if (inventoryData.measurements) {
      window.styliqueSection = window.styliqueSection || {};
      window.styliqueSection.productMeasurements = inventoryData.measurements;
    }
  }

  /**
   * Update the try-on image in the UI
   */
  function updateTryOnImage(imageUrl) {
    try {
      // Try to find and update the garment image container
      const tryOnContainer = document.querySelector('#stylique-virtual-tryon-container');
      if (!tryOnContainer) return;

      // Look for image display areas
      const imageElements = tryOnContainer.querySelectorAll('[data-tryon-image], .stylique-garment-image, .stylique-preview-image');
      
      imageElements.forEach(element => {
        if (element.tagName === 'IMG') {
          element.src = imageUrl;
          element.onerror = function () {
            console.warn('Failed to load try-on image:', imageUrl);
          };
        }
      });

      // Also look for any backstage element that might show the image
      const backstageImg = tryOnContainer.querySelector('.backstage');
      if (backstageImg && backstageImg.tagName === 'IMG') {
        backstageImg.src = imageUrl;
      }

      console.log('Updated try-on image URL:', imageUrl);
    } catch (error) {
      console.error('Error updating try-on image:', error);
    }
  }

  /**
   * Display available sizes in the UI
   */
  function displayAvailableSizes(sizes) {
    try {
      const tryOnContainer = document.querySelector('#stylique-virtual-tryon-container');
      if (!tryOnContainer) return;

      // Look for size selector
      const sizeSelector = tryOnContainer.querySelector('[data-size-selector], .stylique-size-selector, select[name*="size"]');
      
      if (sizeSelector && sizeSelector.tagName === 'SELECT') {
        // Clear existing options except placeholders
        const options = Array.from(sizeSelector.options).filter(opt => opt.value === '' || opt.value === 'select');
        sizeSelector.innerHTML = '';
        options.forEach(opt => sizeSelector.appendChild(opt));

        // Add sizes from backend
        sizes.forEach(size => {
          const option = document.createElement('option');
          option.value = size;
          option.textContent = size;
          sizeSelector.appendChild(option);
        });

        console.log('Updated available sizes:', sizes);
      } else {
        // Try to update size display area
        const sizeDisplay = tryOnContainer.querySelector('.stylique-sizes, [data-sizes]');
        if (sizeDisplay) {
          sizeDisplay.textContent = 'Available Sizes: ' + sizes.join(', ');
        }
      }
    } catch (error) {
      console.error('Error displaying sizes:', error);
    }
  }

  /**
   * Track page view as a try-on event
   */
  async function trackPageView(productId, backendUrl) {
    try {
      if (window.trackTryOnEvent && typeof window.trackTryOnEvent === 'function') {
        // Use the global tracking function if available
        window.trackTryOnEvent(productId, 'page_view');
      } else {
        const apiUrl = `${backendUrl}/api/track-tryon`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: window.styliqueConfig?.storeId,
            product_id: productId.toString(),
            tryon_type: 'page_view',
          }),
        });

        if (response.ok) {
          console.log('Page view tracked');
        }
      }
    } catch (error) {
      console.warn('Could not track page view:', error);
    }
  }

  /**
   * Provide a simple size recommendation helper
   */
  window.getSizeRecommendationFromMeasurements = function (userMeasurements, availableSizes) {
    if (!userMeasurements || !availableSizes || availableSizes.length === 0) {
      return availableSizes[0] || 'M';
    }

    // Simple mapping based on chest measurement
    const chest = userMeasurements.chest || 0;
    
    const sizeMap = {
      'XS': [70, 75],
      'S': [75, 85],
      'M': [85, 95],
      'L': [95, 105],
      'XL': [105, 115],
      '2XL': [115, 125],
      '3XL': [125, 135],
      '4XL': [135, 150],
    };

    for (const size of availableSizes) {
      const range = sizeMap[size.toUpperCase()];
      if (range && chest >= range[0] && chest < range[1]) {
        return size;
      }
    }

    // Fallback to middle size
    return availableSizes[Math.floor(availableSizes.length / 2)];
  };
})();
