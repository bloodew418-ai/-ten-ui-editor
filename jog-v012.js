(function(){
'use strict';
if(window.__TEN_JOG_013__) return; window.__TEN_JOG_013__=true;
function $(id){return document.getElementById(id)}
var oldFab=$('quickFab'); if(!oldFab) return;
var fab=oldFab.cloneNode(true); oldFab.parentNode.replaceChild(fab,oldFab);
var brand=document.querySelector('.brand span'); if(brand) brand.textContent='v0.1.3';
var quickMenu=$('quickMenu'); if(quickMenu) quickMenu.classList.remove('open');
var sheet=$('quickSheet'), title=$('quickTitle'), controls=$('quickControls'), close=$('quickClose');
var jog=document.createElement('div'); jog.id='tenJog'; jog.setAttribute('aria-hidden','true');
jog.innerHTML='<div id="tenJogRing"></div><div id="tenJogItems"></div><div id="tenJogHint">スライドで回転</div><button id="tenJogClose" aria-label="ジョグを閉じる">×</button>';
document.body.appendChild(jog);
var ITEMS=[
 {m:'position',l:'位置',i:'↕'},{m:'width',l:'幅',i:'↔'},{m:'height',l:'高さ',i:'↕'},
 {m:'text',l:'文字',i:'A'},{m:'radius',l:'角丸',i:'○'},{m:'ink',l:'文字色',i:'T'},
 {m:'fill',l:'背景色',i:'●'},{m:'front',l:'前面',i:'↑'},{m:'back',l:'背面',i:'↓'},{m:'detail',l:'詳細',i:'⋯'}
];
var step=360/ITEMS.length,target=225,rot=0;
var drag=false,moved=false,startA=0,startR=0,startX=0,startY=0,pointerId=null,downItem=null;
var TAP_PX=10, ROTATE_DEG=1.2;
function norm(v){v%=360;return v<0?v+360:v}
function delta(a,b){var d=norm(a-b);return d>180?d-360:d}
function angle(ev){var r=jog.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;return Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI}
function activeIndex(){var bi=0,bd=999;ITEMS.forEach(function(_,i){var d=Math.abs(delta(norm(i*step+rot),target));if(d<bd){bd=d;bi=i}});return bi}
function draw(){
 var box=$('tenJogItems');
 if(!box.children.length){ITEMS.forEach(function(it,i){var b=document.createElement('button');b.className='ten-jog-item';b.dataset.j=i;b.type='button';b.innerHTML='<b>'+it.i+'</b><span>'+it.l+'</span>';box.appendChild(b)})}
 $('tenJogRing').style.transform='rotate('+rot+'deg)'; var ai=activeIndex(),radius=126;
 Array.prototype.forEach.call(box.children,function(b,i){var a=(i*step+rot)*Math.PI/180;b.style.left=(170+Math.cos(a)*radius)+'px';b.style.top=(170+Math.sin(a)*radius)+'px';b.classList.toggle('active',i===ai)})
}
function snap(){var i=activeIndex();rot+=delta(target,i*step+rot);draw()}
function openJog(){if(fab.disabled)return;closeSheet();jog.classList.add('open');jog.setAttribute('aria-hidden','false');fab.classList.add('jog-open');draw();snap()}
function closeJog(){jog.classList.remove('open');jog.setAttribute('aria-hidden','true');fab.classList.remove('jog-open');resetGesture()}
function closeSheet(){if(sheet)sheet.classList.remove('open');document.body.classList.remove('ten-qsheet')}
function fire(el,type){el.dispatchEvent(new Event(type,{bubbles:true}))}
function makeRange(label,id){var src=$(id);if(!src)return;var row=document.createElement('div');row.className='ten-qrow';var lab=document.createElement('label');lab.textContent=label;var val=document.createElement('div');val.className='ten-qval';val.textContent=Math.round(Number(src.value)||0);var rng=document.createElement('input');rng.type='range';rng.min=src.min;rng.max=src.max;rng.step=src.step||1;rng.value=src.value;rng.addEventListener('input',function(){src.value=rng.value;fire(src,'input');val.textContent=Math.round(Number(rng.value)||0)});rng.addEventListener('change',function(){src.value=rng.value;fire(src,'change')});row.append(lab,val,rng);controls.appendChild(row)}
function makeColor(label,id){var src=$(id);if(!src)return;var row=document.createElement('div');row.className='ten-qcolor';var lab=document.createElement('label');lab.textContent=label;var c=document.createElement('input');c.type='color';c.value=src.value||'#ffffff';var code=document.createElement('code');code.textContent=c.value;c.addEventListener('input',function(){src.value=c.value;fire(src,'input');code.textContent=c.value});c.addEventListener('change',function(){src.value=c.value;fire(src,'change')});row.append(lab,c,code);controls.appendChild(row)}
function showSheet(mode){if(!sheet||!controls)return;controls.innerHTML='';if(mode==='position'){title.textContent='位置（X / Y）';makeRange('X','rX');makeRange('Y','rY')}else if(mode==='width'){title.textContent='幅';makeRange('幅','rW')}else if(mode==='height'){title.textContent='高さ';makeRange('高さ','rH')}else if(mode==='text'){title.textContent='文字サイズ';makeRange('文字','rF')}else if(mode==='radius'){title.textContent='角丸';makeRange('角丸','rR')}else if(mode==='ink'){title.textContent='文字色';makeColor('文字色','cInk')}else if(mode==='fill'){title.textContent='背景色';makeColor('背景色','cFill')}sheet.classList.add('open');document.body.classList.add('ten-qsheet')}
function choose(mode){closeJog();if(mode==='front'){var b=$('bFwd');if(b)b.click();return}if(mode==='back'){var b2=$('bBwd');if(b2)b2.click();return}if(mode==='detail'){var p=$('panel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});return}showSheet(mode)}
function itemFromTarget(t){var el=t&&t.closest?t.closest('.ten-jog-item'):null;if(!el)return null;var i=Number(el.dataset.j);return isFinite(i)?ITEMS[i]:null}
function resetGesture(){drag=false;moved=false;pointerId=null;downItem=null}
function beginGesture(ev){
 if(!jog.classList.contains('open')) return;
 if(ev.target.closest('#tenJogClose')) return;
 drag=true;moved=false;pointerId=ev.pointerId;startX=ev.clientX;startY=ev.clientY;startA=angle(ev);startR=rot;downItem=itemFromTarget(ev.target);
 try{jog.setPointerCapture(ev.pointerId)}catch(_){}
 ev.preventDefault();
}
function moveGesture(ev){
 if(!drag||ev.pointerId!==pointerId)return;
 var dx=ev.clientX-startX,dy=ev.clientY-startY,px=Math.sqrt(dx*dx+dy*dy),da=delta(angle(ev),startA);
 if(px>TAP_PX||Math.abs(da)>ROTATE_DEG)moved=true;
 if(moved){rot=startR+da;draw();ev.preventDefault()}
}
function endGesture(ev){
 if(!drag||ev.pointerId!==pointerId)return;
 var tapped=!moved, item=downItem||itemFromTarget(ev.target);
 try{jog.releasePointerCapture(ev.pointerId)}catch(_){}
 if(tapped&&item){resetGesture();choose(item.m);ev.preventDefault();return}
 resetGesture();snap();ev.preventDefault();
}
var fabDown=false,fabPid=null,fabX=0,fabY=0;
fab.style.touchAction='none';
fab.addEventListener('pointerdown',function(ev){if(fab.disabled)return;fabDown=true;fabPid=ev.pointerId;fabX=ev.clientX;fabY=ev.clientY;try{fab.setPointerCapture(ev.pointerId)}catch(_){}ev.preventDefault()});
fab.addEventListener('pointerup',function(ev){if(!fabDown||ev.pointerId!==fabPid)return;var dx=ev.clientX-fabX,dy=ev.clientY-fabY;fabDown=false;try{fab.releasePointerCapture(ev.pointerId)}catch(_){}if(Math.sqrt(dx*dx+dy*dy)<=TAP_PX)openJog();ev.preventDefault()});
fab.addEventListener('pointercancel',function(){fabDown=false;fabPid=null});
fab.addEventListener('click',function(ev){ev.preventDefault()});
$('tenJogClose').addEventListener('pointerup',function(ev){ev.stopPropagation();closeJog();ev.preventDefault()});
if(close)close.addEventListener('click',closeSheet);
jog.addEventListener('pointerdown',beginGesture,{passive:false});
jog.addEventListener('pointermove',moveGesture,{passive:false});
jog.addEventListener('pointerup',endGesture,{passive:false});
jog.addEventListener('pointercancel',function(ev){if(drag&&ev.pointerId===pointerId){resetGesture();snap()}},{passive:false});
})();
