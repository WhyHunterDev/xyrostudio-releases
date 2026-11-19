/* Xyro · idiomas. Se carga en <head> ANTES que el resto.
   Español = no hace nada. Otro idioma = carga /i18n/<lang>.js (diccionario español→idioma) y traduce
   los textos de la pantalla mientras aparecen (también lo que pinta el JavaScript después).
   Para agregar un idioma: crea /i18n/<lang>.js con window.XY_DICT = {...} y súmalo a LANGS. */
(function(){
  var LANGS={es:'Español',en:'English'};
  var lang='es';
  try{var s=localStorage.getItem('xy-lang');if(s&&LANGS[s])lang=s;else{var n=(navigator.languages&&navigator.languages[0])||navigator.language||'es';lang=/^es\b/i.test(n)?'es':'en'}}catch(_){}
  var q=/[?&]lang=([a-z]{2})/.exec(location.search);if(q&&LANGS[q[1]])lang=q[1];
  window.XY_LANG=lang;window.XY_LANGS=LANGS;window.XY_LOC=lang==='en'?'en-US':'es-PE';
  window.xyLang=function(l){try{localStorage.setItem('xy-lang',l)}catch(_){}location.reload()};
  document.documentElement.lang=lang;
  if(lang==='es')return;
  document.write('<script src="/i18n/'+lang+'.js"><\/script>');
  var D=null,P=null,C=new Map(),SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,CODE:1,NOSCRIPT:1};
  function nz(t){return t.replace(/\s+/g,' ').trim()}
  function prep(){D=window.XY_DICT||{};P=[];for(var k in D){if(k.indexOf('#')<0||k.charAt(0)==='§')continue;
    var re='^'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/#/g,'(.+?)')+'$';try{P.push([new RegExp(re),D[k],k.replace(/#/g,'').length])}catch(_){}}
    P.sort(function(x,y){return y[2]-x[2]})}
  function tr(t,dp){
    if(!D)prep();dp=dp||0;
    var k=nz(t);if(k.length<2||!/[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡]/.test(k))return null;
    if(C.has(k))return C.get(k);
    var r=D[k];
    if(r===undefined){r=null;
      if(/[0-9]/.test(k)){var kn=k.replace(/\d[\d.,:]*/g,'#');var dk=D[kn]!==undefined?D[kn]:D['§'+kn];if(dk!==undefined){var nums=k.match(/\d[\d.,:]*/g),i=0;r=dk.replace(/#/g,function(){return nums[i++]||''})}}
      if(r===null)for(var j=0;j<P.length;j++){var m=P[j][0].exec(k);if(m){var g=m.slice(1),i2=0;r=P[j][1].replace(/#/g,function(){var v=g[i2++]||'';var tv=dp<2?tr(v,dp+1):null;return tv!=null?tv:v});break}}
      if(r===null&&dp<2&&k.indexOf(' · ')>0){var ps=k.split(' · '),ch=false;for(var x=0;x<ps.length;x++){var tp=tr(ps[x],dp+1);if(tp!=null){ps[x]=tp;ch=true}}if(ch)r=ps.join(' · ')}
      if(r===null&&dp<2){var em=/^([^0-9A-Za-zÁÉÍÓÚÑáéíóúñ¿¡«(]+)(\S.*)$/.exec(k);if(em){var te=tr(em[2],dp+1);if(te!=null)r=em[1]+te}}
      if(r===null&&dp<2){var pm=/^(.+?)([,:.!]+)$/.exec(k);if(pm){var tq=tr(pm[1],dp+1);if(tq!=null)r=tq+pm[2]}}
    }
    if(C.size>5000)C.clear();C.set(k,r);return r}
  var DONE=new WeakMap();
  function text(n){var v=n.nodeValue;if(!v||DONE.get(n)===v)return;var r=tr(v);if(r!=null){var a=v.match(/^\s*/)[0],b=v.match(/\s*$/)[0];var o=a+r+b;DONE.set(n,o);n.nodeValue=o}else DONE.set(n,v)}
  var AT=['placeholder','title','aria-label'];
  function el(e){for(var i=0;i<AT.length;i++){var v=e.getAttribute&&e.getAttribute(AT[i]);if(v){var r=tr(v);if(r!=null)e.setAttribute(AT[i],r)}}}
  function walk(root){
    if(!root)return;
    if(root.nodeType===3){if(!(root.parentNode&&SKIP[root.parentNode.nodeName]))text(root);return}
    if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
    if(root.nodeType===1){if(SKIP[root.nodeName]||root.hasAttribute('data-noi18n'))return;el(root)}
    var w=document.createTreeWalker(root,5,{acceptNode:function(n){if(n.nodeType===1){if(SKIP[n.nodeName]||n.hasAttribute('data-noi18n'))return 2;el(n);return 3}return 1}});
    var n;while((n=w.nextNode()))text(n)}
  var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];
    if(m.type==='characterData')text(m.target);
    else if(m.type==='attributes')el(m.target);
    else for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j])}
    if(document.title){var t=tr(document.title);if(t)document.title=t}});
  mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:AT});
  document.addEventListener('DOMContentLoaded',function(){walk(document.body);var t=tr(document.title);if(t)document.title=t});
})();
