 // === Calculate square size based on vertical fit ===
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const numRows = 15; // Choose how many rows you want
    const squareSize = screenHeight / numRows; // Fit vertically
    const numCols = Math.floor(screenWidth / squareSize); // Fill horizontally

    const squaresGrid = document.getElementById('squaresGrid');
    squaresGrid.innerHTML = '';

    for (let row = 0; row < numRows; row++) {
      const squaresRow = document.createElement('div');
      squaresRow.className = 'squares-row';
      squaresRow.style.top = (row * squareSize) + 'px';

      for (let col = 0; col < numCols; col++) {
        const square = document.createElement('div');
        square.className = 'squares';
        square.style.width = squareSize + 'px';
        square.style.height = squareSize + 'px';
        square.setAttribute('data-row', row);
        square.setAttribute('data-col', col);

        // Optional: Random unit placement
        if (Math.random() < 0.05) {
          const unit = document.createElement('div');
          unit.className = Math.random() < 0.5 ? 'unit tank' : 'unit troop';
          unit.textContent = unit.classList.contains('tank') ? '🚛' : '👥';
          unit.draggable = false;
          square.appendChild(unit);
          square.classList.add('occupied');
        }

        squaresRow.appendChild(square);
      }

      squaresGrid.appendChild(squaresRow);
    }

    // === Drag and drop logic ===
    let isDragging = false;
    let draggedUnit = null;
    let draggedFrom = null;
    let dragPreview = document.getElementById('dragPreview');

    function setupEventListeners() {
      document.querySelectorAll('.unit').forEach(unit => {
        unit.addEventListener('mousedown', startDrag);
      });

      document.querySelectorAll('.squares').forEach(square => {
        square.addEventListener('mouseenter', handleMouseEnter);
        square.addEventListener('mouseleave', handleMouseLeave);
      });
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDrag);

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      draggedUnit = e.target;
      draggedFrom = e.target.parentElement;

      draggedUnit.classList.add('dragging');
      dragPreview.textContent = draggedUnit.textContent;
      dragPreview.style.display = 'block';

      updateDragPreview(e);
    }

    function handleMouseMove(e) {
      if (isDragging) updateDragPreview(e);
    }

    function updateDragPreview(e) {
      dragPreview.style.left = e.clientX + 'px';
      dragPreview.style.top = e.clientY + 'px';
    }

    function handleMouseEnter(e) {
      if (isDragging && e.target.classList.contains('squares') && !e.target.classList.contains('occupied')) {
        e.target.classList.add('drag-over');
      }
    }

    function handleMouseLeave(e) {
      if (e.target.classList.contains('squares')) {
        e.target.classList.remove('drag-over');
      }
    }

    function stopDrag(e) {
      if (!isDragging) return;

      dragPreview.style.display = 'none';

      let targetSquare = document.elementFromPoint(e.clientX, e.clientY);
      while (targetSquare && !targetSquare.classList.contains('squares')) {
        targetSquare = targetSquare.parentElement;
      }

      if (
        targetSquare &&
        targetSquare.classList.contains('squares') &&
        !targetSquare.classList.contains('occupied') &&
        targetSquare !== draggedFrom
      ) {
        targetSquare.appendChild(draggedUnit);
        targetSquare.classList.add('occupied');
        draggedFrom.classList.remove('occupied');

        draggedUnit.style.transform = 'scale(1.3)';
        setTimeout(() => {
          draggedUnit.style.transform = '';
        }, 200);
      }

      draggedUnit.classList.remove('dragging');
      document.querySelectorAll('.squares').forEach(square => {
        square.classList.remove('drag-over');
      });

      isDragging = false;
      draggedUnit = null;
      draggedFrom = null;
    }

    setupEventListeners();

    window.addEventListener('resize', () => {
      location.reload();
    });
