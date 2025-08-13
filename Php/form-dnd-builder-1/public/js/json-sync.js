// This file manages the synchronization of form modifications with the JSON file, ensuring that any changes made in the design mode are reflected in the data structure.

function syncJsonWithUI() {
    const formData = gatherFormData();
    const jsonFilePath = '/data/forms/form.json'; // Path to the JSON file

    fetch(jsonFilePath, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('JSON file updated successfully:', data);
    })
    .catch(error => {
        console.error('Error updating JSON file:', error);
    });
}

function gatherFormData() {
    const formStructure = {
        layout: {
            main: {
                tabs: []
            }
        },
        elementos_fuera: []
    };

    document.querySelectorAll('.tabs-container > .tab').forEach(tab => {
        const tabObj = {
            title: tab.querySelector('.tab-title').innerText,
            rows: []
        };

        tab.querySelectorAll('.rows').forEach(row => {
            const rowObj = { columns: [] };
            row.querySelectorAll('.columns').forEach(col => {
                const colObj = {};
                const field = col.querySelector('.draggable-campo');
                if (field) {
                    colObj.field = field.getAttribute('data-name');
                }
                rowObj.columns.push(colObj);
            });
            tabObj.rows.push(rowObj);
        });
        formStructure.layout.main.tabs.push(tabObj);
    });

    document.querySelectorAll('#elementos-fuera-container .draggable-campo, #elementos-fuera-container .draggable-fieldset').forEach(el => {
        const tipo = el.classList.contains('draggable-fieldset') ? 'fieldset' : 'field';
        formStructure.elementos_fuera.push({ type: tipo, name: el.getAttribute('data-name') });
    });

    return formStructure;
}

// Call syncJsonWithUI whenever a change is made in the design mode
document.addEventListener('change', syncJsonWithUI);
document.addEventListener('input', syncJsonWithUI);