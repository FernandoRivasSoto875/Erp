// filepath: formulariodinamico-app/public/assets/js/state-history.js
const StateHistory = (function() {
    let history = [];
    let currentIndex = -1;

    function addState(state) {
        // Remove any states ahead of the current index
        history = history.slice(0, currentIndex + 1);
        history.push(state);
        currentIndex++;
    }

    function undo() {
        if (canUndo()) {
            currentIndex--;
            return history[currentIndex + 1]; // Return the state before the undo
        }
        return null;
    }

    function redo() {
        if (canRedo()) {
            currentIndex++;
            return history[currentIndex]; // Return the state after the redo
        }
        return null;
    }

    function canUndo() {
        return currentIndex > 0;
    }

    function canRedo() {
        return currentIndex < history.length - 1;
    }

    function getCurrentState() {
        return history[currentIndex] || null;
    }

    return {
        addState,
        undo,
        redo,
        canUndo,
        canRedo,
        getCurrentState
    };
})();

// Example usage:
// StateHistory.addState({ /* current state data */ });
// const previousState = StateHistory.undo();
// const nextState = StateHistory.redo();