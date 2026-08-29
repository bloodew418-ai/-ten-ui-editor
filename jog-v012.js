(function(){
'use strict';
function $(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fire(el,type){el.dispatchEvent(new Event(type,{bubbles:true}))}
function boot(){
  if(window.__TEN_JOG_014__) return;
  var oldFab=$('quickFab'); if(!oldFab) return;
  window.__TEN_JOG_014__=true;
  var fab=oldFab.cloneNode(true); oldFab.parentNode.replaceChild(fab,oldFab);
  var brand=document.querySelector('.brand span'); if(brand) brand.textContent='v0.1.4';
  var quickMenu=$('quickMenu'); if(quickMenu) quickMenu.classList.remove('open');
  var sheet=$('quickSheet'), title=$('quickTitle'), controls=$('quickControls'), close=$('quickClose');
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
  var STEP=24, BASE=186, ROT_MIN=-120, ROT_MAX=0, R=133, CX=170, CY=170;
  var rot=0, drag=false, moved=false, pointerId=null, startA=0, startR=0, startX=0, startY=0, startT=0;
  var centerX=0,centerY=0,pressedIndex=-1,snapRAF=0,lastMode='position';
  var TAP_PX=12,TAP_MS=350;
  var jog=document.createElement('div'); jog.id='tenJog'; jog.setAttribute('aria-hidden','true');
  jog.innerHTML='<svg id="tenJogSvg" viewBox="0 0 340 340" aria-hidden="true"><g id="tenJogSegments"></g></svg><div id="tenJogItems"></div>';
  document.body.appendChild(jog);
  var segGroup=$('tenJogSegments'),itemBox=$('tenJogItems');
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
      var p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d',sectorPath(a0,a1,96,170));
      p.setAttribute('class','ten-jog-seg '+(i%2?'b':'a'));
      p.dataset.j=i; segGroup.appendChild(p);
    });
    [BASE-STEP/2,BASE+(ITEMS.length-1)*STEP+STEP/2].forEach(function(a){
      var p0=polar(96,a),p1=polar(170,a),ln=document.createElementNS('http://www.w3.org/2000/svg','path');
      ln.setAttribute('d','M'+p0[0]+' '+p0[1]+' L'+p1[0]+' '+p1[1]);ln.setAttribute('class','ten-jog-cap');segGroup.appendChild(ln);
    });
  }
  function buildItems(){
    ITEMS.forEach(function(it,i){
      var b=document.createElement('button');b.className='ten-jog-item';b.dataset.j=i;b.type='button';
      var icon=document.createElement('b');icon.textContent=it.i;var lab=document.createElement('span');lab.textContent=it.l;b.append(icon,lab);itemBox.appendChild(b);
    });
  }
  buildRing();buildItems();
  function rawAngle(i){return BASE+i*STEP+rot}
  function isVisible(a){var n=((a%360)+360)%360;return n>=174&&n<=282}
  function activeIndex(){var target=234,bi=0,bd=999;ITEMS.forEach(function(_,i){var d=Math.abs(rawAngle(i)-target);if(d<bd){bd=d;bi=i}});return bi}
  function draw(){
    segGroup.setAttribute('transform','rotate('+rot+' '+CX+' '+CY+')');
    var ai=activeIndex();
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
  function snap(){var i=activeIndex();animateTo(234-(BASE+i*STEP))}
  function measureSheet(){if(!sheet)return;requestAnimationFrame(function(){document.documentElement.style.setProperty('--ten-sheet-h',(sheet.getBoundingClientRect().height+8)+'px');cacheCenter()})}
  function closeSheet(){if(sheet)sheet.classList.remove('open');document.body.classList.remove('ten-qsheet');fab.classList.remove('sheet-open');document.documentElement.style.setProperty('--ten-sheet-h','0px');cacheCenter()}
  function openJog(){if(fab.disabled)return;closeSheet();jog.classList.add('open');jog.setAttribute('aria-hidden','false');fab.classList.add('jog-open');fab.textContent='×';fab.setAttribute('aria-label','ジョグを閉じる');draw();cacheCenter()}
  function closeJog(){jog.classList.remove('open');jog.setAttribute('aria-hidden','true');fab.classList.remove('jog-open');fab.textContent='☰';fab.setAttribute('aria-label','選択要素メニュー');pressedIndex=-1;draw()}
  function toggleJog(){if(jog.classList.contains('open')){closeSheet();closeJog()}else openJog()}
  function makeRange(label,id){
    var src=$(id);if(!src)return;var row=document.createElement('div');row.className='ten-qrow';row.dataset.src=id;
    var lab=document.createElement('label');lab.textContent=label;var val=document.createElement('div');val.className='ten-qval';val.textContent=Math.round(Number(src.value)||0);
    var rng=document.createElement('input');rng.type='range';rng.min=src.min;rng.max=src.max;rng.step=src.step||1;rng.value=src.value;
    rng.addEventListener('input',function(){src.value=rng.value;fire(src,'input');val.textContent=Math.round(Number(rng.value)||0)});
    rng.addEventListener('change',function(){src.value=rng.value;fire(src,'change')});row.append(lab,val,rng);controls.appendChild(row);
  }
  function makeColor(label,id){
    var src=$(id);if(!src)return;var row=document.createElement('div');row.className='ten-qcolor';var lab=document.createElement('label');lab.textContent=label;
    var c=document.createElement('input');c.type='color';c.value=src.value||'#ffffff';var code=document.createElement('code');code.textContent=c.value;
    c.addEventListener('input',function(){src.value=c.value;fire(src,'input');code.textContent=c.value});c.addEventListener('change',function(){src.value=c.value;fire(src,'change')});row.append(lab,c,code);controls.appendChild(row);
  }
  function makeOrder(){
    var row=document.createElement('div');row.className='ten-order';var f=document.createElement('button'),b=document.createElement('button');f.textContent='前面へ';b.textContent='背面へ';
    f.addEventListener('click',function(){var x=$('bFwd');if(x)x.click()});b.addEventListener('click',function(){var x=$('bBwd');if(x)x.click()});row.append(f,b);controls.appendChild(row);
  }
  function showSheet(mode){
    if(!sheet||!controls)return;controls.innerHTML='';lastMode=mode;
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
  function choose(mode){if(mode==='detail'){closeSheet();closeJog();var p=$('panel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});return}showSheet(mode)}
  function indexFromTarget(target){var b=target.closest&&target.closest('.ten-jog-item');return b?Number(b.dataset.j):-1}
  function beginGesture(ev){
    if(drag||ev.pointerType==='mouse'&&ev.button!==0)return;
    drag=true;moved=false;pointerId=ev.pointerId;startX=ev.clientX;startY=ev.clientY;startT=performance.now();cacheCenter();startA=angle(ev);startR=rot;pressedIndex=indexFromTarget(ev.target);draw();
    try{jog.setPointerCapture(pointerId)}catch(_){}
  }
  function moveGesture(ev){
    if(!drag||ev.pointerId!==pointerId)return;var dx=ev.clientX-startX,dy=ev.clientY-startY,px=Math.hypot(dx,dy);
    if(!moved&&px>TAP_PX){moved=true;pressedIndex=-1}
    if(moved){rot=clamp(startR+shortDelta(angle(ev),startA),ROT_MIN,ROT_MAX);draw()}
  }
  function endGesture(ev){
    if(!drag||ev.pointerId!==pointerId)return;var duration=performance.now()-startT,idx=indexFromTarget(ev.target),wasMoved=moved;
    drag=false;try{jog.releasePointerCapture(pointerId)}catch(_){}pointerId=null;pressedIndex=-1;draw();
    if(!wasMoved&&duration<=TAP_MS&&idx>=0){choose(ITEMS[idx].m)}else snap();
  }
  function cancelGesture(){if(!drag)return;drag=false;pointerId=null;pressedIndex=-1;snap()}
  var fabDown=null;
  fab.addEventListener('pointerdown',function(ev){if(fab.disabled)return;fabDown={id:ev.pointerId,x:ev.clientX,y:ev.clientY};try{fab.setPointerCapture(ev.pointerId)}catch(_){}});
  fab.addEventListener('pointerup',function(ev){if(!fabDown||fabDown.id!==ev.pointerId)return;var d=Math.hypot(ev.clientX-fabDown.x,ev.clientY-fabDown.y);fabDown=null;if(d<=12){ev.preventDefault();ev.stopPropagation();toggleJog()}});
  fab.addEventListener('pointercancel',function(){fabDown=null});
  jog.addEventListener('pointerdown',beginGesture);jog.addEventListener('pointermove',moveGesture);jog.addEventListener('pointerup',endGesture);jog.addEventListener('pointercancel',cancelGesture);
  if(close)close.addEventListener('click',function(){closeSheet();cacheCenter()});
  function anchor(){
    var vv=window.visualViewport,gap=0;
    if(vv){gap=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);if(vv.scale&&Math.abs(vv.scale-1)>.02&&jog.classList.contains('open')){closeSheet();closeJog()}}
    document.documentElement.style.setProperty('--ten-bottom',gap+'px');requestAnimationFrame(cacheCenter);
  }
  var anchorRAF=0;function scheduleAnchor(){if(anchorRAF)return;anchorRAF=requestAnimationFrame(function(){anchorRAF=0;anchor()})}
  if(window.visualViewport){visualViewport.addEventListener('resize',scheduleAnchor);visualViewport.addEventListener('scroll',scheduleAnchor)}
  window.addEventListener('resize',scheduleAnchor);window.addEventListener('orientationchange',scheduleAnchor);
  anchor();draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
