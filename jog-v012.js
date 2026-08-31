(function(){
'use strict';
function $(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fire(el,type){el.dispatchEvent(new Event(type,{bubbles:true}))}
function svgEl(n){return document.createElementNS('http://www.w3.org/2000/svg',n)}
function boot(){
  if(window.__TEN_JOG_016__) return;
  var oldFab=$('quickFab'); if(!oldFab) return;
  window.__TEN_JOG_016__=true;
  var fab=oldFab.cloneNode(true); oldFab.parentNode.replaceChild(fab,oldFab);
  var brand=document.querySelector('.brand span'); if(brand) brand.textContent='v0.1.6';
  var quickMenu=$('quickMenu'); if(quickMenu) quickMenu.classList.remove('open');
  var sheet=$('quickSheet'), title=$('quickTitle'), controls=$('quickControls'), close=$('quickClose');
  if(close){close.textContent='×';close.setAttribute('aria-label','スライダータブを閉じる')}

  var ITEMS=[
    {m:'position',l:'位置',i:'✣'},
    {m:'width',l:'幅',i:'↔'},
    {m:'height',l:'高さ',i:'↕'},
    {m:'text',l:'文字',i:'A'},
    {m:'radius',l:'角丸',i:'○'},
    {m:'ink',l:'文字色',i:'T'},
    {m:'fill',l:'背景色',i:'●'},
    {m:'order',l:'重ね順',i:'⇅'},
    {m:'detail',l:'詳細',i:'⋯'}
  ];

  /* The wheel is a full 340px disk whose centre is placed exactly at viewport bottom-right.
     Only the upper-left quarter is therefore visible. */
  var STEP=24, BASE=201, ROT_MIN=-168, ROT_MAX=24, R=133, CX=170, CY=170;
  var R_OUT_I=96, R_OUT_O=170;
  var R_MID_I=55, R_MID_O=97;
  var R_IN=56;
  var MID_A0=180, MID_SPLIT=225, MID_A1=270, MID_ICON_R=76;
  var ACTIVE_ANGLE=225;

  var rot=0, drag=false, moved=false, pointerId=null, startA=0, startR=0, startX=0, startY=0, startT=0;
  var centerX=0,centerY=0,pressedIndex=-1,selectedIndex=-1,snapRAF=0,lastMode='position';
  var TAP_PX=12,TAP_MS=350,MID_TAP_PX=16;

  var jog=document.createElement('div'); jog.id='tenJog'; jog.setAttribute('aria-hidden','true');
  jog.innerHTML=
    '<svg id="tenJogSvg" viewBox="0 0 340 340" aria-hidden="true">'
    +'<circle class="ten-jog-plate" cx="170" cy="170" r="133" fill="none" stroke="#1b1e26" stroke-width="74"></circle>'
    +'<g id="tenJogSegments"></g>'
    +'<circle class="ten-jog-plate" cx="170" cy="170" r="76" fill="none" stroke="#232733" stroke-width="42"></circle>'
    +'<circle class="ten-jog-plate" cx="170" cy="170" r="56" fill="#232733"></circle>'
    +'<g id="tenJogMid"></g>'
    +'</svg><div id="tenJogItems"></div>';
  document.body.appendChild(jog);
  var segGroup=$('tenJogSegments'),midGroup=$('tenJogMid'),itemBox=$('tenJogItems');

  /* Direct-number editor. It floats above the iPhone keyboard so the sheet itself never has to move. */
  var numEditor=document.createElement('div');
  numEditor.id='tenNumEditor';
  numEditor.setAttribute('aria-hidden','true');
  numEditor.innerHTML='<input id="tenNumInput" type="number" aria-label="数値を入力"><button id="tenNumDone" type="button">確定</button>';
  document.body.appendChild(numEditor);
  var numInput=$('tenNumInput'),numDone=$('tenNumDone'),numCtx=null;

  function polar(r,a){var t=a*Math.PI/180;return [CX+Math.cos(t)*r,CY+Math.sin(t)*r]}
  function sectorPath(a0,a1,ri,ro){
    var p0=polar(ro,a0),p1=polar(ro,a1),p2=polar(ri,a1),p3=polar(ri,a0);
    var large=Math.abs(a1-a0)>180?1:0;
    return 'M'+p0[0]+' '+p0[1]+' A'+ro+' '+ro+' 0 '+large+' 1 '+p1[0]+' '+p1[1]+' L'+p2[0]+' '+p2[1]+' A'+ri+' '+ri+' 0 '+large+' 0 '+p3[0]+' '+p3[1]+' Z';
  }

  function buildRing(){
    while(segGroup.firstChild)segGroup.removeChild(segGroup.firstChild);
    ITEMS.forEach(function(_,i){
      var c=BASE+i*STEP,a0=c-STEP/2,a1=c+STEP/2;
      var p=svgEl('path');
      p.setAttribute('d',sectorPath(a0,a1,R_OUT_I,R_OUT_O));
      p.setAttribute('class','ten-jog-seg '+(i%2?'b':'a'));
      p.setAttribute('data-j',String(i));
      segGroup.appendChild(p);
    });
  }

  function buildMid(){
    while(midGroup.firstChild)midGroup.removeChild(midGroup.firstChild);
    [['undo',MID_A0,MID_SPLIT],['redo',MID_SPLIT,MID_A1]].forEach(function(d){
      var p=svgEl('path');
      p.setAttribute('d',sectorPath(d[1],d[2],R_MID_I,R_MID_O));
      p.setAttribute('class','ten-jog-mid');
      p.setAttribute('data-act',d[0]);
      p.setAttribute('data-nojog','1');
      p.addEventListener('pointerdown',midDown);
      p.addEventListener('pointermove',midMove);
      p.addEventListener('pointerup',midUp);
      p.addEventListener('pointercancel',midCancel);
      midGroup.appendChild(p);
    });
    [MID_A0,MID_SPLIT,MID_A1].forEach(function(a){
      var p0=polar(R_MID_I,a),p1=polar(R_MID_O,a),ln=svgEl('path');
      ln.setAttribute('d','M'+p0[0]+' '+p0[1]+' L'+p1[0]+' '+p1[1]);
      ln.setAttribute('class','ten-jog-div');
      midGroup.appendChild(ln);
    });
    [['undo',(MID_A0+MID_SPLIT)/2,'\u21B6'],['redo',(MID_SPLIT+MID_A1)/2,'\u21B7']].forEach(function(d){
      var c=polar(MID_ICON_R,d[1]),t=svgEl('text');
      t.setAttribute('x',c[0]);t.setAttribute('y',c[1]);t.setAttribute('dy','.36em');
      t.setAttribute('class','ten-jog-hicon');t.setAttribute('data-act',d[0]);
      t.textContent=d[2];
      midGroup.appendChild(t);
    });
    syncHistory();
  }

  function buildItems(){
    ITEMS.forEach(function(it,i){
      var b=document.createElement('button');b.className='ten-jog-item';b.dataset.j=i;b.type='button';
      var icon=document.createElement('b'),lab=document.createElement('span');
      icon.textContent=it.i;lab.textContent=it.l;b.append(icon,lab);itemBox.appendChild(b);
    });
  }

  function histBtn(act){return $(act==='undo'?'bUndo':'bRedo')}
  function syncHistory(){
    Array.prototype.forEach.call(midGroup.querySelectorAll('[data-act]'),function(el){
      var src=histBtn(el.getAttribute('data-act'));
      el.classList.toggle('dis',!src||src.disabled);
    });
  }

  var midPointer=null,midAct=null,midEl=null,midX=0,midY=0;
  function midReset(){if(midEl)midEl.classList.remove('pressed');midPointer=null;midAct=null;midEl=null}
  function midDown(ev){
    if(!jog.classList.contains('open'))return;
    ev.stopPropagation();ev.preventDefault();
    if(midPointer!==null)return;
    midPointer=ev.pointerId;midAct=this.getAttribute('data-act');midEl=this;midX=ev.clientX;midY=ev.clientY;
    this.classList.add('pressed');
    try{this.setPointerCapture(ev.pointerId)}catch(_){}
  }
  function midMove(ev){if(midPointer!==ev.pointerId)return;ev.stopPropagation();ev.preventDefault()}
  function midUp(ev){
    if(midPointer!==ev.pointerId)return;
    ev.stopPropagation();ev.preventDefault();
    try{this.releasePointerCapture(ev.pointerId)}catch(_){}
    var dx=ev.clientX-midX,dy=ev.clientY-midY,act=midAct;
    midReset();
    if(Math.hypot(dx,dy)<=MID_TAP_PX){
      var b=histBtn(act);
      if(b&&!b.disabled){b.click();syncHistory();refreshSheet()}
    }
  }
  function midCancel(ev){if(midPointer===ev.pointerId)midReset()}

  function refreshSheet(){
    if(!sheet||!sheet.classList.contains('open'))return;
    Array.prototype.forEach.call(controls.querySelectorAll('.ten-qrow'),function(row){
      var src=$(row.dataset.src||'');if(!src)return;
      var rng=row.querySelector('input[type=range]'),val=row.querySelector('.ten-qval');
      if(!rng||!val)return;
      rng.min=src.min;rng.max=src.max;rng.step=src.step||1;rng.value=src.value;
      val.textContent=Math.round(Number(src.value)||0);
    });
  }

  function normaliseNumber(raw,src){
    if(raw===''||raw==='-'||raw==='.'||raw==='-.')return null;
    var n=Number(raw);if(!Number.isFinite(n))return null;
    var min=Number(src.min||-999999),max=Number(src.max||999999),step=Number(src.step||1)||1;
    n=clamp(n,min,max);
    n=Math.round((n-min)/step)*step+min;
    n=clamp(n,min,max);
    return n;
  }
  function applyNumberEditor(commit){
    if(!numCtx)return false;
    var n=normaliseNumber(numInput.value,numCtx.src);if(n===null)return false;
    numCtx.src.value=String(n);numCtx.rng.value=String(n);numCtx.val.textContent=Math.round(n);
    fire(numCtx.src,'input');
    if(commit)fire(numCtx.src,'change');
    return true;
  }
  function positionNumberEditor(){
    if(!numCtx)return;
    var vv=window.visualViewport;
    if(vv){
      numEditor.style.left=(vv.offsetLeft+vv.width/2)+'px';
      numEditor.style.top=(vv.offsetTop+vv.height-10)+'px';
    }else{
      numEditor.style.left='50%';
      numEditor.style.top='calc(100vh - 12px)';
    }
  }
  function closeNumberEditor(commit){
    if(!numCtx)return;
    if(commit)applyNumberEditor(true);
    numEditor.classList.remove('open');numEditor.setAttribute('aria-hidden','true');
    document.body.classList.remove('ten-num-editing');
    try{numInput.blur()}catch(_){}
    numCtx=null;
  }
  function openNumberEditor(src,rng,val){
    if(numCtx)closeNumberEditor(true);
    numCtx={src:src,rng:rng,val:val};
    if(Number(src.min)<0){numInput.type='text';numInput.setAttribute('inputmode','text')}else{numInput.type='number';numInput.setAttribute('inputmode','numeric')}
    numInput.min=src.min||'';numInput.max=src.max||'';numInput.step=src.step||'1';numInput.value=String(src.value||0);
    numEditor.classList.add('open');numEditor.setAttribute('aria-hidden','false');document.body.classList.add('ten-num-editing');
    positionNumberEditor();
    requestAnimationFrame(function(){
      try{numInput.focus({preventScroll:true})}catch(_){numInput.focus()}
      try{numInput.select()}catch(_){}
      positionNumberEditor();
    });
  }
  numInput.addEventListener('input',function(){applyNumberEditor(false)});
  numInput.addEventListener('keydown',function(ev){
    if(ev.key==='Enter'){ev.preventDefault();closeNumberEditor(true)}
    else if(ev.key==='Escape'){ev.preventDefault();closeNumberEditor(false)}
  });
  numDone.addEventListener('pointerdown',function(ev){ev.preventDefault();ev.stopPropagation()});
  numDone.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();closeNumberEditor(true)});
  document.addEventListener('pointerdown',function(ev){
    if(!numCtx)return;
    if(numEditor.contains(ev.target))return;
    if(ev.target&&ev.target.closest&&ev.target.closest('.ten-qval'))return;
    closeNumberEditor(true);
  },true);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',positionNumberEditor);
    window.visualViewport.addEventListener('scroll',positionNumberEditor);
  }

  buildRing();buildItems();buildMid();
  try{
    var histObs=new MutationObserver(function(){syncHistory()});
    ['bUndo','bRedo'].forEach(function(id){var b=$(id);if(b)histObs.observe(b,{attributes:true,attributeFilter:['disabled']})});
  }catch(_){}

  function rawAngle(i){return BASE+i*STEP+rot}
  function isVisible(a){var n=((a%360)+360)%360;return n>=180&&n<=270}
  function activeIndex(){var bi=0,bd=999;ITEMS.forEach(function(_,i){var d=Math.abs(rawAngle(i)-ACTIVE_ANGLE);if(d<bd){bd=d;bi=i}});return bi}
  function draw(){
    segGroup.setAttribute('transform','rotate('+rot+' '+CX+' '+CY+')');
    var ai=selectedIndex>=0?selectedIndex:activeIndex();
    Array.prototype.forEach.call(itemBox.children,function(b,i){
      var a=rawAngle(i),t=a*Math.PI/180;
      b.style.left=(CX+Math.cos(t)*R)+'px';b.style.top=(CY+Math.sin(t)*R)+'px';
      b.style.opacity=isVisible(a)?'1':'0';b.style.pointerEvents=isVisible(a)?'auto':'none';
      b.classList.toggle('active',i===ai);b.classList.toggle('pressed',i===pressedIndex);
    });
    Array.prototype.forEach.call(segGroup.querySelectorAll('.ten-jog-seg'),function(p,i){p.classList.toggle('active',i===ai)});
  }

  function cacheCenter(){var r=jog.getBoundingClientRect();centerX=r.left+r.width/2;centerY=r.top+r.height/2}
  function angle(ev){return Math.atan2(ev.clientY-centerY,ev.clientX-centerX)*180/Math.PI}
  function shortDelta(a,b){var d=a-b;while(d>180)d-=360;while(d<-180)d+=360;return d}
  function animateTo(target){
    if(snapRAF)cancelAnimationFrame(snapRAF);target=clamp(target,ROT_MIN,ROT_MAX);
    var from=rot,d=target-from,start=performance.now(),dur=160;
    function frame(now){var t=Math.min(1,(now-start)/dur),e=1-Math.pow(1-t,3);rot=from+d*e;draw();if(t<1)snapRAF=requestAnimationFrame(frame);else snapRAF=0}
    snapRAF=requestAnimationFrame(frame);
  }
  function snap(){var i=activeIndex();animateTo(ACTIVE_ANGLE-(BASE+i*STEP))}
  function measureSheet(){if(!sheet)return;requestAnimationFrame(function(){document.documentElement.style.setProperty('--ten-sheet-h',(sheet.getBoundingClientRect().height+8)+'px');cacheCenter()})}
  function closeSheet(){
    closeNumberEditor(true);
    if(sheet)sheet.classList.remove('open');
    document.body.classList.remove('ten-qsheet');fab.classList.remove('sheet-open');
    document.documentElement.style.setProperty('--ten-sheet-h','0px');cacheCenter();
  }
  function openJog(){
    if(fab.disabled)return;
    closeSheet();jog.classList.add('open');jog.setAttribute('aria-hidden','false');
    fab.classList.add('jog-open');fab.textContent='×';fab.setAttribute('aria-label','メニューを閉じる');
    syncHistory();draw();cacheCenter();
  }
  function closeJog(){
    jog.classList.remove('open');jog.setAttribute('aria-hidden','true');fab.classList.remove('jog-open');
    fab.textContent='☰';fab.setAttribute('aria-label','選択要素メニュー');pressedIndex=-1;midReset();draw();
  }
  function toggleJog(){if(jog.classList.contains('open')){closeSheet();closeJog()}else openJog()}

  function setRangeFromPointer(rng,src,val,ev,commit){
    var r=rng.getBoundingClientRect(),min=Number(rng.min||0),max=Number(rng.max||100),step=Number(rng.step||1)||1;
    var ratio=clamp((ev.clientX-r.left)/Math.max(1,r.width),0,1),raw=min+(max-min)*ratio;
    var next=Math.round((raw-min)/step)*step+min;next=clamp(next,min,max);
    rng.value=String(next);src.value=String(next);fire(src,'input');val.textContent=Math.round(Number(next)||0);
    if(commit)fire(src,'change');
  }
  function makeRange(label,id){
    var src=$(id);if(!src)return;
    var row=document.createElement('div');row.className='ten-qrow';row.dataset.src=id;
    var lab=document.createElement('label');lab.textContent=label;
    var val=document.createElement('button');val.type='button';val.className='ten-qval';val.textContent=Math.round(Number(src.value)||0);val.setAttribute('aria-label',label+'の数値を直接入力');
    var rng=document.createElement('input');rng.type='range';rng.min=src.min;rng.max=src.max;rng.step=src.step||1;rng.value=src.value;
    val.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();openNumberEditor(src,rng,val)});
    var rangePointer=null;
    rng.addEventListener('pointerdown',function(ev){rangePointer=ev.pointerId;ev.preventDefault();ev.stopPropagation();document.body.classList.add('ten-range-drag');try{rng.setPointerCapture(ev.pointerId)}catch(_){}setRangeFromPointer(rng,src,val,ev,false)});
    rng.addEventListener('pointermove',function(ev){if(rangePointer!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();setRangeFromPointer(rng,src,val,ev,false)});
    rng.addEventListener('pointerup',function(ev){if(rangePointer!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();setRangeFromPointer(rng,src,val,ev,true);try{rng.releasePointerCapture(ev.pointerId)}catch(_){}rangePointer=null;document.body.classList.remove('ten-range-drag')});
    rng.addEventListener('pointercancel',function(){rangePointer=null;document.body.classList.remove('ten-range-drag')});
    rng.addEventListener('input',function(){src.value=rng.value;fire(src,'input');val.textContent=Math.round(Number(rng.value)||0)});
    rng.addEventListener('change',function(){src.value=rng.value;fire(src,'change')});
    row.append(lab,val,rng);controls.appendChild(row);
  }
  function makeColor(label,id){
    var src=$(id);if(!src)return;var row=document.createElement('div');row.className='ten-qcolor';var lab=document.createElement('label');lab.textContent=label;
    var c=document.createElement('input');c.type='color';c.value=src.value||'#ffffff';var code=document.createElement('code');code.textContent=c.value;
    c.addEventListener('input',function(){src.value=c.value;fire(src,'input');code.textContent=c.value});
    c.addEventListener('change',function(){src.value=c.value;fire(src,'change')});
    row.append(lab,c,code);controls.appendChild(row);
  }
  function makeOrder(){
    var row=document.createElement('div');row.className='ten-order';var f=document.createElement('button'),b=document.createElement('button');
    f.textContent='前面へ';b.textContent='背面へ';
    f.addEventListener('click',function(){var x=$('bFwd');if(x)x.click()});
    b.addEventListener('click',function(){var x=$('bBwd');if(x)x.click()});
    row.append(f,b);controls.appendChild(row);
  }
  function showSheet(mode){
    if(!sheet||!controls)return;closeNumberEditor(true);controls.innerHTML='';lastMode=mode;
    if(mode==='position'){title.textContent='位置（X / Y）';makeRange('X','rX');makeRange('Y','rY')}
    else if(mode==='width'){title.textContent='幅';makeRange('幅','rW')}
    else if(mode==='height'){title.textContent='高さ';makeRange('高さ','rH')}
    else if(mode==='text'){title.textContent='文字サイズ';makeRange('文字','rF')}
    else if(mode==='radius'){title.textContent='角丸';makeRange('角丸','rR')}
    else if(mode==='ink'){title.textContent='文字色';makeColor('文字色','cInk')}
    else if(mode==='fill'){title.textContent='背景色';makeColor('背景色','cFill')}
    else if(mode==='order'){title.textContent='重ね順';makeOrder()}
    sheet.classList.add('open');document.body.classList.add('ten-qsheet');fab.classList.add('sheet-open');measureSheet();
  }
  function choose(mode){
    var idx=ITEMS.findIndex(function(it){return it.m===mode});if(idx>=0)selectedIndex=idx;draw();
    if(mode==='detail'){closeSheet();closeJog();var p=$('panel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});return}
    showSheet(mode);
  }

  function indexFromTarget(target){var b=target.closest&&target.closest('.ten-jog-item');return b?Number(b.dataset.j):-1}
  function fromMiddle(target){return !!(target&&target.closest&&target.closest('[data-nojog]'))}
  function beginGesture(ev){
    if(drag||ev.pointerType==='mouse'&&ev.button!==0)return;
    if(fromMiddle(ev.target))return;
    drag=true;moved=false;pointerId=ev.pointerId;startX=ev.clientX;startY=ev.clientY;startT=performance.now();
    cacheCenter();startA=angle(ev);startR=rot;pressedIndex=indexFromTarget(ev.target);draw();
    try{jog.setPointerCapture(pointerId)}catch(_){}
  }
  function moveGesture(ev){
    if(!drag||ev.pointerId!==pointerId)return;
    var dx=ev.clientX-startX,dy=ev.clientY-startY,px=Math.hypot(dx,dy);
    if(!moved&&px>TAP_PX){moved=true;pressedIndex=-1}
    if(moved){ev.preventDefault();rot=clamp(startR+shortDelta(angle(ev),startA),ROT_MIN,ROT_MAX);draw()}
  }
  function endGesture(ev){
    if(!drag||ev.pointerId!==pointerId)return;
    var duration=performance.now()-startT,idx=indexFromTarget(ev.target),wasMoved=moved;
    drag=false;try{jog.releasePointerCapture(pointerId)}catch(_){}pointerId=null;pressedIndex=-1;draw();
    if(!wasMoved&&duration<=TAP_MS&&idx>=0){choose(ITEMS[idx].m)}else snap();
  }
  function cancelGesture(){if(!drag)return;drag=false;pointerId=null;pressedIndex=-1;snap()}

  var fabPointer=null;
  fab.style.touchAction='manipulation';
  fab.addEventListener('pointerdown',function(ev){
    if(fab.disabled)return;fabPointer=ev.pointerId;ev.preventDefault();ev.stopPropagation();
    try{fab.setPointerCapture(ev.pointerId)}catch(_){}
  });
  fab.addEventListener('pointerup',function(ev){
    if(fab.disabled||fabPointer!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();
    try{fab.releasePointerCapture(ev.pointerId)}catch(_){}fabPointer=null;toggleJog();
  });
  fab.addEventListener('pointercancel',function(ev){if(fabPointer===ev.pointerId)fabPointer=null});
  fab.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation()});

  jog.addEventListener('pointerdown',beginGesture);jog.addEventListener('pointermove',moveGesture);jog.addEventListener('pointerup',endGesture);jog.addEventListener('pointercancel',cancelGesture);
  if(close)close.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();closeSheet();cacheCenter()});

  function anchor(){document.documentElement.style.setProperty('--ten-bottom','0px');requestAnimationFrame(cacheCenter)}
  var anchorRAF=0;function scheduleAnchor(){if(anchorRAF)return;anchorRAF=requestAnimationFrame(function(){anchorRAF=0;anchor()})}
  window.addEventListener('resize',scheduleAnchor);window.addEventListener('orientationchange',scheduleAnchor);
  anchor();draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();