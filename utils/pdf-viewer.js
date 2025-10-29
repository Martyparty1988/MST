// ============================================
// PDF Viewer Module
// Handles PDF viewing, navigation, and storage
// ============================================

(function() {
  'use strict';

  const PDFViewer = {
    currentPdf: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.5,
    rotation: 0,
    pdfDoc: null,
    renderTask: null,

    // Initialize PDF viewer
    init: function() {
      console.log('[PDF Viewer] Initializing...');
    },

    // Load PDF from file input
    loadPdfFromFile: async function(file) {
      if (!file || file.type !== 'application/pdf') {
        window.Toast.error('Please select a valid PDF file', 'Invalid File');
        return;
      }

      try {
        window.Toast.info('Loading PDF...', 'Please wait');

        // Read file as ArrayBuffer
        const arrayBuffer = await this.readFileAsArrayBuffer(file);

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        this.pdfDoc = await loadingTask.promise;
        this.totalPages = this.pdfDoc.numPages;
        this.currentPage = 1;

        // Store PDF in IndexedDB
        await this.storePdf(file.name, arrayBuffer);

        // Render first page
        await this.renderPage(1);

        // Update UI
        this.updatePageInfo();
        this.updateControls();

        window.Toast.success(`Loaded ${file.name} (${this.totalPages} pages)`, 'PDF Loaded');

        console.log('[PDF Viewer] PDF loaded successfully:', file.name);
      } catch (error) {
        console.error('[PDF Viewer] Load failed:', error);
        window.Toast.error('Failed to load PDF file', 'Error');
      }
    },

    // Load PDF from stored data
    loadPdfFromData: async function(arrayBuffer, filename) {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        this.pdfDoc = await loadingTask.promise;
        this.totalPages = this.pdfDoc.numPages;
        this.currentPage = 1;

        await this.renderPage(1);
        this.updatePageInfo();
        this.updateControls();

        console.log('[PDF Viewer] PDF loaded from storage:', filename);
      } catch (error) {
        console.error('[PDF Viewer] Load from data failed:', error);
        window.Toast.error('Failed to load PDF', 'Error');
      }
    },

    // Render a specific page
    renderPage: async function(pageNumber) {
      if (!this.pdfDoc) return;

      // Cancel any pending render task
      if (this.renderTask) {
        this.renderTask.cancel();
      }

      const canvas = document.getElementById('pdf-canvas');
      if (!canvas) return;

      const context = canvas.getContext('2d');

      try {
        const page = await this.pdfDoc.getPage(pageNumber);

        // Calculate viewport with rotation
        let viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        this.renderTask = page.render(renderContext);
        await this.renderTask.promise;
        this.renderTask = null;

        this.currentPage = pageNumber;
        this.updatePageInfo();

        console.log('[PDF Viewer] Rendered page:', pageNumber);
      } catch (error) {
        if (error.name === 'RenderingCancelledException') {
          console.log('[PDF Viewer] Render cancelled');
        } else {
          console.error('[PDF Viewer] Render failed:', error);
        }
      }
    },

    // Navigation methods
    nextPage: async function() {
      if (this.currentPage < this.totalPages) {
        await this.renderPage(this.currentPage + 1);
      }
    },

    prevPage: async function() {
      if (this.currentPage > 1) {
        await this.renderPage(this.currentPage - 1);
      }
    },

    goToPage: async function(pageNumber) {
      const page = parseInt(pageNumber);
      if (page >= 1 && page <= this.totalPages) {
        await this.renderPage(page);
      }
    },

    // Zoom methods
    zoomIn: async function() {
      this.scale += 0.25;
      if (this.scale > 3) this.scale = 3;
      await this.renderPage(this.currentPage);
    },

    zoomOut: async function() {
      this.scale -= 0.25;
      if (this.scale < 0.5) this.scale = 0.5;
      await this.renderPage(this.currentPage);
    },

    zoomReset: async function() {
      this.scale = 1.5;
      await this.renderPage(this.currentPage);
    },

    // Rotation methods
    rotateClockwise: async function() {
      this.rotation = (this.rotation + 90) % 360;
      await this.renderPage(this.currentPage);
    },

    rotateCounterClockwise: async function() {
      this.rotation = (this.rotation - 90 + 360) % 360;
      await this.renderPage(this.currentPage);
    },

    // Full screen toggle
    toggleFullScreen: function() {
      const container = document.getElementById('pdf-viewer-container');
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          console.error('[PDF Viewer] Fullscreen failed:', err);
          window.Toast.error('Fullscreen not supported', 'Error');
        });
      } else {
        document.exitFullscreen();
      }
    },

    // Update page info display
    updatePageInfo: function() {
      const pageInfo = document.getElementById('page-info');
      if (pageInfo && this.pdfDoc) {
        pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      }

      const pageInput = document.getElementById('page-input');
      if (pageInput) {
        pageInput.value = this.currentPage;
        pageInput.max = this.totalPages;
      }

      const zoomLevel = document.getElementById('zoom-level');
      if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
      }
    },

    // Update control button states
    updateControls: function() {
      const prevBtn = document.getElementById('prev-page');
      const nextBtn = document.getElementById('next-page');

      if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
      }

      if (nextBtn) {
        nextBtn.disabled = this.currentPage >= this.totalPages;
      }
    },

    // Helper: Read file as ArrayBuffer
    readFileAsArrayBuffer: function(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
      });
    },

    // Store PDF in IndexedDB
    storePdf: async function(filename, arrayBuffer) {
      try {
        const db = await this.openPdfDatabase();
        const transaction = db.transaction(['pdfs'], 'readwrite');
        const store = transaction.objectStore('pdfs');

        const pdfData = {
          id: Date.now(),
          filename: filename,
          data: arrayBuffer,
          uploadedAt: new Date().toISOString(),
          size: arrayBuffer.byteLength
        };

        await new Promise((resolve, reject) => {
          const request = store.add(pdfData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        console.log('[PDF Viewer] PDF stored in IndexedDB:', filename);
      } catch (error) {
        console.error('[PDF Viewer] Storage failed:', error);
      }
    },

    // Get all stored PDFs
    getStoredPdfs: async function() {
      try {
        const db = await this.openPdfDatabase();
        const transaction = db.transaction(['pdfs'], 'readonly');
        const store = transaction.objectStore('pdfs');

        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('[PDF Viewer] Get stored PDFs failed:', error);
        return [];
      }
    },

    // Delete stored PDF
    deletePdf: async function(id) {
      try {
        const db = await this.openPdfDatabase();
        const transaction = db.transaction(['pdfs'], 'readwrite');
        const store = transaction.objectStore('pdfs');

        await new Promise((resolve, reject) => {
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        window.Toast.success('PDF deleted', 'Success');
        console.log('[PDF Viewer] PDF deleted:', id);
      } catch (error) {
        console.error('[PDF Viewer] Delete failed:', error);
        window.Toast.error('Failed to delete PDF', 'Error');
      }
    },

    // Open PDF database
    openPdfDatabase: function() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('MST_PDFs', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('pdfs')) {
            const store = db.createObjectStore('pdfs', { keyPath: 'id' });
            store.createIndex('filename', 'filename', { unique: false });
            store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          }
        };
      });
    },

    // Download current PDF
    downloadPdf: function() {
      const storedPdfs = this.getStoredPdfs();
      // Implementation would download the current PDF
      window.Toast.info('Download feature coming soon', 'Info');
    },

    // Print current PDF
    printPdf: function() {
      if (!this.pdfDoc) {
        window.Toast.error('No PDF loaded', 'Error');
        return;
      }

      window.print();
    },

    // Format file size
    formatFileSize: function(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Clear current PDF
    clearPdf: function() {
      this.pdfDoc = null;
      this.currentPage = 1;
      this.totalPages = 0;
      this.scale = 1.5;
      this.rotation = 0;

      const canvas = document.getElementById('pdf-canvas');
      if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      this.updatePageInfo();
      this.updateControls();
    }
  };

  // Export to window
  window.PDFViewer = PDFViewer;

  console.log('[PDF Viewer] Module loaded');
})();
