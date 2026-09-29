const DATA_KEY="biproxx_data_v2";
const DB_NAME="biproxx_media_db";
const DB_VERSION=1;
const STORE="media";

const defaults={
  user:{name:"Bipro",handle:"@bipro",avatar:"B"},
  videos:[],
  likes:[],
  dislikes:[],
  history:[],
  watchLater:[],
  subscriptions:[],
  theme:"light"
};

let data=load();

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(DATA_KEY)||"{}");
    return {
      ...defaults,
      ...saved,
      user:{...defaults.user,...(saved.user||{})}
    };
  }catch(e){ return structuredClone(defaults); }
}
function save(){ localStorage.setItem(DATA_KEY,JSON.stringify(data)); }

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function putMedia(id, videoBlob, thumbBlob){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put({video:videoBlob,thumbnail:thumbBlob||null},id);
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
async function getMedia(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly");
    const req=tx.objectStore(STORE).get(id);
    req.onsuccess=()=>{db.close();resolve(req.result||null);};
    req.onerror=()=>{db.close();reject(req.error);};
  });
}
async function deleteMedia(id){
  try{
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch(e){}
}
async function clearMedia(){
  try{
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch(e){}
}

function toast(msg){
  const t=document.getElementById("toast");
  if(!t)return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2400);
}
function esc(s=""){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function fmt(n){return Number(n||0).toLocaleString("en-IN")}
function avatarText(){return (data.user.avatar||data.user.name||"U").slice(0,2).toUpperCase()}
function getVideo(id){return data.videos.find(v=>v.id===id)}

async function mediaUrls(v){
  const m=await getMedia(v.id);
  if(!m)return {video:"",thumbnail:""};
  return {
    video:m.video?URL.createObjectURL(m.video):"",
    thumbnail:m.thumbnail?URL.createObjectURL(m.thumbnail):""
  };
}

async function card(v){
  const media=await mediaUrls(v);
  const thumb=media.thumbnail
    ? `<img src="${media.thumbnail}" alt="">`
    : `<div class="thumb-placeholder"><i class="fa-solid fa-play"></i></div>`;
  return `<article class="video-card" onclick="openVideo('${v.id}')">
    <div class="thumb">${thumb}${v.duration?`<span class="duration">${esc(v.duration)}</span>`:""}</div>
    <div class="card-info">
      <div class="mini-avatar">${esc((data.user.avatar||"U").slice(0,1).toUpperCase())}</div>
      <div><h3>${esc(v.title)}</h3>
      <div class="meta">${esc(data.user.name)}<br>${fmt(v.views||0)} views • ${esc(v.category||"Other")}</div></div>
    </div>
  </article>`;
}

async function cardsHTML(arr){
  return (await Promise.all(arr.map(card))).join("");
}

async function listItem(v,removeFn=""){
  const media=await mediaUrls(v);
  const thumb=media.thumbnail
    ? `<img src="${media.thumbnail}" alt="">`
    : `<div class="thumb-placeholder"><i class="fa-solid fa-play"></i></div>`;
  return `<div class="list-item">
    <div class="thumb" onclick="openVideo('${v.id}')">${thumb}</div>
    <div><h3>${esc(v.title)}</h3><div class="meta">${esc(data.user.name)}<br>${fmt(v.views||0)} views • ${esc(v.category||"Other")}</div></div>
    ${removeFn?`<button class="secondary" onclick="${removeFn}('${v.id}')">Remove</button>`:""}
  </div>`;
}
async function listHTML(arr,removeFn=""){
  return (await Promise.all(arr.map(v=>listItem(v,removeFn)))).join("");
}

async function renderHome(filter=""){
  const grid=document.getElementById("videoGrid");
  if(!grid)return;
  let arr=[...data.videos].reverse();
  if(filter)arr=arr.filter(v=>(v.title+" "+v.description+" "+v.category).toLowerCase().includes(filter.toLowerCase()));
  grid.innerHTML=arr.length
    ? await cardsHTML(arr)
    : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-video-slash"></i><h2>No videos yet</h2><p>Upload your first video to populate the home page.</p></div>`;
  const c=document.getElementById("videoCount");
  if(c)c.textContent=`${arr.length} video${arr.length===1?"":"s"}`;
}

function openVideo(id){location.href=`watch.html?id=${encodeURIComponent(id)}`}

function setupSearch(){
  const input=document.getElementById("searchInput"),btn=document.getElementById("searchBtn");
  if(!input)return;
  const go=()=>{
    const q=input.value.trim();
    if(document.body.dataset.page==="home")renderHome(q);
    else if(q)location.href=`index.html?search=${encodeURIComponent(q)}`;
  };
  btn?.addEventListener("click",go);
  input.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
}

function setupCommon(){
  const av=document.getElementById("avatar");
  if(av)av.textContent=avatarText();
  document.getElementById("menuBtn")?.addEventListener("click",()=>{
    document.getElementById("sidebar")?.classList.toggle("hidden");
  });
  document.getElementById("themeBtn")?.addEventListener("click",()=>{
    data.theme=data.theme==="dark"?"light":"dark";save();applyTheme();
  });
  setupSearch();
  applyTheme();
}
function applyTheme(){
  document.body.classList.toggle("dark",data.theme==="dark");
  const b=document.querySelector("#themeBtn i");
  if(b)b.className=data.theme==="dark"?"fa-solid fa-sun":"fa-solid fa-moon";
}

async function setupHome(){
  const q=new URLSearchParams(location.search).get("search")||"";
  if(q){document.getElementById("searchInput").value=q;await renderHome(q)}
  else await renderHome();
  document.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",async()=>{
    document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
    c.classList.add("active");
    await renderHome(c.textContent==="All"?"":c.textContent);
  }));
}

