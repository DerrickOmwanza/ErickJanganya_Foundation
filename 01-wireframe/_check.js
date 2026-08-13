
const wards=["Imara Daima","Kwa Njenga","Kwa Reuben","Pipeline","Kware"];
const cats=["Health","Education","Water & sanitation","Roads & infrastructure","Youth & jobs"];
const statuses=[["Completed","badge-complete",100],["Ongoing","badge-ongoing",55],["Planned","badge-planned",0]];
const sources=[["fa-building-columns","Foundation-funded","source-fnd"],["fa-landmark","Government (NG-CDF)","source-gov"],["fa-handshake","Partner-funded","source-partner"],["fa-bullhorn","Advocated, not directly funded","source-adv"]];

function projCard(i){
  const s=statuses[i%3];
  const f=sources[i%4];
  const w=wards[i%5];
  return `<div class="card proj-card" data-ward="${w}"><div class="ph"><i class="fa-solid fa-image"></i>Project photo</div>
  <div class="proj-body"><div class="ward">${w} · ${cats[i%5]}</div>
  <h4>[Project name ${i+1}]</h4>
  <div class="proj-meta"><span class="badge ${s[1]}">${s[0]}</span><span>[Updated ${i+2} days ago]</span></div>
  <div class="progress-track"><div class="progress-fill" style="width:${s[2]}%"></div></div>
  <div class="source-chip ${f[2]}"><i class="fa-solid ${f[0]}"></i>${f[1]}</div>
  <button class="follow-btn" onclick="toggleFollow(this)"><i class="fa-regular fa-bell"></i><span>Follow updates</span></button></div></div>`;
}
document.getElementById('home-projects').innerHTML=[0,1,2].map(projCard).join('');
document.getElementById('tracker-projects').innerHTML=[0,1,2,3,4,5,6,7,8].map(projCard).join('');

const pillars=[["fa-eye","Radical transparency","Every project, photo and shilling logged for anyone to verify."],
["fa-people-group","Community-led","Priorities set from what residents of the five wards actually need."],
["fa-chart-line","Measurable delivery","Progress tracked with dates, budgets and completion percentages."],
["fa-hand-holding-heart","Open to everyone","Locals and diaspora alike can see, support and hold the work accountable."]];
document.getElementById('pillars-home').innerHTML=pillars.map(p=>`<div class="card pillar-card"><i class="fa-solid ${p[0]}"></i><h3>${p[1]}</h3><p>${p[2]}</p></div>`).join('');

const principles=[["fa-scale-balanced","Accountability","[Principle description]"],["fa-magnifying-glass","Transparency","[Principle description]"],["fa-seedling","Sustainable development","[Principle description]"],["fa-handshake","Integrity","[Principle description]"]];
document.getElementById('foundation-principles').innerHTML=principles.map(p=>`<div class="card pillar-card"><i class="fa-solid ${p[0]}"></i><h3>${p[1]}</h3><p>${p[2]}</p></div>`).join('');

const focus=[["fa-kit-medical","Health","[Focus area description — clinics, maternal health, sanitation.]"],["fa-graduation-cap","Education","[Focus area description — schools, bursaries, libraries.]"],["fa-road","Infrastructure","[Focus area description — roads, drainage, housing.]"]];
document.getElementById('foundation-focus').innerHTML=focus.map(p=>`<div class="card pillar-card"><i class="fa-solid ${p[0]}"></i><h3>${p[1]}</h3><p>${p[2]}</p></div>`).join('');

const tl=[["2010–2014","[Early career milestone]","[Short description of what happened and its relevance.]"],
["2015–2019","[Community work / civic engagement]","[Short description.]"],
["2020–2023","[Formal entry into public service or organising]","[Short description.]"],
["2024–2026","[Foundation launched / campaign preparation]","[Short description.]"],
["2027 (planned)","[MP election, Embakasi South]","[The tracker becomes the public record of delivery against every promise made.]"],
["Beyond","[The journey continues]","[This timeline stays open — each term adds to the record rather than replacing it.]"]];
document.getElementById('about-timeline').innerHTML=tl.map(t=>`<div class="tl-item"><span class="yr">${t[0]}</span><h4>${t[1]}</h4><p>${t[2]}</p></div>`).join('');

document.getElementById('about-vision').innerHTML=["Economy & jobs","Health & sanitation","Education & youth"].map(v=>`<div class="card pillar-card"><h3>${v}</h3><p>[Erick's specific position and plan for this issue in Embakasi South.]</p></div>`).join('');

