import {validatePalette,rgbFromHex,oklab} from './core.js';
const $=id=>document.getElementById(id);
let paletteData, source, result, worker, generation=0, loadId=0, exportId=0, pngURL, pngBlob;
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
function releasePNG(){exportId++;if(pngURL)URL.revokeObjectURL(pngURL);pngURL=null;pngBlob=null;$('download').removeAttribute('href');$('download').setAttribute('aria-disabled','true');$('share').hidden=true;}
function invalidate(message='設定已變更，請重新產生拼豆圖。'){
  generation++;worker?.terminate();worker=null;result=null;releasePNG();
  $('resultContent').hidden=true;$('empty').hidden=false;$('resultBadge').textContent='等待轉換';
  $('convert').disabled=!source||!paletteData;$('convert').textContent='產生拼豆圖 →';status(message);
}
function cropRect(){const side=Math.min(source.width,source.height)/Number($('cropZoom').value);return [(source.width-side)*Number($('cropX').value)/100,(source.height-side)*Number($('cropY').value)/100,side,side];}
function drawSource(canvas){const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,...cropRect(),0,0,canvas.width,canvas.height);}
function acceptSource(canvas,name){source=canvas;$('cropZoom').value='1';$('cropX').value='50';$('cropY').value='50';$('cropZoomValue').textContent='1.0×';$('photoName').textContent=name;$('cropSection').hidden=false;drawSource($('crop'));invalidate('照片準備好了，選好設定後按「產生拼豆圖」。');}
$('photo').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>30*1024*1024){status('照片超過 30 MB，請先縮小圖片再試。',true);return;}
  const id=++loadId;invalidate('正在讀取照片…');$('convert').disabled=true;
  const url=URL.createObjectURL(file),img=new Image();
  try{
    img.src=url;await img.decode();if(id!==loadId)return;
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>60000000)throw Error('圖片尺寸過大');
    const ratio=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    acceptSource(canvas,file.name);
  }catch(e){if(id===loadId){status('無法讀取這張照片。請改選 JPG／PNG；HEIC 支援依 Safari 版本而異，或先縮小圖片。',true);$('convert').disabled=!source||!paletteData;}}
  finally{URL.revokeObjectURL(url);img.src='';}
});
$('demo').onclick=()=>{
  loadId++;const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');
  x.fillStyle='#f5edce';x.fillRect(0,0,600,600);x.fillStyle='#93b8bb';x.fillRect(0,0,600,360);
  x.fillStyle='#f7ca77';x.beginPath();x.arc(468,116,52,0,Math.PI*2);x.fill();
  x.fillStyle='#426e55';x.beginPath();x.moveTo(0,360);x.lineTo(165,200);x.lineTo(320,360);x.lineTo(440,246);x.lineTo(600,360);x.closePath();x.fill();
  x.fillStyle='#ce7951';x.fillRect(160,307,230,192);x.fillStyle='#754b3b';x.beginPath();x.moveTo(135,315);x.lineTo(275,200);x.lineTo(415,315);x.fill();
  x.fillStyle='#fae7b5';x.fillRect(190,347,56,62);x.fillRect(301,347,56,62);x.fillStyle='#4c5945';x.fillRect(252,416,51,83);
  x.fillStyle='#63865b';for(const [a,b,r] of [[88,432,55],[495,395,68]]){x.fillRect(a-9,b,18,104);x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();}
  acceptSource(c,'範例：山間小屋（裝置內繪製）');
};
for(const id of ['cropZoom','cropX','cropY'])$(id).oninput=()=>{if(!source)return;$('cropZoomValue').textContent=Number($('cropZoom').value).toFixed(1)+'×';drawSource($('crop'));invalidate();};
function syncGrid(value,normalize=false){
  let n=Number(value);
  if(normalize)n=Math.min(100,Math.max(10,Math.round(Number.isFinite(n)?n:35)));
  const valid=Number.isInteger(n)&&n>=10&&n<=100;
  invalidate(valid?'格數已變更，請重新產生拼豆圖。':'請輸入 10 到 100 的整數格數。');
  $('convert').disabled=!valid||!source||!paletteData;
  if(!valid){$('gridSize').setAttribute('aria-invalid','true');return;}
  $('gridSize').removeAttribute('aria-invalid');$('gridSize').value=String(n);$('gridRange').value=String(n);
  $('gridSummary').textContent=`${n} × ${n} 格 · 共 ${(n*n).toLocaleString('zh-TW')} 顆豆`;
  document.querySelectorAll('input[name=size]').forEach(el=>el.checked=Number(el.value)===n);
}
$('gridRange').oninput=e=>syncGrid(e.target.value);
$('gridSize').oninput=e=>syncGrid(e.target.value);
$('gridSize').onchange=e=>syncGrid(e.target.value,true);
document.querySelectorAll('input[name=size]').forEach(el=>el.onchange=()=>syncGrid(el.value));
for(const id of ['palette','maxColors'])$(id).onchange=()=>invalidate();
$('convert').onclick=()=>{
  if(!source||!paletteData)return;
  invalidate('正在配色，照片仍留在你的裝置…');$('convert').disabled=true;$('convert').textContent='正在產生…';
  const id=generation,n=Number($('gridSize').value);
  if(!Number.isInteger(n)||n<10||n>100){status('請輸入 10 到 100 的整數格數。',true);$('convert').textContent='產生拼豆圖 →';return;}
  const palette=paletteData.colors.filter(c=>$('palette').value==='221'||paletteData.kit36.includes(c.code));
  const maxColors=$('maxColors').value==='all'?palette.length:Math.min(Number($('maxColors').value),palette.length);
  const sample=document.createElement('canvas');sample.width=sample.height=n;drawSource(sample);
  const bytes=sample.getContext('2d').getImageData(0,0,n,n).data,pixels=[];for(let i=0;i<bytes.length;i+=4)pixels.push([bytes[i],bytes[i+1],bytes[i+2]]);
  try{
    worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
    worker.onerror=()=>{if(id===generation){worker?.terminate();worker=null;status('轉換未成功，請重新整理後再試。',true);$('convert').disabled=false;$('convert').textContent='重新產生 →';}};
    worker.onmessage=async({data})=>{
      if(id!==generation)return;worker.terminate();worker=null;$('convert').disabled=false;$('convert').textContent='重新產生 →';
      if(data.errorMessage){status(data.errorMessage,true);return;}
      result={...data,n,maxColors,paletteName:$('palette').value==='221'?'MARD 221':'MARD 36',paletteVersion:paletteData.version};
      showResult();status(`完成！${n} × ${n} 格，實際 ${Object.keys(data.counts).length} 色（上限 ${maxColors} 色），共 ${n*n} 顆。`);
      $('resultContent').scrollIntoView({behavior:'auto',block:'start'});
    };
    worker.postMessage({id,pixels,palette,maxColors});
  }catch(e){status('瀏覽器無法啟動轉換，請使用較新版 Safari 或 Chrome。',true);$('convert').disabled=false;$('convert').textContent='重新產生 →';}
};
function drawPattern(canvas,withLegend){
  const {n,cells,counts}=result,cell=24,margin=40,grid=n*cell,width=grid+2*margin;
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  canvas.width=width;canvas.height=grid+2*margin+(withLegend?100+Math.ceil(entries.length/4)*30:0);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const map=new Map(paletteData.colors.map(c=>[c.code,c]));
  ctx.textAlign='center';ctx.textBaseline='middle';
  cells.forEach((code,i)=>{const x=margin+i%n*cell,y=margin+Math.floor(i/n)*cell,c=map.get(code);ctx.fillStyle=c.hex;ctx.fillRect(x,y,cell,cell);if($('showCodes').checked){ctx.fillStyle=oklab(rgbFromHex(c.hex))[0]>.62?'#111':'#fff';ctx.font='bold 9px sans-serif';ctx.fillText(code,x+cell/2,y+cell/2);}});
  for(let i=0;i<=n;i++){
    ctx.beginPath();ctx.strokeStyle=i%5===0||i===n?'#27342f':'#77777788';ctx.lineWidth=i%5===0||i===n?1.8:.5;
    ctx.moveTo(margin+i*cell,margin);ctx.lineTo(margin+i*cell,margin+grid);ctx.moveTo(margin,margin+i*cell);ctx.lineTo(margin+grid,margin+i*cell);ctx.stroke();
  }
  ctx.fillStyle='#26392e';ctx.font='10px sans-serif';for(let i=0;i<n;i++){ctx.fillText(String(i+1),margin+i*cell+cell/2,margin-13);ctx.fillText(String(i+1),margin-17,margin+i*cell+cell/2);}
  if(withLegend){
    ctx.textAlign='left';ctx.font='bold 16px sans-serif';ctx.fillText(`MARD · ${n} × ${n} · ${entries.length} colors · ${n*n} beads`,margin,grid+margin+38);
    ctx.font='11px sans-serif';ctx.fillText(`${result.paletteName} | ${result.paletteVersion} | Screen reference colors`,margin,grid+margin+64);
    entries.forEach(([code,count],i)=>{const x=margin+(i%4)*(grid/4),y=grid+margin+90+Math.floor(i/4)*30;ctx.fillStyle=map.get(code).hex;ctx.fillRect(x,y,18,18);ctx.strokeStyle='#888';ctx.lineWidth=.5;ctx.strokeRect(x,y,18,18);ctx.fillStyle='#222';ctx.font='12px sans-serif';ctx.fillText(`${code}  × ${count}`,x+25,y+9);});
  }
}
function showResult(){
  $('empty').hidden=true;$('resultContent').hidden=false;$('resultBadge').textContent='已完成';
  const entries=Object.entries(result.counts).sort((a,b)=>b[1]-a[1]);$('gridMetric').textContent=`${result.n} × ${result.n}`;$('colorMetric').textContent=entries.length;$('beadMetric').textContent=result.n**2;$('legendCount').textContent=`${entries.length} 色 · ${result.n**2} 顆`;
  $('swatches').replaceChildren();for(const [code,count] of entries){const c=paletteData.colors.find(c=>c.code===code),row=document.createElement('div'),swatch=document.createElement('i'),label=document.createElement('div'),name=document.createElement('strong'),num=document.createElement('small');row.className='swatch';swatch.style.backgroundColor=c.hex;name.textContent=code;num.textContent=count+' 顆';label.append(name,num);row.append(swatch,label);$('swatches').append(row);}
  renderOutput();
}
function renderOutput(){
  if(!result)return;drawPattern($('pattern'),false);releasePNG();const current=exportId;
  const canvas=document.createElement('canvas');drawPattern(canvas,true);
  canvas.toBlob(blob=>{if(current!==exportId)return;if(!blob){status('PNG 產生失敗，請減少格數再試。',true);return;}pngBlob=blob;pngURL=URL.createObjectURL(blob);$('download').href=pngURL;$('download').download=`MARD-${result.n}x${result.n}-${Object.keys(result.counts).length}colors.png`;$('download').setAttribute('aria-disabled','false');if(navigator.canShare){try{$('share').hidden=!navigator.canShare({files:[new File([blob],'bead-pattern.png',{type:'image/png'})]});}catch{}}},'image/png');
}
$('showCodes').onchange=renderOutput;
$('viewZoom').onchange=()=>{$('pattern').style.width=(100*Number($('viewZoom').value))+'%';};
$('share').onclick=async()=>{if(!pngBlob)return;try{await navigator.share({files:[new File([pngBlob],$('download').download,{type:'image/png'})],title:'我的拼豆圖'});}catch(e){if(e.name!=='AbortError')status('分享未成功，請改用「下載施工圖 PNG」。',true);}};
fetch('./data/mard.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{paletteData=validatePalette(data);$('paletteNotice').textContent=`${data.version}：${data.notice}`;$('paletteSource').href=data.source;$('convert').disabled=!source;status(source?'照片準備好了，可以產生拼豆圖。':'請選張照片，或先用範例試玩。');}).catch(()=>status('色庫載入失敗，請確認連線並重新整理頁面。',true));
