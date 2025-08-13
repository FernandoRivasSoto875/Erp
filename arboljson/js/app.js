(function(){
  'use strict';
  const editor = document.getElementById('jsonEditor');
  const treeBox = document.getElementById('tree');
  const status = document.getElementById('status');
  const btnSync = document.getElementById('btnSync');
  const btnSend = document.getElementById('btnSend');
  let current = {};

  function post(msg){ try{ parent.postMessage(Object.assign({fdTree:true},msg),'*'); }catch{} }
  function setStatus(msg, cls='info'){ status.textContent=msg; status.className='status '+cls; }
  function render(obj){
    editor.value = JSON.stringify(obj,null,2);
    treeBox.innerHTML = '';
    const ul=document.createElement('ul'); ul.className='tree';
    const params=obj.parametros||{}, fieldsets=obj.fieldsets||{}, layout=obj.layout||[];
    ul.innerHTML = `
      <li><strong>parametros</strong><span class="muted"> — ${Object.keys(params).length} props</span></li>
      <li><strong>fieldsets</strong><span class="muted"> — ${Object.keys(fieldsets).length} grupos</span></li>
      <li><strong>layout</strong><span class="muted"> — ${Array.isArray(layout)?layout.length:0} secciones</span></li>
    `;
    treeBox.appendChild(ul);
    setStatus('JSON recibido','ok');
  }
  function parseEditor(){
    try{ const o=JSON.parse(editor.value||'{}'); setStatus('JSON válido','ok'); return o; }
    catch(e){ setStatus('JSON inválido: '+e.message,'err'); return null; }
  }

  window.addEventListener('message',(e)=>{
    const m=e.data||{}; if(!m.fdTree) return;
    if(m.type==='setJSON' && m.payload){ current=m.payload; render(current); return; }
    if(m.type==='ping'){ post({type:'pong'}); return; }
  });

  document.addEventListener('DOMContentLoaded',()=>{ post({type:'ready'}); post({type:'requestJSON'}); });
  btnSync.addEventListener('click',()=> post({type:'requestJSON'}));
  btnSend.addEventListener('click',()=>{ const o=parseEditor(); if(!o) return; current=o; post({type:'updateJSON',payload:current}); setStatus('Cambios enviados','ok'); });
})();