const visionPriorities=[["fa-kit-medical","Healthcare","[Priority description — access, facilities, maternal care.]"],["fa-graduation-cap","Education","[Priority description — schools, bursaries, digital literacy.]"],["fa-house-chimney","Housing & infrastructure","[Priority description — slum upgrading, roads, drainage.]"],["fa-briefcase","Youth & employment","[Priority description — jobs, skills training, enterprise support.]"]];
document.getElementById('vision-priorities').innerHTML=visionPriorities.map(p=>`<div class="card pillar-card"><i class="fa-solid ${p[0]}"></i><h3>${p[1]}</h3><p>${p[2]}</p></div>`).join('');

const voices=[["Resident","Kwa Njenga","[Quote placeholder — a resident describing how a project or engagement affected them.]"],["Resident","Pipeline","[Quote placeholder — before-and-after style testimonial.]"],["Community leader","Kware","[Quote placeholder — a local leader's perspective on the foundation's presence.]"]];
document.getElementById('community-voices').innerHTML=voices.map(v=>`<div class="card quote-card"><div class="qhead"><div class="avatar-ph"><i class="fa-solid fa-user"></i></div><div><b style="font-size:13.5px;">${v[0]}</b><div style="font-size:11.5px;color:var(--ink-mute);">${v[1]} Ward</div></div></div><p>"${v[2]}"</p></div>`).join('');

const promiseData=[["First 100 days","[Promise text]","badge-progress","In progress"],
["First 100 days","[Promise text]","badge-delivered","Delivered"],
["Short-term","[Promise text]","badge-notyet","Not yet started"],
["Short-term","[Promise text]","badge-progress","In progress"],
["Medium-term","[Promise text]","badge-notyet","Not yet started"],
["Long-term","[Promise text]","badge-notyet","Not yet started"]];
document.getElementById('promise-rows').innerHTML=promiseData.map((p,i)=>`<div class="score-row"><span class="idx">${String(i+1).padStart(2,'0')}</span><div class="txt"><b>${p[1]}</b><span>${p[0]}</span></div><span class="badge ${p[2]}">${p[3]}</span></div>`).join('');

function mediaTile(){return `<div class="media-tile"><div class="ph" style="height:100%;"><i class="fa-solid fa-image"></i><span class="play"><i class="fa-solid fa-play"></i></span></div></div>`;}
const mediaTypes=[["fa-image","fa-play"],["fa-image","fa-play"],["fa-waveform-lines",null],["fa-file-lines",null]];
function mediaTileVaried(i){
  const t=mediaTypes[i%4];
  const overlay=t[1]?`<span class="play"><i class="fa-solid ${t[1]}"></i></span>`:'';
  return `<div class="media-tile"><div class="ph" style="height:100%;"><i class="fa-solid ${t[0]}"></i>${overlay}</div></div>`;
}
document.getElementById('home-media').innerHTML=Array(4).fill(0).map(mediaTile).join('');
document.getElementById('media-full').innerHTML=Array(12).fill(0).map((_,i)=>mediaTileVaried(i)).join('');

const newsData=[["[Date]","[Headline about a press interview or media panel]"],["[Date]","[Headline about a field visit or community event]"],["[Date]","[Headline about a project milestone reached]"]];
function newsGrid(){return newsData.map(n=>`<div class="card news-card"><div class="ph"><i class="fa-solid fa-image"></i>Article photo</div><div class="news-body"><div class="date">${n[0]}</div><h4>${n[1]}</h4><p>[Short excerpt of the article goes here, two lines max.]</p></div></div>`).join('');}
document.getElementById('news-full').innerHTML=newsGrid();

const eventData=[["12","Aug","[Community baraza — Kwa Njenga]","[Venue, time]"],["19","Aug","[Youth empowerment forum]","[Venue, time]"],["02","Sep","[Foundation media day]","[Venue, time]"],["14","Sep","[Health outreach camp — Pipeline]","[Venue, time]"]];
document.getElementById('events-list').innerHTML=eventData.map(e=>`<div class="event-row"><div class="event-date"><b>${e[0]}</b><span>${e[1]}</span></div><div class="event-info"><h4>${e[2]}</h4><span>${e[3]}</span></div></div>`).join('');