function fileAsBlob(file){ return file ? file : null; }

async function setupUpload(){
  const form=document.getElementById("uploadForm");
  if(!form)return;
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const vf=document.getElementById("videoFile").files[0];
    const tf=document.getElementById("thumbnailFile").files[0];

    if(!vf){toast("Please choose a video file.");return;}
    if(!vf.type.startsWith("video/")){toast("Please choose a valid video file.");return;}

    const submit=form.querySelector("button[type=submit]");
    if(submit){submit.disabled=true;submit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';}

    try{
      const id=crypto.randomUUID?crypto.randomUUID():Date.now().toString();
      const v={
        id,
        title:document.getElementById("videoTitle").value.trim(),
        description:document.getElementById("videoDescription").value.trim(),
        category:document.getElementById("videoCategory").value,
        views:0,
        created:Date.now(),
        duration:""
      };

      // Store the actual MP4/WebM/etc. as a Blob in IndexedDB.
      // localStorage is only used for small metadata.
      await putMedia(id,fileAsBlob(vf),fileAsBlob(tf));
      data.videos.push(v);
      save();

      toast("Video uploaded successfully!");
      setTimeout(()=>location.href=`watch.html?id=${encodeURIComponent(id)}`,700);
    }catch(err){
      console.error(err);
      toast("Upload failed. Try a smaller/local video file.");
      if(submit){submit.disabled=false;submit.innerHTML='<i class="fa-solid fa-upload"></i> Publish';}
    }
  });
}

async function setupWatch(){
  const id=new URLSearchParams(location.search).get("id");
  const v=getVideo(id);
  const area=document.getElementById("watchArea");
  if(!v){
    area.innerHTML=`<div class="empty"><h2>Video not found</h2><a class="primary" href="index.html">Go home</a></div>`;
    return;
  }

  if(!data.history.includes(id)){
    data.history.unshift(id);
    data.history=data.history.slice(0,100);
    v.views=(v.views||0)+1;
    save();
  }

  const media=await mediaUrls(v);
  const liked=data.likes.includes(id);
  const disliked=data.dislikes.includes(id);
  const later=data.watchLater.includes(id);
  const sub=data.subscriptions.includes(data.user.handle);

  area.innerHTML=`
    <div class="player"><video src="${media.video}" controls playsinline></video></div>
    <h1 class="watch-title">${esc(v.title)}</h1>
    <div class="watch-meta">
      <div class="meta">${fmt(v.views)} views • ${esc(v.category)}</div>
      <div class="actions">
        <button class="action ${liked?"active":""}" onclick="toggleLike('${v.id}')"><i class="fa-solid fa-thumbs-up"></i> ${likeCount(v.id)}</button>
        <button class="action ${disliked?"active":""}" onclick="toggleDislike('${v.id}')"><i class="fa-solid fa-thumbs-down"></i></button>
        <button class="action ${later?"active":""}" onclick="toggleLater('${v.id}')"><i class="fa-solid fa-clock"></i> ${later?"Saved":"Watch later"}</button>
        <button class="action" onclick="navigator.clipboard?.writeText(location.href);toast('Link copied')"><i class="fa-solid fa-share"></i> Share</button>
      </div>
    </div>
    <div class="creator-row">
      <div class="mini-avatar">${esc(avatarText())}</div>
      <div><b>${esc(data.user.name)}</b><div class="meta">${esc(data.user.handle)}</div></div>
      <button class="primary" style="margin-left:auto" onclick="toggleSub()">${sub?"Subscribed":"Subscribe"}</button>
    </div>
    <p>${esc(v.description||"No description.")}</p>`;

  const next=document.getElementById("nextVideos");
  if(next){
    const arr=data.videos.filter(x=>x.id!==id).slice(-6).reverse();
    next.innerHTML=arr.length?await Promise.all(arr.map(async x=>{
      const m=await mediaUrls(x);
      const th=m.thumbnail?`<img src="${m.thumbnail}" alt="">`:`<div class="thumb-placeholder"><i class="fa-solid fa-play"></i></div>`;
      return `<div class="next" onclick="openVideo('${x.id}')"><div class="thumb">${th}</div><div><h4>${esc(x.title)}</h4><div class="meta">${fmt(x.views)} views</div></div></div>`;
    })).then(x=>x.join("")):"<p class='meta'>No more videos.</p>";
  }
}

