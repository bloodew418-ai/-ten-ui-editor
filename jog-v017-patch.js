(function(){
'use strict';
function $(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fire(el,type){el.dispatchEvent(new Event(type,{bubbles:true}))}

function boot(){
  if(window.__TEN_JOG_017_PATCH__)return;
  var jog=$('tenJog'),mid=$('tenJogMid'),sheet=$('quickSheet');
  if(!jog||!mid||!sheet){setTimeout(boot,30);return}
  window.__TEN_JOG_017_PATCH__=true;
  var brand=document.querySelector('.brand span');if(brand)brand.textContent='v0.1.8';

  /* Keep edge-positioned outer tabs fully inside the visible quarter of the viewport.
     The wheel geometry and its 340px open footprint do not change; only label/button centres
     are nudged inward when a tab reaches the bottom or right edge. */
  var itemBox=$('tenJogItems');
  function keepOuterTabsInside(){
    if(!itemBox)return;
    var MAX_X=136,MAX_Y=132;
    Array.prototype.forEach.call(itemBox.children,function(b){
      var x=parseFloat(b.style.left),y=parseFloat(b.style.top);
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      var nx=Math.min(x,MAX_X),ny=Math.min(y,MAX_Y);
      if(nx!==x)b.style.left=nx+'px';
      if(ny!==y)b.style.top=ny+'px';
    });
  }
  if(itemBox){
    try{
      var edgeObs=new MutationObserver(function(){keepOuterTabsInside()});
      edgeObs.observe(itemBox,{subtree:true,attributes:true,attributeFilter:['style']});
    }catch(_){}
    requestAnimationFrame(keepOuterTabsInside);
  }

  function syncOpenSheet(){
    if(!sheet.classList.contains('open'))return;
    requestAnimationFrame(function(){
      Array.prototype.forEach.call(sheet.querySelectorAll('.ten-qrow'),function(row){
        var src=$(row.dataset.src||''),rng=row.querySelector('input[type=range]'),val=row.querySelector('.ten-qval');
        if(!src||!rng||!val)return;
        rng.min=src.min;rng.max=src.max;rng.step=src.step||1;rng.value=src.value;
        val.textContent=Math.round(Number(src.value)||0);
      });
    });
  }

  /* --- Undo / Redo: replace v0.1.6 sector listeners so one physical tap == one history step. --- */
  Array.prototype.slice.call(mid.querySelectorAll('.ten-jog-mid')).forEach(function(old){
    var el=old.cloneNode(true),state=null;
    old.parentNode.replaceChild(el,old);
    el.addEventListener('pointerdown',function(ev){
      if(el.classList.contains('dis'))return;
      ev.preventDefault();ev.stopPropagation();
      state={id:ev.pointerId,x:ev.clientX,y:ev.clientY,act:el.getAttribute('data-act')};
      el.classList.add('pressed');
      try{el.setPointerCapture(ev.pointerId)}catch(_){}
    });
    el.addEventListener('pointermove',function(ev){
      if(!state||state.id!==ev.pointerId)return;
      ev.preventDefault();ev.stopPropagation();
    });
    el.addEventListener('pointerup',function(ev){
      if(!state||state.id!==ev.pointerId)return;
      ev.preventDefault();ev.stopPropagation();
      try{el.releasePointerCapture(ev.pointerId)}catch(_){}
      var dx=ev.clientX-state.x,dy=ev.clientY-state.y,act=state.act;
      state=null;el.classList.remove('pressed');
      if(Math.hypot(dx,dy)>22)return;
      var src=$(act==='undo'?'bUndo':'bRedo');
      if(src&&!src.disabled){src.click();syncOpenSheet()}
    });
    el.addEventListener('pointercancel',function(ev){
      if(!state||state.id!==ev.pointerId)return;
      state=null;el.classList.remove('pressed');
    });
  });

  /* --- One-tap direct number editor. Focus happens synchronously inside pointerdown. --- */
  var oldEditor=$('tenNumEditor');if(oldEditor)oldEditor.style.display='none';
  var fast=document.createElement('div');
  fast.id='tenFastNumEditor';fast.setAttribute('aria-hidden','true');
  fast.innerHTML='<input id="tenFastNumInput" type="text" aria-label="数値を入力"><button id="tenFastNumDone" type="button">確定</button>';
  document.body.appendChild(fast);
  var input=$('tenFastNumInput'),done=$('tenFastNumDone'),ctx=null;

  function normalise(raw,src){
    if(raw===''||raw==='-'||raw==='.'||raw==='-.')return null;
    var n=Number(raw);if(!Number.isFinite(n))return null;
    var min=Number(src.min||-999999),max=Number(src.max||999999),step=Number(src.step||1)||1;
    n=clamp(n,min,max);n=Math.round((n-min)/step)*step+min;return clamp(n,min,max);
  }
  function apply(commit){
    if(!ctx)return false;
    var n=normalise(input.value,ctx.src);if(n===null)return false;
    ctx.src.value=String(n);ctx.rng.value=String(n);ctx.val.textContent=Math.round(n);
    fire(ctx.src,'input');if(commit)fire(ctx.src,'change');return true;
  }
  function position(){
    if(!ctx)return;
    var vv=window.visualViewport;
    if(vv){fast.style.left=(vv.offsetLeft+vv.width/2)+'px';fast.style.top=(vv.offsetTop+vv.height-8)+'px'}
    else{fast.style.left='50%';fast.style.top='calc(100vh - 12px)'}
  }
  function close(commit){
    if(!ctx)return;
    if(commit)apply(true);
    fast.classList.remove('open');fast.setAttribute('aria-hidden','true');
    document.body.classList.remove('ten-fast-num-editing');
    try{input.blur()}catch(_){}
    ctx=null;
  }
  function openFromVal(val){
    var row=val.closest('.ten-qrow');if(!row)return;
    var src=$(row.dataset.src||''),rng=row.querySelector('input[type=range]');if(!src||!rng)return;
    if(ctx)close(true);
    ctx={src:src,rng:rng,val:val};
    input.value=String(src.value||0);
    if(Number(src.min)<0){input.setAttribute('inputmode','text')}else{input.setAttribute('inputmode','decimal')}
    fast.classList.add('open');fast.setAttribute('aria-hidden','false');document.body.classList.add('ten-fast-num-editing');
    position();
    try{input.focus({preventScroll:true})}catch(_){input.focus()}
    try{input.select()}catch(_){}
    position();
  }

  input.addEventListener('input',function(){apply(false)});
  input.addEventListener('keydown',function(ev){
    if(ev.key==='Enter'){ev.preventDefault();close(true)}
    else if(ev.key==='Escape'){ev.preventDefault();close(false)}
  });
  done.addEventListener('pointerdown',function(ev){ev.preventDefault();ev.stopPropagation()});
  done.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();close(true)});

  document.addEventListener('pointerdown',function(ev){
    var val=ev.target&&ev.target.closest?ev.target.closest('.ten-qval'):null;
    if(val&&sheet.contains(val)){
      ev.preventDefault();ev.stopImmediatePropagation();
      openFromVal(val);return;
    }
    if(ctx&&!fast.contains(ev.target))close(true);
  },true);
  document.addEventListener('click',function(ev){
    var val=ev.target&&ev.target.closest?ev.target.closest('.ten-qval'):null;
    if(val&&sheet.contains(val)){ev.preventDefault();ev.stopImmediatePropagation()}
  },true);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',position);
    window.visualViewport.addEventListener('scroll',position);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
