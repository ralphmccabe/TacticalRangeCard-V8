export function initCalculator() {
    const calcModal = document.getElementById('calc-modal');
    const calcCloseBtn = document.getElementById('calc-close-btn');

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.calc-toggle-btn');
        if (btn && calcModal) {
            e.preventDefault();
            calcModal.classList.toggle('hidden');
        }
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
            
            cStartX = clientX;
            cStartY = clientY;
            
            const rect = calcModal.getBoundingClientRect();
            cInitialLeft = rect.left;
            cInitialTop = rect.top;
            
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
            
            const dx = clientX - cStartX;
            const dy = clientY - cStartY;
            
            let newLeft = cInitialLeft + dx;
            let newTop = cInitialTop + dy;
            
            // Prevent dragging over the dashboard header (48px height)
            if (newTop < 48) newTop = 48;
            
            // Prevent dragging off screen horizontally
            const maxLeft = window.innerWidth - calcModal.offsetWidth;
            if (newLeft < 0) newLeft = 0;
            if (newLeft > maxLeft) newLeft = maxLeft;
            
            // Prevent dragging off screen vertically
            const maxTop = window.innerHeight - calcModal.offsetHeight;
            if (newTop > maxTop) newTop = maxTop;
            
            calcModal.style.left = ${newLeft}px;
            calcModal.style.top = ${newTop}px;
            calcModal.style.right = 'auto'; // Disable right anchoring once dragged
            calcModal.style.bottom = 'auto';
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
