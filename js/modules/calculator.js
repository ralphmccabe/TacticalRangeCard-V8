export function initCalculator() {
    console.log("[V8 ENGINE] initCalculator() is executing!");
    const calcModal = document.getElementById('calc-modal');
    const calcCloseBtn = document.getElementById('calc-close-btn');

    // Bind directly to buttons to avoid event bubbling issues
    const toggleBtns = document.querySelectorAll('.calc-toggle-btn');
    console.log("[V8 ENGINE] Found " + toggleBtns.length + " calculator toggle buttons.");
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (calcModal) {
                calcModal.classList.toggle('hidden');
                console.log("[V8 ENGINE] Calculator visibility toggled.");
            }
        });
    });

    if (calcCloseBtn) {
        calcCloseBtn.addEventListener('click', () => calcModal.classList.add('hidden'));
    }

    let isCalcDragging = false;
    let cStartX, cStartY, cInitialLeft, cInitialTop;
    const calcDragHeader = document.getElementById('calc-drag-header');
    
    if (calcDragHeader && calcModal) {
        const startDrag = (e) => {
            if (e.target.closest('#calc-close-btn') || e.target.closest('button')) return;
            isCalcDragging = true;
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
            cStartX = clientX; cStartY = clientY;
            const rect = calcModal.getBoundingClientRect();
            cInitialLeft = rect.left; cInitialTop = rect.top;
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('touchmove', doDrag, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        };
        const doDrag = (e) => {
            if (!isCalcDragging) return;
            e.preventDefault();
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
            const dx = clientX - cStartX; const dy = clientY - cStartY;
            let newLeft = cInitialLeft + dx; let newTop = cInitialTop + dy;
            if (newTop < 48) newTop = 48;
            const maxLeft = window.innerWidth - calcModal.offsetWidth;
            if (newLeft < 0) newLeft = 0;
            if (newLeft > maxLeft) newLeft = maxLeft;
            const maxTop = window.innerHeight - calcModal.offsetHeight;
            if (newTop > maxTop) newTop = maxTop;
            calcModal.style.left = ${newLeft}px; calcModal.style.top = ${newTop}px;
            calcModal.style.right = 'auto'; calcModal.style.bottom = 'auto';
        };
        const stopDrag = () => {
            isCalcDragging = false;
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('touchmove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        };
        calcDragHeader.addEventListener('mousedown', startDrag);
        calcDragHeader.addEventListener('touchstart', startDrag, { passive: false });
    }
}
