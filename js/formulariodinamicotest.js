// Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
// Script de testeo para el formulario dinámico
(function(){
  'use strict';
  window.addEventListener('DOMContentLoaded', function() {
    var diag = [];
    // Chequeo de helpers PHP (por AJAX) 
    fetch('formulariodinamicotest.php')
      .then(r => r.json())
      .then(function(data){
        diag.push('PHP: ' + (data.ok ? 'OK' : 'ERROR') + ' - ' + (data.msg || ''));
        if(data.missing && data.missing.length) {
          diag.push('Funciones faltantes: ' + data.missing.join(', '));
        }
        mostrarDiag();
      }).catch(function(e){
        diag.push('PHP: Error de conexión o formato ('+e+')');
        mostrarDiag();
      });
    // Chequeo de JS
    try {
      diag.push('JS: window.generarCampo: ' + (typeof window.generarCampo === 'function' ? 'OK' : 'NO DEFINIDA'));
      diag.push('JS: window.generarLayout: ' + (typeof window.generarLayout === 'function' ? 'OK' : 'NO DEFINIDA'));
      diag.push('JS: window.renderTabsBlock: ' + (typeof window.renderTabsBlock === 'function' ? 'OK' : 'NO DEFINIDA'));
    } catch(e) {
      diag.push('JS: Error al chequear funciones ('+e+')');
    }
    // Chequeo de elementos HTML
    var container = document.querySelector('.container');
    diag.push('HTML: .container ' + (container ? 'OK' : 'NO ENCONTRADO'));
    var tabs = document.querySelectorAll('.nav-tabs, .nav-pills');
    diag.push('HTML: Tabs encontrados: ' + tabs.length);
    mostrarDiag();
    function mostrarDiag() {
      var testDiv = document.getElementById('fd-test-diag');
      if (!testDiv) {
        testDiv = document.createElement('div');
        testDiv.id = 'fd-test-diag';
        testDiv.className = 'alert alert-warning mt-3';
        document.body.prepend(testDiv);
      }
      testDiv.innerHTML = '<b>Diagnóstico de Testeo:</b><br>' + diag.map(x => '<div>'+x+'</div>').join('');
    }
  });
})();
