// filepath: formulariodinamico-app/public/assets/js/formulariodinamico.js
$(document).ready(function() {
    const jsonTreeContainer = $('#json-tree-container');
    const jsonEditorContainer = $('#json-editor-container');

    function renderJsonTree(jsonData) {
        jsonTreeContainer.empty();
        const treeHtml = buildTreeHtml(jsonData);
        jsonTreeContainer.append(treeHtml);
    }

    function buildTreeHtml(data, parentKey = '') {
        let html = '<ul>';
        for (const key in data) {
            const value = data[key];
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            html += `<li>${key}`;
            if (typeof value === 'object' && value !== null) {
                html += buildTreeHtml(value, fullKey);
            } else {
                html += `: <span class="editable" data-key="${fullKey}">${value}</span>`;
            }
            html += '</li>';
        }
        html += '</ul>';
        return html;
    }

    jsonTreeContainer.on('click', '.editable', function() {
        const key = $(this).data('key');
        const currentValue = $(this).text();
        const newValue = prompt(`Edit value for ${key}:`, currentValue);
        if (newValue !== null) {
            $(this).text(newValue);
            // Here you would also update the underlying JSON data structure
            // For example: updateJsonData(key, newValue);
        }
    });

    // Load initial JSON data
    $.getJSON('path/to/your/json/file.json', function(data) {
        renderJsonTree(data);
    });
});