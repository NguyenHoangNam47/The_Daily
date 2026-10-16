const STORAGE_POSTS='news_posts_v1', STORAGE_MENU='news_menu_v1';
// Đánh dấu đã nạp dữ liệu mặc định để không tự khôi phục nếu người dùng chủ động xóa.
const STORAGE_SEEDED='news_seeded_v2';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(x){const d=new Date(x);return isNaN(d)?x:new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(d)}
function getPosts(){try{const p=JSON.parse(localStorage.getItem(STORAGE_POSTS));return Array.isArray(p)?p:[]}catch{return[]}}
function savePosts(p){
  localStorage.setItem(STORAGE_POSTS,JSON.stringify(p));
  localStorage.setItem(STORAGE_SEEDED,'1');
}
// Chỉ nạp JSON mẫu ở lần chạy đầu (kể cả nâng cấp từ bản cũ lưu [] mặc định).
// Không ghi đè LocalStorage nếu người dùng đã có bài hoặc từng chủ động xóa bài.
async function initData(){
  localStorage.setItem(STORAGE_MENU,JSON.stringify(NEWS_MENU));
  const previous=localStorage.getItem(STORAGE_POSTS);
  const saved=getPosts();
  if(saved.length){
    localStorage.setItem(STORAGE_SEEDED,'1');
    return;
  }
  if(previous!==null && localStorage.getItem(STORAGE_SEEDED)==='1')return;
  try{
    const response=await fetch('data/posts.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`Không tải được data/posts.json (HTTP ${response.status})`);
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('data/posts.json phải là một mảng bài viết');
    const posts=data.filter(p=>p&&p.id&&p.title);
    if(!posts.length)throw new Error('data/posts.json chưa có bài viết');
    // Người dùng có thể thao tác trong lúc đang tải dữ liệu; không ghi đè thay đổi mới.
    if(localStorage.getItem(STORAGE_POSTS)===previous)savePosts(posts);
  }catch(error){
    console.error('Không thể nạp dữ liệu mặc định từ Bài 1:',error);
    const notice=$('#postCount');
    if(notice)notice.textContent='Chưa tải được bài viết từ data/posts.json. Kiểm tra server và mở Console để xem lỗi.';
  }
}
function getMenu(){try{return JSON.parse(localStorage.getItem(STORAGE_MENU))||NEWS_MENU}catch{return NEWS_MENU}}
function categoryTitle(id){return CAT_TITLES[id]||id||'Tin tức'}
function belongs(post,c){if(c==='latest'||c==='home')return true;const ids=[...(Array.isArray(post.categoryIds)?post.categoryIds:[]),...(Array.isArray(post.category)?post.category:[post.category])].map(x=>String(x||''));if(ids.includes(c))return true;const menu=getMenu().menu.find(x=>x.id===c);return !!(menu?.children||[]).some(x=>ids.includes(x.id))}
function sortedPosts(){return getPosts().sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0))}
function primaryCategory(p){return Array.isArray(p.category)?p.category[0]:(p.category||p.categoryIds?.[0]||'latest')}
function categoryForView(p){return categoryTitle(primaryCategory(p))}
function safeContent(html){const template=document.createElement('template');template.innerHTML=String(html||'');const allowed=new Set(['P','BR','DIV','SPAN','H2','H3','H4','STRONG','B','EM','I','UL','OL','LI','BLOCKQUOTE','FIGURE','FIGCAPTION','IMG','A']);const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_ELEMENT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const el of nodes){if(!el.parentNode)continue;if(['SCRIPT','STYLE','IFRAME','FORM','OBJECT','EMBED','SVG','MATH','VIDEO','AUDIO'].includes(el.tagName)){el.remove();continue}if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);continue}for(const att of [...el.attributes]){if(!(['href','src','alt','title','loading'].includes(att.name)))el.removeAttribute(att.name)}if(el.hasAttribute('href')&&!/^https?:\/\//i.test(el.getAttribute('href')))el.removeAttribute('href');if(el.hasAttribute('src')&&!/^https?:\/\//i.test(el.getAttribute('src')))el.removeAttribute('src');if(el.tagName==='A')el.setAttribute('rel','noopener noreferrer')}return template.innerHTML}
// Dữ liệu từ Bài 1 là văn bản thuần có ngắt đoạn bằng hai ký tự xuống dòng.
// Dữ liệu crawler có thể đã là HTML. Xử lý riêng để giữ ngắt đoạn mà vẫn escape văn bản.
function renderArticleBody(input){
  const content=String(input||'').trim();
  if(!content)return '<p>Nội dung bài viết hiện chưa có.</p>';
  if(/<\/?(?:p|div|h[2-6]|ul|ol|li|blockquote|figure|figcaption|img|br|section|article)\b/i.test(content)){
    return safeContent(content);
  }
  return content.replace(/\r\n?/g,'\n').split(/\n[\t ]*\n+/)
    .map(text=>text.trim()).filter(Boolean)
    .map(text=>`<p>${esc(text).replace(/\n/g,'<br>')}</p>`).join('');
}
function safeImage(url){return /^https?:\/\//i.test(String(url||''))?esc(url):'assets/img-1.svg'}
function renderNav(){const box=$('#mainNav');if(!box)return;const current=new URLSearchParams(location.search).get('category')||'home';box.innerHTML=getMenu().menu.map(m=>{if(m.type==='external')return `<a href="${m.url}" target="_blank" rel="noopener">${esc(m.title)} ↗</a>`;const sub=m.children?.length?`<div class="submenu">${m.children.map(c=>`<a href="index.html?category=${encodeURIComponent(c.id)}">${esc(c.title)}</a>`).join('')}</div>`:'';return m.children?`<div class="nav-item"><a class="${current===m.id?'active':''}" href="${m.url}">${esc(m.title)} ▾</a>${sub}</div>`:`<a class="${current===m.id?'active':''}" href="${m.url}">${esc(m.title)}</a>`}).join('')+`<a href="crawler.html">Crawler</a>`;$('#menuToggle')?.addEventListener('click',()=>box.classList.toggle('open'))}
function postCard(p,kind='list'){const link=`article.html?id=${encodeURIComponent(p.id)}`;if(kind==='featured')return `<article class="featured"><a href="${link}"><div class="thumb"><img src="${safeImage(p.image)}" alt=""></div><div class="body"><span class="tag">${esc(categoryForView(p))}</span><h2>${esc(p.title)}</h2><p class="excerpt">${esc(p.excerpt||'')}</p><div class="meta"><span>${esc(p.author||'')}</span><span>•</span><span>${esc(formatDate(p.publishedAt))}</span></div></div></a></article>`;
if(kind==='side')return `<article class="side-card"><a href="${link}"><div class="thumb"><img src="${safeImage(p.image)}" alt=""></div><h3>${esc(p.title)}</h3><div class="meta"><span>${esc(formatDate(p.publishedAt))}</span></div></a></article>`;
return `<article class="post-item"><a class="list-thumb" href="${link}"><img src="${safeImage(p.image)}" alt=""></a><div><a href="${link}"><h3>${esc(p.title)}</h3></a><p class="excerpt">${esc(p.excerpt||'')}</p><div class="meta"><span>${esc(p.author||'')}</span><span>•</span><span>${esc(formatDate(p.publishedAt))}</span><span>•</span><span>${esc(categoryForView(p))}</span></div></div></article>`}
function renderHome(){const host=$('#categoryPage');if(!host)return;const params=new URLSearchParams(location.search), c=params.get('category')||'latest';const all=sortedPosts();const posts=all.filter(p=>belongs(p,c));$('#pageTitle').textContent=categoryTitle(c);$('#breadcrumbCat').textContent=categoryTitle(c);const count=$('#postCount');if(count)count.textContent=(c==='latest'||c==='home')?`${posts.length} bài viết • Cập nhật từ dữ liệu tin tức của bạn`:`${posts.length} bài trong chuyên mục • ${all.length} bài trên toàn website`;if(!posts.length){host.innerHTML='<div class="empty">Chưa có bài viết trong chuyên mục này. Hãy nhập posts.json của Bài 1 ở trang Dữ liệu & Crawler, hoặc crawl một bài từ URL.</div>';return}const [a,b,d,...rest]=posts;host.innerHTML=`<section class="hero-grid">${postCard(a,'featured')}<div class="side-stack">${b?postCard(b,'side'):''}${d?postCard(d,'side'):''}</div></section><div class="list-heading"><div><span class="eyebrow">KHÁM PHÁ THÊM</span><h2>Tin tức đáng chú ý</h2></div><span class="list-indicator">${rest.length} bài viết</span></div><section class="post-list">${rest.map(p=>postCard(p)).join('')}</section>`}
function renderArticle(){const host=$('#articlePage');if(!host)return;const id=new URLSearchParams(location.search).get('id'), p=getPosts().find(x=>x.id===id);if(!p){host.innerHTML='<div class="empty">Không tìm thấy bài viết.</div>';return}document.title=p.title+' - The Daily';host.innerHTML=`<div class="breadcrumb"><a href="index.html">Trang chủ</a> / <a href="index.html?category=${encodeURIComponent(primaryCategory(p))}">${esc(categoryForView(p))}</a></div><span class="tag">${esc(categoryForView(p))}</span><h1>${esc(p.title)}</h1><p class="lead">${esc(p.excerpt||'')}</p><div class="meta"><span><strong>${esc(p.author||'Không rõ tác giả')}</strong></span><span>•</span><span>${esc(formatDate(p.publishedAt))}</span><span>•</span><span>Nguồn: ${esc(p.source||'')}</span></div>${p.image?`<div class="article-cover"><img src="${safeImage(p.image)}" alt=""></div>`:''}<div class="article-content">${renderArticleBody(p.content)}</div>`}
// Footer dùng chung để 3 trang có đủ mục và các liên kết hoạt động thống nhất.
// Liên kết MXH dẫn tới trang chủ của nền tảng, không giả là tài khoản THE DAILY.
function renderFooter(){
  const host=$('#siteFooter');
  if(!host)return;
  const cats=getMenu().menu.filter(x=>x.type==='category')
    .map(x=>`<a href="${esc(x.url)}">${esc(x.title)}</a>`).join('');
  host.innerHTML=`<div class="container">
    <div class="footer-grid">
      <section class="footer-about">
        <a href="index.html" class="brand footer-brand"><span class="logo-mark" aria-hidden="true">D<span class="logo-dot">.</span></span><span><strong class="footer-logo">THE DAILY</strong><small>Góc nhìn mới mỗi ngày</small></span></a>
        <p>Không gian đọc tin tức chọn lọc, tìm kiếm câu chuyện đáng chú ý và theo dõi tin theo chuyên mục.</p>
      </section>
      <section><h4>Liên kết nhanh</h4>
        <a href="index.html">Trang chủ</a>
        <a href="index.html?category=latest">Tin mới nhất</a>
        <a href="crawler.html">Crawler bài viết</a>
        <a href="#lien-he">Liên hệ</a>
      </section>
      <section><h4>Chuyên mục</h4><div class="footer-categories">${cats}</div></section>
      <section id="lien-he"><h4>Liên hệ</h4>
        <p><span class="footer-label">Email mẫu:</span> <a class="email-link" href="mailto:hello@thedaily.example">hello@thedaily.example</a><br>
          <span class="footer-label">Địa chỉ minh họa:</span> Hà Nội, Việt Nam</p>
        <div class="social" aria-label="Các nền tảng mạng xã hội">
          <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Mở Facebook" title="Facebook">f</a>
          <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="Mở YouTube" title="YouTube">▶</a>
          <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="Mở TikTok" title="TikTok">♪</a>
        </div>
        <p class="footer-hint">Email, địa chỉ là dữ liệu minh họa. Hãy thay bằng thông tin của nhóm trước khi nộp.</p>
      </section>
    </div>
    <div class="copyright">© ${new Date().getFullYear()} THE DAILY. Dự án học tập, có ghi nguồn bài viết.</div>
  </div>`;
}
document.addEventListener('DOMContentLoaded',async()=>{
  await initData();
  renderNav();
  renderHome();
  renderArticle();
  renderFooter();
});
