(function() {
  // Initialize the JSON tree panel
  function initJsonTree() {
    // Load the JSON data
    fetch('json/formulariogenerico2.json')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load JSON data');
        return response.json();
      })
      .then(data => {
        window.formularioJsonOriginal = data;
        buildTree();
      })
      .catch(error => console.error('Error loading JSON:', error));
  }

  // Build the JSON tree
  function buildTree() {
    const panel = document.getElementById('json-tree-panel');
    if (!panel) return;

    const body = document.getElementById('jsonTreeBody');
    body.innerHTML = ''; // Clear existing content

    // Render the JSON tree
    if (window.formularioJsonOriginal) {
      Object.keys(window.formularioJsonOriginal).forEach(key => {
        body.appendChild(renderNode(key, window.formularioJsonOriginal[key]));
      });
    }
  }

  // Render a single node in the JSON tree
  function renderNode(key, value) {
    const div = document.createElement('div');
    div.className = 'json-tree-node';
    div.innerHTML = `<strong>${key}:</strong> ${JSON.stringify(value)}`;
    return div;
  }

  // Initialize the application
  document.addEventListener('DOMContentLoaded', () => {
    initJsonTree();
  });
})();