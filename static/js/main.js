document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const uploadPrompt = document.querySelector('.upload-prompt');
    const uploadLabel = document.querySelector('.upload-btn');
    const extractBtn = document.getElementById('extract-btn');
    const colorCount = document.getElementById('color-count');
    const colorValue = document.getElementById('color-value');
    const resultsSection = document.getElementById('results-section');
    const loading = document.getElementById('loading');
    const colorsContainer = document.getElementById('colors-container');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const notification = document.getElementById('notification');

    // Variables
    let selectedFile = null;
    let fileDialogOpen = false;

    // Prevent default behaviors for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Add highlight on drag
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    // Remove highlight when drag ends
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('active');
    }

    function unhighlight() {
        dropArea.classList.remove('active');
    }

    // File handling events
    // Safely trigger file input without duplicating dialogs
    function safelyOpenFileDialog(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!fileDialogOpen) {
            fileDialogOpen = true;
            fileInput.click();
        }
    }

    // Browse button click
    if (uploadLabel) {
        uploadLabel.addEventListener('click', safelyOpenFileDialog);
    }
    
    // Drop area click - only trigger on direct clicks, not on children
    dropArea.addEventListener('click', function(e) {
        if (e.target === dropArea) {
            safelyOpenFileDialog(e);
        }
    });

    // Handle file input events
    fileInput.addEventListener('click', () => {
        fileDialogOpen = true;
    });

    // Track when file dialog closes
    window.addEventListener('focus', () => {
        setTimeout(() => {
            fileDialogOpen = false;
        }, 300);
    }, { capture: true });

    // Handle file drop
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            handleFileSelection(files[0]);
        }
    });
    
    // Handle file selection via input
    fileInput.addEventListener('change', function() {
        fileDialogOpen = false;
        
        if (fileInput.files.length) {
            handleFileSelection(fileInput.files[0]);
        }
    });
    
    // Common function to handle selected file
    function handleFileSelection(file) {
        if (!file) return;
        
        selectedFile = file;
        
        // Validate file type
        if (!selectedFile.type.match('image.*')) {
            showNotification('Please select an image file');
            selectedFile = null;
            return;
        }
        
        // Display preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            
            // Update UI to show selected file with change option
            uploadPrompt.innerHTML = `
                <div class="selected-file-container">
                    <p class="file-name">${selectedFile.name}</p>
                    <button type="button" id="change-file-btn" class="change-file-btn">Change File</button>
                </div>
            `;
            
            // Add event listener to new change button
            const changeBtn = document.getElementById('change-file-btn');
            if (changeBtn) {
                changeBtn.addEventListener('click', safelyOpenFileDialog);
            }
            
            extractBtn.disabled = false;
        };
        
        reader.readAsDataURL(selectedFile);
    }

    // Color count slider
    colorCount.addEventListener('input', () => {
        colorValue.textContent = colorCount.value;
    });
    
    // Extract colors button
    extractBtn.addEventListener('click', extractColors);
    
    // Download palette button
    downloadBtn.addEventListener('click', downloadPalette);
    
    // Reset button
    resetBtn.addEventListener('click', resetApp);

    // Extract colors from the image
    function extractColors() {
        if (!selectedFile) return;
        
        // Show loading and results section
        resultsSection.classList.remove('hidden');
        loading.style.display = 'flex';
        colorsContainer.style.display = 'none';
        downloadBtn.style.display = 'none';
        
        // Create form data
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('num_colors', colorCount.value);
        
        // Send request to the server
        fetch('/extract-colors', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Error: ' + data.error);
                resultsSection.classList.add('hidden');
                return;
            }
            displayColors(data.colors);
        })
        .catch(error => {
            showNotification('Error: ' + error.message);
            resultsSection.classList.add('hidden');
        })
        .finally(() => {
            loading.style.display = 'none';
        });
    }

    // Display extracted colors
    function displayColors(colors) {
        colorsContainer.innerHTML = '';
        
        colors.forEach(color => {
            const colorCard = document.createElement('div');
            colorCard.className = 'color-card';
            
            // Calculate text color (black or white) based on background color
            const rgb = color.rgb_values;
            const textColor = (rgb[0]*0.299 + rgb[1]*0.587 + rgb[2]*0.114) > 150 ? '#000' : '#fff';
            
            colorCard.innerHTML = `
                <div class="color-preview" style="background-color: ${color.hex}">
                    <span class="percentage" style="color: ${textColor}">${color.percentage}%</span>
                </div>
                <div class="color-info">
                    <div class="color-name">${color.color_name}</div>
                    <div class="color-values">
                        <div class="value">
                            <span>HEX:</span>
                            <div class="code-with-copy">
                                <span>${color.hex}</span>
                                <button class="copy-btn" data-value="${color.hex}" title="Copy HEX code">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="value">
                            <span>RGB:</span>
                            <div class="code-with-copy">
                                <span>${color.rgb}</span>
                                <button class="copy-btn" data-value="${color.rgb}" title="Copy RGB code">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="value">
                            <span>CMYK:</span>
                            <div class="code-with-copy">
                                <span>${color.cmyk}</span>
                                <button class="copy-btn" data-value="${color.cmyk}" title="Copy CMYK code">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            colorsContainer.appendChild(colorCard);
        });
        
        // Show results and download button
        colorsContainer.style.display = 'grid';
        downloadBtn.style.display = 'block';
        
        // Add copy functionality using event delegation
        colorsContainer.addEventListener('click', function(e) {
            // Check if clicked element is a copy button or a child of it
            const copyBtn = e.target.closest('.copy-btn');
            if (!copyBtn) return;
            
            const textToCopy = copyBtn.dataset.value;
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    // Add visual feedback for copy
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                    }, 1000);
                    showNotification('Color code copied to clipboard!');
                })
                .catch(err => {
                    showNotification('Failed to copy: ' + err);
                });
        });
    }

    // Download color palette as PNG
    function downloadPalette() {
        const colors = Array.from(document.querySelectorAll('.color-preview'))
            .map(el => el.style.backgroundColor);
            
        if (!colors.length) return;
        
        // Create a canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const width = 1000;
        const height = 500;
        canvas.width = width;
        canvas.height = height;
        
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Draw color palette
        const colorWidth = width / colors.length;
        
        colors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(index * colorWidth, 0, colorWidth, height - 60);
            
            // Add color code at bottom of each swatch
            const hexCode = color.replace('rgb(', '').replace(')', '').split(',');
            const r = parseInt(hexCode[0].trim());
            const g = parseInt(hexCode[1].trim());
            const b = parseInt(hexCode[2].trim());
            const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            
            ctx.font = '14px Poppins, sans-serif';
            ctx.fillStyle = (r*0.299 + g*0.587 + b*0.114) > 150 ? '#333333' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(hex.toUpperCase(), (index + 0.5) * colorWidth, height - 75);
        });
        
        // Add brand footer
        ctx.fillStyle = 'rgba(0, 102, 204, 0.9)';
        ctx.fillRect(0, height - 60, width, 60);
        ctx.font = 'bold 20px Poppins, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Brand Palette | Generated with BrandStream', width / 2, height - 25);
        
        // Convert to image and download
        const link = document.createElement('a');
        link.download = 'brand-palette.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showNotification('Brand palette exported successfully!');
    }

    // Reset the application
    function resetApp() {
        selectedFile = null;
        fileDialogOpen = false;
        
        // Reset UI elements
        previewImage.src = './static/img/placeholder.svg';
        previewImage.style.display = 'none'; // Hide the preview
        
        // Restore original upload prompt
        uploadPrompt.innerHTML = `
            <p>Drag & drop a logo or brand asset</p>
            <label for="file-input" class="upload-btn">Browse Files</label>
        `;
        
        // Reconnect event listener to new upload button
        const newUploadLabel = uploadPrompt.querySelector('.upload-btn');
        if (newUploadLabel) {
            newUploadLabel.addEventListener('click', safelyOpenFileDialog);
        }
        
        // Reset other elements
        extractBtn.disabled = true;
        resultsSection.classList.add('hidden');
        fileInput.value = ''; // Clear the file input value
    }

    // Show notification
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
});
