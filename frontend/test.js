// === Honeycomb grid settings ===
const hexWidth = 80;
const hexHeight = 80;
const hexSpacing = 5;
const rowHeight = hexHeight * 0.8; // vertical step
const colWidth = hexWidth + hexSpacing; // horizontal step
const offsetX = colWidth * 0.5; // horizontal offset for staggered rows

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// Calculate number of rows and columns (+ extra for padding)
const numRows = Math.ceil(screenHeight / rowHeight) + 3;
const numCols = Math.ceil(screenWidth / colWidth) + 3;

const hexGrid = document.getElementById('hexGrid');

// === Create the grid ===
for (let row = 0; row < numRows; row++) {
  const hexRow = document.createElement('div');
  hexRow.className = 'hex-row';
  hexRow.style.top = (row * rowHeight) + 'px';

  if (row % 2 === 1) {
    hexRow.style.left = offsetX + 'px';
  }

  const colsInThisRow = row % 2 === 1 ? numCols - 1 : numCols;

  for (let col = 0; col < colsInThisRow; col++) {
    const hex = document.createElement('div');
    hex.className = 'hex';
    hex.setAttribute('data-row', row);
    hex.setAttribute('data-col', col);

    if (Math.random() < 0.05) {
      const unit = document.createElement('div');
      unit.className = Math.random() < 0.5 ? 'unit tank' : 'unit troop';
      unit.textContent = unit.classList.contains('tank') ? '🚛' : '👥';
      unit.draggable = false;
      hex.appendChild(unit);
      hex.classList.add('occupied');
    }

    hexRow.appendChild(hex);
  }

  hexGrid.appendChild(hexRow);
}

// === Drag and drop logic ===
let isDragging = false;
let draggedUnit = null;
let draggedFrom = null;
const dragPreview = document.getElementById('dragPreview');

function setupEventListeners() {
  document.querySelectorAll('.unit').forEach(unit => {
    unit.addEventListener('mousedown', startDrag);
  });

  document.querySelectorAll('.hex').forEach(hex => {
    hex.addEventListener('mouseenter', handleMouseEnter);
    hex.addEventListener('mouseleave', handleMouseLeave);
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
  if (isDragging && e.target.classList.contains('hex') && !e.target.classList.contains('occupied')) {
    e.target.classList.add('drag-over');
  }
}

function handleMouseLeave(e) {
  if (e.target.classList.contains('hex')) {
    e.target.classList.remove('drag-over');
  }
}

function stopDrag(e) {
  if (!isDragging) return;

  dragPreview.style.display = 'none';

  let targetHex = document.elementFromPoint(e.clientX, e.clientY);
  while (targetHex && !targetHex.classList.contains('hex')) {
    targetHex = targetHex.parentElement;
  }

  if (targetHex && !targetHex.classList.contains('occupied') && targetHex !== draggedFrom) {
    targetHex.appendChild(draggedUnit);
    targetHex.classList.add('occupied');
    draggedFrom.classList.remove('occupied');

    draggedUnit.style.transform = 'scale(1.3)';
    setTimeout(() => {
      draggedUnit.style.transform = '';
    }, 200);
  }

  draggedUnit.classList.remove('dragging');
  document.querySelectorAll('.hex').forEach(hex => hex.classList.remove('drag-over'));

  isDragging = false;
  draggedUnit = null;
  draggedFrom = null;
}

// === Init ===
setupEventListeners();
window.addEventListener('resize', () => location.reload());
