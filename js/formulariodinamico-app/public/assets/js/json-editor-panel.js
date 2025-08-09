// filepath: formulariodinamico-app/public/assets/js/json-editor-panel.js
document.addEventListener('DOMContentLoaded', function() {
    const jsonEditorContainer = document.getElementById('json-editor-container');
    const jsonTreeContainer = document.getElementById('json-tree-container');
    let jsonData = {};

    function renderJsonTree(data, parentElement) {
        const ul = document.createElement('ul');
        for (const key in data) {
            const li = document.createElement('li');
            li.textContent = key;

            if (typeof data[key] === 'object' && data[key] !== null) {
                li.classList.add('has-children');
                renderJsonTree(data[key], li);
            } else {
                li.textContent += `: ${data[key]}`;
            }

            li.addEventListener('click', function(event) {
                event.stopPropagation();
                editJsonProperty(key, data[key]);
            });

            ul.appendChild(li);
        }
        parentElement.appendChild(ul);
    }

    function editJsonProperty(key, value) {
        const editor = document.createElement('textarea');
        editor.value = JSON.stringify(value, null, 2);
        editor.style.width = '100%';
        editor.style.height = '150px';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Guardar';
        saveButton.addEventListener('click', function() {
            try {
                const newValue = JSON.parse(editor.value);
                jsonData[key] = newValue;
                updateJsonTree();
                alert('Propiedad guardada exitosamente.');
            } catch (e) {
                alert('Error al guardar la propiedad: ' + e.message);
            }
        });

        jsonEditorContainer.innerHTML = '';
        jsonEditorContainer.appendChild(editor);
        jsonEditorContainer.appendChild(saveButton);
    }

    function updateJsonTree() {
        jsonTreeContainer.innerHTML = '';
        renderJsonTree(jsonData, jsonTreeContainer);
    }

    // Load initial JSON data
    fetch('path/to/your/json/file.json')
        .then(response => response.json())
        .then(data => {
            jsonData = data;
            updateJsonTree();
        })
        .catch(error => console.error('Error loading JSON data:', error));
});