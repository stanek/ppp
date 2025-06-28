/* ============================================================
   ChatGPT Showcase – script.js  (host build + robust tag caps)
   ============================================================ */

(async () => {
  const $ = (q, ctx = document) => ctx.querySelector(q);

  /* ---------- CONFIG ------------------------------------- */
  const SLUG = '/ppp/';                  // folder that holds snapshots

  /* ---------- PATH NORMALISATION ------------------------- */
  const clean = p => p.replace(/\/+/g, '/').replace(/\/index\.html?$/i, '/')
                      .replace(/([^/])$/, '$1/');

  let path = clean(location.pathname);
  if (!path.startsWith(SLUG)) location.replace(SLUG);

  let rest = path.slice(SLUG.length);          // ""  or "3/"  etc.
  if (!/^\d+\/$/.test(rest)) {
    history.replaceState({}, '', SLUG + '1/');
    rest = '1/';
  }
  let snapNum = +rest.match(/^(\d+)/)[1];

  /* ---------- LATEST SNAPSHOT ---------------------------- */
  const latest = +(await fetch(SLUG + 'snapshots.json')
                   .then(r => r.json()).catch(() => ({ latest: 1 })))
                   .latest || 1;

  /* ---------- DOM REFERENCES ----------------------------- */
  const prevBtn = $('#prev-prompt');
  const nextBtn = $('#next-prompt');
  const nav     = $('nav');
  const tabArea = $('#tab-content');
  const titleEl = $('#panel-title');
  const iframe  = $('#project-frame');
  const panel   = $('#panel');

  /* ---------- SMALL HELPERS ------------------------------ */
  const icon = e => ({html:'📄',htm:'📄',css:'🎨',js:'📜',zip:'🗜️'}[e]||'📄');
  const md   = async (n,f)=>{
    try{const t=await fetch(`${SLUG}${n}/${f}`).then(r=>r.text());
        return f.endsWith('.html')?t:marked.parse(t);}
    catch{return '<em>no content</em>'; }};

  const setArrows = () => {
    prevBtn.classList.toggle('hidden', snapNum <= 1);
    nextBtn.classList.toggle('hidden', snapNum >= latest);
  };
  const activatePromptTab = () => {
    nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === 'prompt'));
  };

  /* ---------- TAG CAPS (idempotent) ---------------------- */
  function capTags(root=document) {
    root.querySelectorAll('.tag').forEach(tag => {
      // remove old wrappers if they exist
      tag.innerHTML = tag.innerHTML.replace(/<span class="cap">(.*?)<\/span>/gi, '$1');
      // wrap each word’s first char
      tag.innerHTML = tag.textContent.toUpperCase()
        .replace(/\b(\w)/g, '<span class="cap">$1</span>');
    });
  }

  /* ---------- ENHANCE MARKDOWN (code, copy, img) --------- */
  function enhanceMarkdown() {
    /* collapse code blocks */
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if (pre.parentElement.classList.contains('code-block')) return;
      const det=document.createElement('details'); det.className='code-block';
      const sum=document.createElement('summary');
      const lang=pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1]||'code';
      sum.textContent=`${lang} ▼`;
      pre.parentNode.insertBefore(det,pre); det.append(sum,pre);
    });

    hljs.highlightAll();

    /* copy buttons */
    tabArea.querySelectorAll('pre').forEach(pre=>{
      if (pre.querySelector('.copy-btn')) return;
      const btn=document.createElement('button'); btn.className='copy-btn'; btn.textContent='copy';
      btn.onclick=()=>navigator.clipboard.writeText(pre.innerText.trim()).then(()=>{
        btn.textContent='✓'; setTimeout(()=>btn.textContent='copy',800);
      });
      pre.appendChild(btn);
    });

    /* clickable images */
    tabArea.querySelectorAll('img').forEach(img=>{
      if (img.closest('a')) return;
      const a=document.createElement('a'); a.href=img.src; a.target='_blank'; a.download='';
      img.parentNode.insertBefore(a,img); a.appendChild(img);
    });

    /* BIG INITIAL LETTERS */
    capTags(tabArea);
  }

  /* ---------- MAIN RENDER FUNCTION ----------------------- */
  async function renderSnapshot(push=false, forcePrompt=false) {
    if (push) history.pushState({}, '', `${SLUG}${snapNum}/`);

    titleEl.textContent = `Prompt #${snapNum}`;
    setArrows();

    const [pHTML, rHTML, aHTML] = await Promise.all([
      md(snapNum,'prompt.md'),
      md(snapNum,'response.md'),
      md(snapNum,'analysis.md')
    ]);

    const filesHTML = async ()=>{
      let tiles=''; try{
        const list=await fetch(`${SLUG}${snapNum}/files/files.md`).then(r=>r.text());
        tiles=list.split(/\r?\n/).filter(Boolean).map(f=>{
          const ext=f.split('.').pop().toLowerCase();
          return `<a class="file-link" href="${SLUG}${snapNum}/files/${f}" download>
                    <span class="file-icon">${icon(ext)}</span>
                    <span class="file-name">${f}</span>
                  </a>`}).join('');
      }catch{}
      return `<a href="${SLUG}${snapNum}/files.zip" class="download-all" download>🗜️ Download all</a>
              ${tiles?`<div class="file-grid">${tiles}</div>`:'<p>No individual files.</p>'}`;
    };

    const html = {
      prompt: pHTML,
      response: rHTML,
      analysis: aHTML,
      files: await filesHTML(),
    };

    if (forcePrompt) activatePromptTab();
    let activeBtn = nav.querySelector('button.active');
    if (!activeBtn) { activatePromptTab(); activeBtn = nav.querySelector('button.active'); }
    tabArea.innerHTML = html[activeBtn.dataset.tab] || '';
    enhanceMarkdown();                // ← includes capTags

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

  /* ---------- TAB SWITCH --------------------------------- */
  nav.addEventListener('click', e=>{
    if (e.target.tagName !== 'BUTTON') return;
    nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b===e.target));
    renderSnapshot(false, false);
  });

  /* ---------- BACK / FORWARD ----------------------------- */
  window.addEventListener('popstate', ()=>{
    const m = clean(location.pathname).slice(SLUG.length).match(/^(\d+)/);
    if (m) { snapNum = +m[1]; renderSnapshot(false, true); }
  });

  /* ---------- DOCK & MINIMISE (unchanged) ---------------- */
  const corners=['bl','br','tr','tl']; let idx=0;
  const dock=i=>{panel.className=panel.className.replace(/corner-\w+/,'');panel.classList.add(`corner-${corners[i]}`);idx=i;};
  dock(idx);
  $('#dock-btn').onclick=()=>!panel.classList.contains('min')&&dock((idx+1)%4);
  $('#min-btn').onclick =()=>{panel.classList.toggle('min'); if(!panel.classList.contains('min')) dock(idx); };
})();
