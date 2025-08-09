// filepath: /formulariodinamico-app/formulariodinamico-app/public/assets/js/dragdrop-formulariodinamico.js
document.addEventListener('DOMContentLoaded', function() {
    const jsonTreeContainer = document.getElementById('json-tree-container');
    const jsonTree = new JSONTree(jsonTreeContainer);

    jsonTree.onNodeClick = function(node) {
        // Logic to handle node click for editing
        const nodeData = node.data;
        openEditor(nodeData);
    };

    jsonTree.onNodeDragStart = function(node) {
        // Logic to handle drag start
        node.classList.add('dragging');
    };

    jsonTree.onNodeDragEnd = function(node) {
        // Logic to handle drag end
        node.classList.remove('dragging');
    };

    jsonTree.onNodeDrop = function(targetNode, draggedNode) {
        // Logic to handle dropping a node
        if (targetNode && draggedNode) {
            targetNode.appendChild(draggedNode);
            updateJSONStructure();
        }
    };

    function openEditor(nodeData) {
        // Open a modal or inline editor for the selected node
        const editorModal = document.getElementById('editor-modal');
        editorModal.querySelector('textarea').value = JSON.stringify(nodeData, null, 2);
        editorModal.style.display = 'block';

        editorModal.querySelector('.save-button').onclick = function() {
            const updatedData = JSON.parse(editorModal.querySelector('textarea').value);
            updateNodeData(nodeData, updatedData);
            editorModal.style.display = 'none';
        };
    }

    function updateNodeData(originalData, newData) {
        // Update the JSON tree with new data
        Object.assign(originalData, newData);
        jsonTree.render();
    }

    function updateJSONStructure() {
        // Logic to update the JSON structure after drag-and-drop
        const updatedJSON = jsonTree.getJSON();
        // Send updatedJSON to the server or handle it as needed
    }
});