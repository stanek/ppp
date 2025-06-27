/* ============================================================
   ChatGPT Showcase – script.js  (host-only clean version)
   ============================================================ */

(async () => {
  const $ = (q, ctx = document) => ctx.querySelector(q);

  /* ---------- 0. Fixed project slug ----------------------- */
  const SLUG = '/ppp/';                       // folder on github.io

  /* ---------- 1. Ensure URL ends in /<n>/ ----------------- */
  let path = location.pathname.replace(/\/+/g, '/');      // clean //
  if (!path.startsWith(SLUG)) {
    // If someone opens /, redirect into /ppp/
    location.replace(SLUG);
    return;
  }

  // strip /ppp/ from path → remainder like "" or "3/" or "index.html"
  let rest = path.slice(SLUG.length);
  if (rest.startsWith('index.html')) rest = '';
  if (rest === '') {
    history.replaceState({}, '', SLUG + '1/');
    rest = '1/';
  }

  const snapMatch = rest.match(/^(\d+)\/$/);
  if (!snapMatch) {
    // invalid URL -> bounce to 1
    location.replace(SLUG + '1/');
    return;
  }

  let snapNum = +snapMatch[1];

  /* ---------- 2. Load latest from snapshots.json ----------- */
  const latest = +(await fetch(SLUG + 'snapshots.json').then(r => r.json())).latest || 1;

  /* ---------- 3. Short helpers ---------------------------- */
  const mdFetch = async (n, file) => {
    try {
      const txt = await fetch(`${SLUG}${n}/${file}`).then(r => r.text());
      return file.endsWith('.html') ? txt : marked.parse(txt);
    } catch {
      return '<em>no content</em>';
    }
  };
  const icon = e => ({html:'📄', htm:'📄', css:'🎨', js:'📜', zip:'🗜️'}[e] || '📄');
  const setArrows = () => {
    $('#prev-prompt').classList.toggle('hidden', snapNum <= 1);
    $('#next-prompt').classList.toggle('hidden', snapNum >= latest);
  };
  const activatePromptTab = () => {
    $('nav').querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === 'prompt'));
  };

  /* ---------- 4. Render one snapshot ---------------------- */
  async function renderSnapshot(push = false, forcePrompt = false) {
    if (push) history.pushState({}, '', `${SLUG}${snapNum}/`);

    $('#panel-title').textContent = `Prompt #${snapNum}`;
    setArrows();

    const [p, r, a] = await Promise.all([
      mdFetch(snapNum, 'prompt.md'),
      mdFetch(snapNum, 'response.md'),
      mdFetch(snapNum, 'analysis.md'),
    ]);

    const filesHTML = async () => {
      let tiles = '';
      try {
        const list = await fetch(`${SLUG}${snapNum}/files/files.md`).then(r => r.text());
        tiles = list.split(/\r?\n/).filter(Boolean).map(f=>{
          const ext = f.split('.').pop().toLowerCase();
          return `<a class="file-link" href="${SLUG}${snapNum}/files/${f}" download>
                    <span class="file-icon">${icon(ext)}</span>
                    <span class="file-name">${f}</span>
                  </a>`;}).join('');
      } catch {}
      return `<a href="${SLUG}${snapNum}/files.zip" class="download-all" download>
                🗜️ Download all
              </a>
              ${tiles ? `<div class="file-grid">${tiles}</div>` : '<p>No individual files.</p>'}`;
    };

    const tabHtml = {
      prompt  : p,
      response: r,
      analysis: a,
      files   : await filesHTML(),
    };

    if (forcePrompt) activatePromptTab();
    const active = $('nav button.active').dataset.tab;
    $('#tab-content').innerHTML = tabHtml[active] || '';
    enhanceMarkdown();

    $('#project-frame').src = `${SLUG}${snapNum}/files/index.html`;
  }

  /* ---------- 5. Markdown extras -------------------------- */
  function enhanceMarkdown() {
    const area = $('#tab-content');

    area.querySelectorAll('pre').forEach(pre=>{
      if(pre.parentElement.classList.contains('code-block')) return;
      const d=document.createElement('details'); d.className='code-block';
      const s=document.createElement('summary');
      const lang=pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1]||'code';
      s.textContent=`${lang} ▼`;
      pre.parentNode.insertBefore(d,pre); d.append(s,pre);
    });

    hljs.highlightAll();

    area.querySelectorAll('pre').forEach(pre=>{
      if(pre.querySelector('.copy-btn')) return;
      const b=Object.assign(document.createElement('button'),{className:'copy-btn',textContent:'copy'});
      b.onclick=()=>navigator.clipboard.writeText(pre.innerText.trim()).then(()=>{
        b.textContent='✓'; setTimeout(()=>b.textContent='copy',800);
      });
      pre.appendChild(b);
    });

    area.querySelectorAll('img').forEach(img=>{
      if(img.closest('a')) return;
      const a=document.createElement('a'); a.href=img.src; a.target='_blank'; a.download='';
      img.parentNode.insertBefore(a,img); a.appendChild(img);
    });
  }

  /* ---------- 6. Initial render --------------------------- */
  await renderSnapshot(false);

  /* ---------- 7. Arrow clicks ----------------------------- */
  $('#prev-prompt').onclick = () => {
    if (snapNum > 1) { snapNum--; activatePromptTab(); renderSnapshot(true, true); }
  };
  $('#next-prompt').onclick = () => {
    if (snapNum < latest) { snapNum++; activatePromptTab(); renderSnapshot(true, true); }
  };

  /* ---------- 8. Tab switching ---------------------------- */
  $('nav').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    e.currentTarget.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b === e.target));
    renderSnapshot(false, false);
  });

  /* ---------- 9. popstate (Back/Forward) ------------------ */
  window.addEventListener('popstate', () => {
    const { snap } = parseUrl(location.pathname);
    snapNum = +snap;
    renderSnapshot(false, true);
  });

  /* ----------10. Dock / minimise (unchanged) ------------- */
  const corners=['bl','br','tr','tl']; let idx=0; const panel=$('#panel');
  const dock=i=>{panel.className=panel.className.replace(/corner-\w+/,'');panel.classList.add(`corner-${corners[i]}`);idx=i;};
  dock(idx);
  $('#dock-btn').onclick=()=>!panel.classList.contains('min')&&dock((idx+1)%4);
  $('#min-btn').onclick =()=>{panel.classList.toggle('min');if(!panel.classList.contains('min'))dock(idx);};
})();