const adminNav=[["fa-gauge","admin-dashboard","Dashboard"],["fa-diagram-project","admin-project","Projects"],["fa-photo-film","admin-media","Media library"],["fa-newspaper","admin-news","News posts"],["fa-flag-checkered","admin-promises","Promises"],["fa-comments","admin-community","Community"],["fa-calendar-days","admin-events","Events"],["fa-users","admin-supporters","Supporters"],["fa-chart-simple","admin-analytics","Analytics"],["fa-gear","admin-settings","Settings"]];
document.getElementById('admin-nav-list').innerHTML=adminNav.map((a,i)=>`<a href="#" class="${i===0?'active':''}" onclick="jumpAdmin('${a[1]}');return false;"><i class="fa-solid ${a[0]}"></i>${a[2]}</a>`).join('');

const publicScreens=["home","about","foundation","vision","tracker","promises","community","media","news","events","involve","contact"];
const publicLabels=["Home","About Erick","The Foundation","Vision","Progress tracker","Promises","Community","Media","News","Events","Get involved","Contact"];
document.getElementById('public-tabs').innerHTML=publicScreens.map((s,i)=>`<button class="${i===0?'active':''}" onclick="jump('${s}')" id="tab-${s}">${publicLabels[i]}</button>`).join('');
document.getElementById('drawer-links').innerHTML=publicScreens.map((s,i)=>`<a href="#" onclick="jump('${s}');toggleDrawer(false);return false;">${publicLabels[i]}</a>`).join('');

const adminScreens=["admin-dashboard","admin-project","admin-analytics"];
const adminLabels=["Dashboard","Log project (CMS form)","Analytics"];
document.getElementById('admin-tabs').innerHTML=adminScreens.map((s,i)=>`<button class="${i===0?'active':''}" onclick="jumpAdmin('${s}')" id="tabA-${s}">${adminLabels[i]}</button>`).join('');

function jump(id){
  document.querySelectorAll('#public-content .screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  document.querySelectorAll('#public-tabs button').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  animateCounters(document.getElementById('screen-'+id));
}

function filterWard(btn,wardName){
  document.querySelectorAll('#ward-tabs button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#tracker-projects .proj-card').forEach(card=>{
    const show=wardName==='All'||card.dataset.ward===wardName;
    card.style.display=show?'':'none';
  });
}

function toggleFollow(btn){
  const following=btn.classList.toggle('following');
  const icon=btn.querySelector('i');
  const label=btn.querySelector('span');
  icon.className=following?'fa-solid fa-bell':'fa-regular fa-bell';
  label.textContent=following?'Following':'Follow updates';
}

function baUpdate(v){
  document.getElementById('ba-before').style.clipPath=`inset(0 ${100-v}% 0 0)`;
  document.getElementById('ba-handle').style.left=v+'%';
}

function animateCounters(scope){
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counters=(scope||document).querySelectorAll('.cnt:not([data-done])');
  counters.forEach(el=>{
    const target=parseInt(el.dataset.target,10);
    el.setAttribute('data-done','1');
    if(reduce){el.textContent=target.toLocaleString();return;}
    const dur=900;const t0=performance.now();
    function tick(now){
      const p=Math.min((now-t0)/dur,1);
      el.textContent=Math.round(target*p).toLocaleString();
      if(p<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
animateCounters(document.getElementById('screen-home'));
function jumpAdmin(id){
  document.querySelectorAll('#admin-body-screens').forEach(()=>{});
  document.querySelectorAll('.admin-body .screen').forEach(s=>s.classList.remove('active'));
  const target=document.getElementById('screen-'+id);
  if(target){target.classList.add('active');}
  document.querySelectorAll('#admin-tabs button').forEach(b=>b.classList.remove('active'));
  const tab=document.getElementById('tabA-'+id);
  if(tab)tab.classList.add('active');
  document.querySelectorAll('.admin-nav a').forEach(a=>a.classList.remove('active'));
  const navIdx=adminNav.findIndex(a=>a[1]===id);
  if(navIdx>-1)document.querySelectorAll('.admin-nav a')[navIdx].classList.add('active');
  const found=adminNav.find(a=>a[1]===id);
  document.getElementById('admin-title').textContent=found?found[2]:id;
}
function toggleDrawer(open){
  document.getElementById('mobile-drawer').classList.toggle('open',open);
}
function setMode(m){
  const isPublic=m==='public';
  document.getElementById('public-shell').style.display=isPublic?'block':'none';
  document.getElementById('admin-shell').style.display=isPublic?'none':'flex';
  document.getElementById('public-tabs').style.display=isPublic?'flex':'none';
  document.getElementById('admin-tabs').style.display=isPublic?'none':'flex';
  document.getElementById('mode-public').classList.toggle('active',isPublic);
  document.getElementById('mode-admin').classList.toggle('active',!isPublic);
}
