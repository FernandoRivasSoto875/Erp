document.addEventListener('DOMContentLoaded', function() {
    const jsonTreeContainer = document.getElementById('json-tree-container');
    const jsonData = window.formularioJsonOriginal;

    function createTree(data, parentElement) {
        const ul = document.createElement('ul');

        for (const key in data) {
            const li = document.createElement('li');
            li.textContent = key;

            if (typeof data[key] === 'object' && data[key] !== null) {
                li.classList.add('has-children');
                createTree(data[key], li);
            } else {
                li.textContent += ': ' + data[key];
            }

            li.addEventListener('click', function(event) {
                event.stopPropagation();
                editProperty(key, data[key]);
            });

            ul.appendChild(li);
        }

        parentElement.appendChild(ul);
    }

    function editProperty(key, value) {
        const newValue = prompt(`Edit value for ${key}:`, value);
        if (newValue !== null) {
            // Update the JSON data structure
            updateJsonData(key, newValue);
            // Refresh the tree
            refreshTree();
        }
    }

    function updateJsonData(key, newValue) {
        // Logic to update the JSON data structure
        // This is a simplified example; you may need to handle nested keys
        const keys = key.split('.');
        let current = jsonData;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = newValue;
    }

    function refreshTree() {
        jsonTreeContainer.innerHTML = '';
        createTree(jsonData, jsonTreeContainer);
    }

    createTree(jsonData, jsonTreeContainer);
});