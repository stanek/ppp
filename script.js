/* ============================================================
   ChatGPT Showcase – script.js  (v8)
   · Robust baseDir detection:
       - /ppp/  → /ppp/1/
       - /1/    → /2/ works locally
   · Everything else (arrows, tabs, code collapse, etc.) unchanged
   ============================================================ */

(async () => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /* ---------- 1. Normalise current path ------------------ */
  function tidy(p) {
    p = p.replace(/\/+/g, '/').replace(/\/index\.html?$/i, '/');
    return p.endsWith('/') ? p : p + '/';
  }
  let path = tidy(location.pathname);

  /* ---------- 2. Extract baseDir and snapshot ------------ */
  // split → ["", "ppp", ""]   or ["", "1", ""]
  const parts = path.split('/').filter(Boolean);
  const maybeNum = parts.at(-1);
  let snapshot, baseDir;

  if (/^\d+$/.test(maybeNum)) {
    snapshot = maybeNum;
    baseDir  = '/' + parts.slice(0, -1).join('/') + '/';
  } else {
    snapshot = '1';
    baseDir  = '/' + parts.join('/') + '/';
    history.replaceState({}, '', baseDir + '1/');
  }
  if (baseDir === '//') baseDir = '/';              // when served from folder root

  let snapNum = +snapshot;

  /* ---------- 3. Latest snapshot ------------------------- */
  const latest = +(await fetch(`${baseDir}snapshots.json`).then(r => r.json())).latest || 1;

  /* ---------- 4. DOM refs -------------------------------- */
  const prevBtn = $('#prev-prompt');
  const nextBtn = $('#next-prompt');
  const nav     = $('nav');
  const tabArea = $('#tab-content');
  const title   = $('#panel-title');
  const iframe  = $('#project-frame');
  const panel   = $('#panel');

  /* helper */
  const icon = e => ({html:'📄', htm:'📄', css:'🎨', js:'📜', zip:'🗜️'}[e]||'📄');
  const md   = async f=>{
    try{const t=await fetch(`${baseDir}${snapshot}/${f}`).then(r=>r.text());
    return f.endsWith('.html')?t:marked.parse(t);}catch{return '<em>no content</em>';}};

  /* ---------- 5. loadSnapshot ---------------------------- */
  async function loadSnapshot(n, push=true, forceTab='prompt'){
    snapshot=String(n); snapNum=n;
    if(push) history.pushState({},'',`${baseDir}${snapshot}/`);

    const [pHTML,rHTML,aHTML]=await Promise.all([
      md('prompt.md'), md('response.md'), md('analysis.md')
    ]);

    const filesHTML = async ()=>{
      let tiles=''; try{
        const list=await fetch(`${baseDir}${snapshot}/files/files.md`).then(r=>r.text());
        tiles=list.split(/\r?\n/).filter(Boolean).map(f=>{
          const ext=f.split('.').pop().toLowerCase();
          return `<a class="file-link" href="${baseDir}${snapshot}/files/${f}" download>
                    <span class="file-icon">${icon(ext)}</span>
                    <span class="file-name">${f}</span>
                  </a>`;}).join('');}catch{}
      return `<a href="${baseDir}${snapshot}/files.zip" class="download-all" download>🗜️ Download all</a>
              ${tiles?`<div class="file-grid">${tiles}</div>`:'<p>No individual files.</p>'}`;
    };

    const html = {
      prompt  : pHTML,
      response: rHTML,
      analysis: aHTML,
      files   : await filesHTML(),
    };

    /* header + arrows */
    title.textContent = `Prompt #${snapshot}`;
    prevBtn.classList.toggle('hidden', snapNum<=1);
    nextBtn.classList.toggle('hidden', snapNum>=latest);

    /* active tab (force to prompt when arrow used) */
    if(forceTab){ nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='prompt')); }
    const active = nav.querySelector('button.active').dataset.tab;
    tabArea.innerHTML = html[active] || '';
    enhance();

    iframe.src = `${baseDir}${snapshot}/files/index.html`;
  }

  /* ---------- 6. enhance markdown ------------------------ */
  function enhance(){
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if(pre.parentElement.classList.contains('code-block'))return;
      const d=document.createElement('details');d.className='code-block';
      const s=document.createElement('summary');
      const lang=pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1]||'code';
      s.textContent=`${lang} ▼`; pre.parentNode.insertBefore(d,pre); d.append(s,pre);
    });
    hljs.highlightAll();
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if(pre.querySelector('.copy-btn'))return;
      const b=Object.assign(document.createElement('button'),{className:'copy-btn',textContent:'copy'});
      b.onclick=()=>navigator.clipboard.writeText(pre.innerText.trim()).then(()=>{b.textContent='✓';setTimeout(()=>b.textContent='copy',800)});
      pre.appendChild(b);
    });
    tabArea.querySelectorAll('img').forEach(img=>{
      if(img.closest('a'))return;
      const a=document.createElement('a');a.href=img.src;a.target='_blank';a.download='';img.parentNode.insertBefore(a,img);a.appendChild(img);
    });
  }

  /* ---------- 7. initial load ---------------------------- */
  await loadSnapshot(snapNum,false);

  /* ---------- 8. arrows ---------------------------------- */
  prevBtn.onclick=()=>snapNum>1&&loadSnapshot(snapNum-1,true,true);
  nextBtn.onclick=()=>snapNum<latest&&loadSnapshot(snapNum+1,true,true);

  /* ---------- 9. tabs ------------------------------------ */
  nav.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON')return;
    nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===e.target));
    loadSnapshot(snapNum,false,false);
  });

  /* ----------10. popstate (back/forward) ----------------- */
  window.addEventListener('popstate',()=>{
    const {snap:newSnap}=parseUrl(location.pathname);
    loadSnapshot(+newSnap,false,false);
  });

  /* ----------11. dock / minimise (unchanged) ------------- */
  const corners=['bl','br','tr','tl'];let idx=0;
  const dock=i=>{panel.className=panel.className.replace(/corner-\w+/,'');panel.classList.add(`corner-${corners[i]}`);idx=i;};
  dock(idx);
  $('#dock-btn').onclick=()=>!panel.classList.contains('min')&&dock((idx+1)%4);
  $('#min-btn').onclick =()=>{panel.classList.toggle('min');if(!panel.classList.contains('min'))dock(idx);};
})();
