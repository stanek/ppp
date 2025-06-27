/* ============================================================
   ChatGPT Showcase – script.js  (host-friendly stable build)
   ============================================================ */

(async () => {
  const $ = (q, ctx = document) => ctx.querySelector(q);

  /* ---------- CONSTANTS ---------------------------------- */
  const SLUG = '/ppp/';          // folder name on GitHub Pages

  /* ---------- UTILITIES ---------------------------------- */
  const tidy = p => {
    p = p.replace(/\/+/g, '/').replace(/\/index\.html?$/i, '/');
    return p.endsWith('/') ? p : p + '/';
  };

  const icon = e => ({ html:'📄', htm:'📄', css:'🎨', js:'📜', zip:'🗜️' }[e] || '📄');

  /* ---------- INITIAL PATH PARSE ------------------------- */
  let path = tidy(location.pathname);
  if (!path.startsWith(SLUG)) location.replace(SLUG);          // redirect root → /ppp/

  let rest = path.slice(SLUG.length);                          // e.g. "2/" or ""
  if (!rest.match(/^\d+\/$/)) {                                // no number
    history.replaceState({}, '', SLUG + '1/');
    rest = '1/';
  }
  let snapNum = +rest.match(/^(\d+)/)[1];

  /* ---------- LATEST SNAPSHOT ---------------------------- */
  const latest = +(await fetch(SLUG + 'snapshots.json').then(r => r.json())).latest || 1;

  /* ---------- DOM REFERENCES ----------------------------- */
  const prevBtn   = $('#prev-prompt');
  const nextBtn   = $('#next-prompt');
  const nav       = $('nav');
  const tabArea   = $('#tab-content');
  const title     = $('#panel-title');
  const iframe    = $('#project-frame');
  const panel     = $('#panel');

  /* ---------- ARROW VISIBILITY --------------------------- */
  const setArrows = () => {
    prevBtn.classList.toggle('hidden', snapNum <= 1);
    nextBtn.classList.toggle('hidden', snapNum >= latest);
  };

  /* ---------- TAB HELPERS -------------------------------- */
  const activatePromptTab = () => {
    nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === 'prompt'));
  };

  /* ---------- MARKDOWN FETCH ----------------------------- */
  const md = async (n, file) => {
    try {
      const txt = await fetch(`${SLUG}${n}/${file}`).then(r => r.text());
      return file.endsWith('.html') ? txt : marked.parse(txt);
    } catch { return '<em>no content</em>'; }
  };

  /* ---------- ENHANCEMENTS (code collapse, copy, images) -- */
  function enhance() {
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if(pre.parentElement.classList.contains('code-block')) return;
      const d=document.createElement('details'); d.className='code-block';
      const s=document.createElement('summary');
      const lang=pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1]||'code';
      s.textContent=`${lang} ▼`;
      pre.parentNode.insertBefore(d,pre); d.append(s,pre);
    });
    hljs.highlightAll();
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if(pre.querySelector('.copy-btn')) return;
      const b=Object.assign(document.createElement('button'),{className:'copy-btn',textContent:'copy'});
      b.onclick=()=>navigator.clipboard.writeText(pre.innerText.trim()).then(()=>{
        b.textContent='✓'; setTimeout(()=>b.textContent='copy',800);
      });
      pre.appendChild(b);
    });
    tabArea.querySelectorAll('img').forEach(img=>{
      if(img.closest('a')) return;
      const a=document.createElement('a'); a.href=img.src; a.target='_blank'; a.download='';
      img.parentNode.insertBefore(a,img); a.appendChild(img);
    });
  }

  /* ---------- MAIN RENDER -------------------------------- */
  async function renderSnapshot(push = false, forcePrompt = false) {
    if (push) history.pushState({}, '', `${SLUG}${snapNum}/`);

    title.textContent = `Prompt #${snapNum}`;
    setArrows();

    const [pHTML, rHTML, aHTML] = await Promise.all([
      md(snapNum, 'prompt.md'),
      md(snapNum, 'response.md'),
      md(snapNum, 'analysis.md')
    ]);

    const filesHTML = async () => {
      let tiles = '';
      try {
        const list = await fetch(`${SLUG}${snapNum}/files/files.md`).then(r => r.text());
        tiles = list.split(/\r?\n/).filter(Boolean).map(f=>{
          const ext=f.split('.').pop().toLowerCase();
          return `<a class="file-link" href="${SLUG}${snapNum}/files/${f}" download>
                    <span class="file-icon">${icon(ext)}</span>
                    <span class="file-name">${f}</span>
                  </a>`;}).join('');
      } catch {}
      return `<a href="${SLUG}${snapNum}/files.zip" class="download-all" download>🗜️ Download all</a>
              ${tiles?`<div class="file-grid">${tiles}</div>`:'<p>No individual files.</p>'}`;
    };

    const tabHTML = {
      prompt  : pHTML,
      response: rHTML,
      analysis: aHTML,
      files   : await filesHTML(),
    };

    if (forcePrompt) activatePromptTab();
    let activeBtn = nav.querySelector('button.active');
    if (!activeBtn) { activatePromptTab(); activeBtn = nav.querySelector('button.active'); }
    const activeTab = activeBtn.dataset.tab || 'prompt';

    tabArea.innerHTML = tabHTML[activeTab] || '';
    enhance();

    iframe.src = `${SLUG}${snapNum}/files/index.html`;
  }

  /* ---------- INITIAL LOAD ------------------------------- */
  await renderSnapshot(false);

  /* ---------- ARROW EVENTS ------------------------------- */
  prevBtn.onclick = () => {
    if (snapNum > 1) { snapNum--; activatePromptTab(); renderSnapshot(true, true); }
  };
  nextBtn.onclick = () => {
    if (snapNum < latest) { snapNum++; activatePromptTab(); renderSnapshot(true, true); }
  };

  /* ---------- TAB SWITCHING ------------------------------ */
  nav.addEventListener('click', e=>{
    if(e.target.tagName!=='BUTTON') return;
    nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===e.target));
    renderSnapshot(false, false);
  });

  /* ---------- POPSTATE (Back/Forward) -------------------- */
  window.addEventListener('popstate', ()=>{
    const m = tidy(location.pathname).slice(SLUG.length).match(/^(\d+)/);
    if (m) { snapNum = +m[1]; renderSnapshot(false, true); }
  });

  /* ---------- DOCK / MINIMISE (unchanged) --------------- */
  const corners=['bl','br','tr','tl']; let idx=0;
  const dock=i=>{panel.className=panel.className.replace(/corner-\w+/,'');panel.classList.add(`corner-${corners[i]}`);idx=i;};
  dock(idx);
  $('#dock-btn').onclick=()=>!panel.classList.contains('min')&&dock((idx+1)%4);
  $('#min-btn').onclick =()=>{panel.classList.toggle('min');if(!panel.classList.contains('min'))dock(idx);};
})();
