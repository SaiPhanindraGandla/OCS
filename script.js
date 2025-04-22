document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    const cameraContainer = document.getElementById('camera-container');
    const cameraFeed = document.getElementById('camera-feed');
    const notification = document.getElementById('notification');
    const imagePreview = document.getElementById('image-preview');
    const importedImage = document.getElementById('imported-image');

    const stickyBtn = document.getElementById('sticky-btn');
    const stickyContainer = document.getElementById('sticky-container');

    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageLabel = document.getElementById('page-label');

    let pages = []; // Array of canvas states
    let currentPageIndex = 0;


    
    // Buttons and tools
    const penTool = document.getElementById('pen-tool');
    const eraserTool = document.getElementById('eraser-tool');
    const highlighterTool = document.getElementById('highlighter-tool');
    const pointerTool = document.getElementById('pointer-tool');
    const colorPicker = document.getElementById('color-picker');
    const thicknessSlider = document.getElementById('thickness-slider');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const saveBtn = document.getElementById('save-btn');
    const importFile = document.getElementById('import-file');
    const cameraBtn = document.getElementById('camera-btn');
    const placeImageBtn = document.getElementById('place-image-btn');
    const cancelImageBtn = document.getElementById('cancel-image-btn');
    const clearBtn = document.getElementById('clear-btn');

    const backgroundSelect = document.getElementById('background-select');
    let currentBackground = 'blank';

    const brushStyleSelect = document.getElementById('brush-style');
    let currentBrushStyle = 'normal';
    let rainbowHue = 0;


    


    
    // Whiteboard state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';
    let currentColor = '#000000';
    let currentThickness = 3;
    let history = [];
    let redoStack = [];
    let historyLimit = 50;
    let cameraActive = false;
    let stream = null;
    let imageData = null;
    let pointerMode = false;
    
    // Initialize canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - document.querySelector('.toolbar').offsetHeight;
        
        // Redraw canvas content
        if (history.length > 0) {
            ctx.drawImage(history[history.length - 1], 0, 0);
        } else {
            // ctx.fillStyle = '#fff';
            // ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawBackground();

            saveState();
        }
    }
    
    // Save the current state to history
    // function saveState() {
    //     if (history.length >= historyLimit) {
    //         history.shift(); // Remove the oldest state if we hit the limit
    //     }
        
    //     const state = document.createElement('canvas');
    //     state.width = canvas.width;
    //     state.height = canvas.height;
    //     state.getContext('2d').drawImage(canvas, 0, 0);
    //     history.push(state);
    //     redoStack = []; // Clear redo stack
        
    //     // Update undo/redo buttons
    //     undoBtn.disabled = history.length <= 1;
    //     redoBtn.disabled = redoStack.length === 0;
    // }


    function saveState() {
        const state = document.createElement('canvas');
        state.width = canvas.width;
        state.height = canvas.height;
        state.getContext('2d').drawImage(canvas, 0, 0);
    
        pages[currentPageIndex] = state;
    
        // Maintain history for undo/redo if needed
        if (history.length >= historyLimit) {
            history.shift();
        }
    
        history.push(state);
        redoStack = [];
    
        undoBtn.disabled = history.length <= 1;
        redoBtn.disabled = redoStack.length === 0;
    }
    


    function switchToPage(index) {
        if (index < 0 || index >= pages.length) return;
    
        currentPageIndex = index;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        drawBackground(); // Redraw background
    
        if (pages[index]) {
            ctx.drawImage(pages[index], 0, 0);
        }
    
        pageLabel.textContent = `Page ${index + 1}`;
    }
    
    
    // Undo action
    function undo() {
        if (history.length > 1) {
            redoStack.push(history.pop()); // Move current state to redo stack
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(history[history.length - 1], 0, 0);
            
            // Update buttons
            undoBtn.disabled = history.length <= 1;
            redoBtn.disabled = false;
        }
    }
    
    // Redo action
    function redo() {
        if (redoStack.length > 0) {
            const state = redoStack.pop();
            history.push(state);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(state, 0, 0);
            
            // Update buttons
            undoBtn.disabled = false;
            redoBtn.disabled = redoStack.length === 0;
        }
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (pointerMode) return;
        
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
    }
    
    // function draw(e) {
    //     if (!isDrawing || pointerMode) return;
        
    //     const [currentX, currentY] = getCoordinates(e);
        
    //     ctx.lineJoin = 'round';
    //     ctx.lineCap = 'round';
    //     ctx.lineWidth = currentThickness;
        
    //     ctx.beginPath();
    //     ctx.moveTo(lastX, lastY);
    //     ctx.lineTo(currentX, currentY);
        
    //     if (currentTool === 'pen') {
    //         ctx.strokeStyle = currentColor;
    //         ctx.globalCompositeOperation = 'source-over';
    //         ctx.globalAlpha = 1;
    //     } else if (currentTool === 'eraser') {
    //         ctx.strokeStyle = '#fff';
    //         ctx.globalCompositeOperation = 'destination-out';
    //     } else if (currentTool === 'highlighter') {
    //         ctx.strokeStyle = currentColor;
    //         ctx.globalCompositeOperation = 'source-over';
    //         ctx.globalAlpha = 0.3;
    //     }
        
    //     ctx.stroke();
        
    //     [lastX, lastY] = [currentX, currentY];
    // }


    function draw(e) {
        if (!isDrawing || pointerMode) return;
    
        const [currentX, currentY] = getCoordinates(e);
    
        // Set basic drawing properties
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = currentThickness;
    
        // Begin drawing
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
    
        // 🔸 Tool: Pen
        if (currentTool === 'pen') {
            // 🌈 Rainbow brush style
            if (currentBrushStyle === 'rainbow') {
                ctx.strokeStyle = `hsl(${rainbowHue}, 100%, 50%)`;
                rainbowHue = (rainbowHue + 2) % 360;
            } else {
                ctx.strokeStyle = currentColor; // Default color
            }
    
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
    
            // Set line dash pattern based on brush style
            if (currentBrushStyle === 'dotted') {
                ctx.setLineDash([5, 15]); // 5px stroke, 15px gap
            } else {
                ctx.setLineDash([]); // Solid line
            }
        }
    
        // 🔸 Tool: Eraser
        else if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.setLineDash([]);
        }
    
        // 🔸 Tool: Highlighter
        else if (currentTool === 'highlighter') {
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = 0.3; // Transparent
            ctx.globalCompositeOperation = 'source-over';
            ctx.setLineDash([]);
        }
    
        // Draw the stroke
        ctx.stroke();
    
        // Update last coordinates for smooth stroke continuation
        [lastX, lastY] = [currentX, currentY];
    }
    
    
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            ctx.globalAlpha = 1; // Reset alpha for next drawing
            saveState();
        }
    }

    function drawBackground() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        ctx.save();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
    
        if (currentBackground === 'grid') {
            const spacing = 40;
            for (let x = 0; x < canvas.width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        } else if (currentBackground === 'lined') {
            const spacing = 40;
            for (let y = 0; y < canvas.height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        } else if (currentBackground === 'dots') {
            const spacing = 40;
            for (let x = 0; x < canvas.width; x += spacing) {
                for (let y = 0; y < canvas.height; y += spacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ccc';
                    ctx.fill();
                }
            }
        }
    
        ctx.restore();
    }
    


    
    // Get mouse/touch coordinates
    function getCoordinates(e) {
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        return [x, y];
    }
    
    // Tool selection
    function selectTool(tool) {
        currentTool = tool;
        
        // Remove active class from all tools
        document.querySelectorAll('.tool').forEach(tool => {
            tool.classList.remove('active');
        });
        
        // Add active class to selected tool
        if (tool === 'pen') {
            penTool.classList.add('active');
            // canvas.style.cursor = 'crosshair';
            setBrushCursor();

            pointerMode = false;
        } else if (tool === 'eraser') {
            eraserTool.classList.add('active');
            canvas.style.cursor = 'crosshair';
            pointerMode = false;
        } else if (tool === 'highlighter') {
            highlighterTool.classList.add('active');
            canvas.style.cursor = 'crosshair';
            pointerMode = false;
        } else if (tool === 'pointer') {
            pointerTool.classList.add('active');
            // canvas.style.cursor = 'pointer';
            canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg fill=\'green\' height=\'20\' width=\'20\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'10\' cy=\'10\' r=\'6\'/></svg>") 10 10, pointer';

            pointerMode = true;
        }
    }
    
    // Camera functions
    async function toggleCamera() {
        if (cameraActive) {
            // Turn off camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            cameraContainer.classList.add('hidden');
            cameraActive = false;
            showNotification('Camera turned off');
        } else {
            try {
                // Turn on camera
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 320 },
                        height: { ideal: 320 },
                        facingMode: 'user'
                    } 
                });
                
                cameraFeed.srcObject = stream;
                cameraContainer.classList.remove('hidden');
                cameraActive = true;
                showNotification('Camera turned on');
            } catch (error) {
                console.error('Error accessing camera:', error);
                showNotification('Failed to access camera');
            }
        }
    }
    
    // Import file handler
    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileType = file.type;
        if (fileType.match('image.*')) {
            handleImageImport(file);
        } else if (fileType === 'application/pdf') {
            showNotification('PDF importing is limited to first page preview');
            handlePdfImport(file);
        } else {
            showNotification('Unsupported file type');
        }
        
        // Reset the input to allow selecting the same file again
        importFile.value = '';
    }
    
    function handleImageImport(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            importedImage.src = e.target.result;
            imageData = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
    
    function handlePdfImport(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // For simplicity, just show notification that PDF support would require additional libraries
            showNotification('Full PDF rendering would require additional libraries');
            // In a real implementation, you would use PDF.js or similar
        };
        reader.readAsArrayBuffer(file);
    }
    
    function placeImportedImage() {
        if (!imageData) return;
        
        const img = new Image();
        img.onload = function() {
            // Calculate dimensions to fit within canvas while preserving aspect ratio
            const maxWidth = canvas.width * 0.8;
            const maxHeight = canvas.height * 0.8;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width *= ratio;
                height *= ratio;
            }
            
            if (height > maxHeight) {
                const ratio = maxHeight / height;
                width *= ratio;
                height *= ratio;
            }
            
            // Center the image on the canvas
            const x = (canvas.width - width) / 2;
            const y = (canvas.height - height) / 2;
            
            ctx.drawImage(img, x, y, width, height);
            saveState();
            imagePreview.classList.add('hidden');
            imageData = null;
        };
        img.src = imageData;
    }
    
    // Save canvas as image
    function saveCanvasAsImage() {
        const link = document.createElement('a');
        link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showNotification('Image saved');
    }

    function createStickyNote(x = 100, y = 100) {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.style.left = x + 'px';
        note.style.top = y + 'px';
    
        note.innerHTML = `
            <button class="delete-note">&times;</button>
            <textarea placeholder="Type here..."></textarea>
        `;
    
        // Drag logic
        let offsetX, offsetY, isDragging = false;
        note.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.classList.contains('delete-note')) return;
    
            isDragging = true;
            offsetX = e.offsetX;
            offsetY = e.offsetY;
            note.style.zIndex = 1000;
    
            function moveHandler(eMove) {
                if (!isDragging) return;
                note.style.left = `${eMove.clientX - offsetX}px`;
                note.style.top = `${eMove.clientY - offsetY}px`;
            }
    
            function upHandler() {
                isDragging = false;
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            }
    
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    
        // Delete logic
        note.querySelector('.delete-note').addEventListener('click', () => {
            stickyContainer.removeChild(note);
        });
    
        stickyContainer.appendChild(note);
    }
    
    
    // Notification system
    function showNotification(message, duration = 3000) {
        notification.textContent = message;
        notification.classList.remove('hidden');
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.classList.add('hidden'), 300);
        }, duration);
    }

    function setBrushCursor() {
        if (currentBrushStyle === 'rainbow') {
            canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg width=\'24\' height=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'12\' cy=\'12\' r=\'6\' fill=\'hsl(200, 100%, 50%)\' /></svg>") 12 12, crosshair';
        } else if (currentBrushStyle === 'dotted') {
            canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg width=\'24\' height=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'12\' cy=\'12\' r=\'2\' fill=\'black\' /></svg>") 12 12, crosshair';
        } else {
            canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg width=\'24\' height=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'12\' cy=\'12\' r=\'4\' fill=\'black\' /></svg>") 12 12, crosshair';
        }
    }
    
    
    // Initialize the whiteboard
    function init() {
        // Set initial canvas size
        resizeCanvas();
        
        // Initialize history
        saveState();
        
        // Event listeners for drawing
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrawing(e);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            draw(e);
        });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopDrawing();
        });

        clearBtn.addEventListener('click', () => {
            const confirmClear = confirm('Are you sure you want to clear the board? This cannot be undone.');
            if (confirmClear) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                saveState();
                showNotification('Board cleared');
            }
        });

        backgroundSelect.addEventListener('change', (e) => {
            currentBackground = e.target.value;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            saveState(); // Optional if you want it in undo history
        });
        

        nextPageBtn.addEventListener('click', () => {
            // Save current before switching
            saveState();
        
            currentPageIndex++;
            if (!pages[currentPageIndex]) {
                // Create a blank canvas for new page
                pages[currentPageIndex] = null;
            }
            switchToPage(currentPageIndex);
        });
        
        prevPageBtn.addEventListener('click', () => {
            if (currentPageIndex > 0) {
                saveState();
                currentPageIndex--;
                switchToPage(currentPageIndex);
            }
        });

        brushStyleSelect.addEventListener('change', (e) => {
            currentBrushStyle = e.target.value;
            if(currentTool === 'pen'){
                setBrushCursor();
            }
        });
        
        
        
        
        
        
        
        // Tool selection
        penTool.addEventListener('click', () => selectTool('pen'));
        eraserTool.addEventListener('click', () => selectTool('eraser'));
        highlighterTool.addEventListener('click', () => selectTool('highlighter'));
        pointerTool.addEventListener('click', () => selectTool('pointer'));
        
        // Color and thickness controls
        colorPicker.addEventListener('change', (e) => {
            currentColor = e.target.value;
        });
        
        thicknessSlider.addEventListener('input', (e) => {
            currentThickness = parseInt(e.target.value);
        });
        
        // Action buttons
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        saveBtn.addEventListener('click', saveCanvasAsImage);
        importFile.addEventListener('change', handleFileImport);
        cameraBtn.addEventListener('click', toggleCamera);

        stickyBtn.addEventListener('click', () => {
            createStickyNote(100, 100);
        });
        
        
        // Image preview controls
        placeImageBtn.addEventListener('click', placeImportedImage);
        cancelImageBtn.addEventListener('click', () => {
            imagePreview.classList.add('hidden');
            imageData = null;
        });
        
        // Window resize event
        window.addEventListener('resize', resizeCanvas);
        
        // Initial button state
        undoBtn.disabled = true;
        redoBtn.disabled = true;
        
        // Initial notification
        showNotification('Whiteboard ready!');
    }
    
    // Start the application
    init();
});
