// This file handles the logic for enabling and disabling design mode, allowing users to move fields and groups of fields within the form.

document.addEventListener('DOMContentLoaded', function() {
    const designModeToggle = document.getElementById('toggle-design-mode');
    const formContainer = document.querySelector('.form-container');
    let designMode = false;

    designModeToggle.addEventListener('click', function() {
        designMode = !designMode;
        toggleDesignMode(designMode);
    });

    function toggleDesignMode(enabled) {
        if (enabled) {
            formContainer.classList.add('design-mode');
            enableDragAndDrop();
            designModeToggle.innerText = 'Disable Design Mode';
        } else {
            formContainer.classList.remove('design-mode');
            disableDragAndDrop();
            designModeToggle.innerText = 'Enable Design Mode';
        }
    }

    function enableDragAndDrop() {
        // Initialize drag-and-drop functionality
        const sortableElements = document.querySelectorAll('.sortable');
        sortableElements.forEach(el => {
            new Sortable(el, {
                group: 'form',
                animation: 150,
                onEnd: function() {
                    // Update JSON after drag-and-drop
                    actualizarJsonDesdeUI();
                }
            });
        });
    }

    function disableDragAndDrop() {
        // Logic to disable drag-and-drop if necessary
        // This can be implemented if needed
    }
});