function likeCount(id){return data.likes.includes(id)?1:0}
function toggleLike(id){
  data.dislikes=data.dislikes.filter(x=>x!==id);
  data.likes=data.likes.includes(id)?data.likes.filter(x=>x!==id):[...data.likes,id];
  save();setupWatch();
}
function toggleDislike(id){
  data.likes=data.likes.filter(x=>x!==id);
  data.dislikes=data.dislikes.includes(id)?data.dislikes.filter(x=>x!==id):[...data.dislikes,id];
  save();setupWatch();
}
function toggleLater(id){
  data.watchLater=data.watchLater.includes(id)?data.watchLater.filter(x=>x!==id):[...data.watchLater,id];
  save();setupWatch();
}
function toggleSub(){
  const h=data.user.handle;
  data.subscriptions=data.subscriptions.includes(h)?data.subscriptions.filter(x=>x!==h):[...data.subscriptions,h];
  save();setupWatch();
}

async function setupHistory(){
  const el=document.getElementById("historyList");if(!el)return;
  const arr=data.history.map(getVideo).filter(Boolean);
  el.innerHTML=arr.length?await listHTML(arr,"removeHistory"):`<div class="empty"><i class="fa-solid fa-clock-rotate-left"></i><h2>No watch history</h2></div>`;
  document.getElementById("clearHistory")?.addEventListener("click",async()=>{
    data.history=[];save();await setupHistory();toast("History cleared");
  });
}
function removeHistory(id){data.history=data.history.filter(x=>x!==id);save();setupHistory()}

async function setupLiked(){
  const el=document.getElementById("likedList");if(!el)return;
  const arr=data.likes.map(getVideo).filter(Boolean);
  el.innerHTML=arr.length?await cardsHTML(arr):`<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-thumbs-up"></i><h2>No liked videos</h2></div>`;
}

async function setupLater(){
  const el=document.getElementById("laterList");if(!el)return;
  const arr=data.watchLater.map(getVideo).filter(Boolean);
  el.innerHTML=arr.length?await listHTML(arr,"removeLater"):`<div class="empty"><i class="fa-solid fa-clock"></i><h2>Nothing saved</h2></div>`;
  const count=document.getElementById("laterCount");
  if(count)count.textContent=`${arr.length} video${arr.length===1?"":"s"}`;
  document.getElementById("clearLater")?.addEventListener("click",async()=>{
    data.watchLater=[];save();await setupLater();toast("Watch later cleared");
  });
}
function removeLater(id){data.watchLater=data.watchLater.filter(x=>x!==id);save();setupLater()}

async function setupChannel(){
  document.getElementById("channelName").textContent=data.user.name;
  document.getElementById("channelHandle").textContent=data.user.handle;
  document.getElementById("channelAvatar").textContent=avatarText();
  document.getElementById("channelStats").textContent=`${data.videos.length} video${data.videos.length===1?"":"s"}`;
  const el=document.getElementById("channelVideos");
  el.innerHTML=data.videos.length?await cardsHTML([...data.videos].reverse()):`<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-video-slash"></i><h2>No uploads yet</h2><a class="primary" href="upload.html">Upload your first video</a></div>`;
}

function setupSettings(){
  const n=document.getElementById("settingsName");if(!n)return;
  n.value=data.user.name;
  document.getElementById("settingsHandle").value=data.user.handle;
  document.getElementById("settingsAvatar").value=data.user.avatar;
  document.getElementById("settingsForm").addEventListener("submit",e=>{
    e.preventDefault();
    data.user.name=n.value.trim()||"Creator";
    data.user.handle=document.getElementById("settingsHandle").value.trim()||"@creator";
    data.user.avatar=document.getElementById("settingsAvatar").value.trim()||"C";
    save();toast("Account updated");setTimeout(()=>location.reload(),600);
  });
  document.getElementById("resetData").addEventListener("click",async()=>{
    if(confirm("Reset all videos, history, likes and account data?")){
      localStorage.removeItem(DATA_KEY);
      await clearMedia();
      location.reload();
    }
  });
}

setupCommon();
const page=document.body.dataset.page;
if(page==="home")setupHome();
if(page==="upload")setupUpload();
if(page==="watch")setupWatch();
if(page==="history")setupHistory();
if(page==="liked")setupLiked();
if(page==="playlists")setupLater();
if(page==="channel")setupChannel();
if(page==="settings")setupSettings();
