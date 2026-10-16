/* THE DAILY: frontend thuần JS, API /api/crawl chạy cùng domain trên Render. */
function slugify(s = '') {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function cleanText(s = '') { return String(s || '').replace(/\s+/g, ' ').trim(); }
function absoluteUrl(src, base) {
  if (!src) return '';
  try {
    const url = new URL(src, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function encodeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
}
function metaValue(doc, selectors) {
  for (const sel of selectors) {
    const value = doc.querySelector(sel)?.getAttribute('content');
    if (value && cleanText(value)) return cleanText(value);
  }
  return '';
}
function getStructuredNews(doc) {
  const result = [];
  function traverse(raw) {
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw)) { raw.forEach(traverse); return; }
    if (raw['@graph']) traverse(raw['@graph']);
    const types = Array.isArray(raw['@type']) ? raw['@type'] : [raw['@type']];
    if (types.some(t => /^(NewsArticle|Article|BlogPosting|ReportageNewsArticle)$/i.test(String(t || '')))) result.push(raw);
  }
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
    try { traverse(JSON.parse(el.textContent)); } catch { /* Trang có thể có JSON-LD không chuẩn */ }
  });
  return result.find(item => typeof item.articleBody === 'string' && item.articleBody.length > 100) || result[0] || {};
}
function authorName(value) {
  if (Array.isArray(value)) return value.map(authorName).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return cleanText(value.name || '');
  return cleanText(value || '');
}
function extractTextBody(text) {
  return String(text || '').split(/\n\s*\n/).map(cleanText)
    .filter(Boolean).map(t => `<p>${encodeHtml(t)}</p>`).join('');
}
function selectArticleNode(doc) {
  // Ưu tiên các vùng nội dung rõ ràng của báo Việt Nam, gồm VietNamNet.
  const selectors = [
    '.maincontent', '#maincontent', '.content-detail', '.content__article-body',
    '[itemprop="articleBody"]', '#article-body', '.article-body',
    '.article-content', '.ArticleContent', '.detail-content', '.detail__content',
    '.singular-content', '.e-magazine__body', '.dt-news__content',
    '.fck_detail', '.detail__body', '.ck-content', 'article .content',
    'article', 'main article', 'main'
  ];
  const candidates = [];
  selectors.forEach((sel, rank) => {
    try {
      doc.querySelectorAll(sel).forEach(el => {
        const size = cleanText(el.textContent).length;
        if (size >= 120) candidates.push({el, size, rank, paragraphs:el.querySelectorAll('p').length});
      });
    } catch { /* Bỏ selector không hợp lệ */ }
  });
  if (!candidates.length) return null;
  // Chọn khối nội dung với nhiều đoạn, không mặc định lấy toàn bộ <main> chứa sidebar.
  candidates.sort((a,b) => {
    const score = x => (x.paragraphs >= 3 ? 600 : 0) + Math.min(x.size, 12000) / 20 - x.rank * 35;
    return score(b) - score(a);
  });
  return candidates[0].el;
}
function cleanArticleNode(el, url) {
  const node = el.cloneNode(true);
  node.querySelectorAll('script,style,iframe,form,button,nav,footer,aside,svg,video,audio,canvas,ins,template,' +
    '.ads,.advertisement,.ad-container,.related-news,.related-articles,.social-share,' +
    '[class*="advert"],[class*="related"],[class*="social"],[class*="comment"],' +
    '[class*="recommend"],[class*="share-box"],[class*="popup"],.breadcrumbs').forEach(x => x.remove());
  node.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('data-src') || img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') || img.getAttribute('src');
    const out = absoluteUrl(src, url);
    if (out) img.setAttribute('src', out); else img.removeAttribute('src');
    img.removeAttribute('srcset');
    img.removeAttribute('style');
    img.removeAttribute('loading');
  });
  node.querySelectorAll('source,picture').forEach(item => {if(item.tagName==='SOURCE')item.remove();});
  node.querySelectorAll('a').forEach(a => {
    const href = absoluteUrl(a.getAttribute('href'), url);
    if (href) a.setAttribute('href', href); else a.removeAttribute('href');
  });
  return node;
}
function mapCategory(section, url) {
  const s = cleanText(section).toLowerCase(), u = url.toLowerCase();
  const routes = ['quan-su','phan-tich-binh-luan','the-gioi-do-day','kieu-bao',
    'chinh-tri','giao-thong','moi-truong','nong-tren-mang'];
  for (const id of routes) if (u.includes('/' + id + '/') || u.includes('/' + id + '.'))
    return id === 'phan-tich-binh-luan' ? 'phan-tich' : id;
  if (u.includes('/the-gioi/') || s.includes('thế giới')) return 'the-gioi';
  if (u.includes('/thoi-su/') || s.includes('thời sự') || s.includes('pháp luật')) return 'thoi-su';
  return 'latest';
}
function extractArticle(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const ld = getStructuredNews(doc);
  const title = cleanText(doc.querySelector('h1')?.textContent ||
    metaValue(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    ld.headline || doc.title);
  if (/captcha|access denied|just a moment|robot check/i.test(title))
    throw new Error('Website đang yêu cầu xác minh hoặc từ chối truy cập tự động.');
  const excerpt = metaValue(doc, ['meta[name="description"]','meta[property="og:description"]']) ||
    cleanText(ld.description || doc.querySelector('.singular-sapo,.article-sapo,.lead,.content-detail__summary,.sapo')?.textContent || '');
  const author = authorName(ld.author) || metaValue(doc, ['meta[name="author"]','meta[property="article:author"]']) ||
    cleanText(doc.querySelector('.author-name,.author,.article-author,[class*="author__name"]')?.textContent || '');
  const publishedAt = metaValue(doc, ['meta[property="article:published_time"]','meta[name="datePublished"]','meta[itemprop="datePublished"]']) ||
    ld.datePublished || doc.querySelector('time[datetime]')?.getAttribute('datetime') || '';
  const section = metaValue(doc, ['meta[property="article:section"]']) ||
    cleanText(ld.articleSection || doc.querySelector('.breadcrumb a:last-child')?.textContent || 'Mới nhất');
  const ldImage = Array.isArray(ld.image) ? ld.image[0] : ld.image;
  const image = absoluteUrl(metaValue(doc, ['meta[property="og:image"]', 'meta[name="twitter:image"]']) ||
    (typeof ldImage === 'object' ? ldImage?.url : ldImage) || '', url);
  const chosen = selectArticleNode(doc);
  const contentBlock = chosen ? cleanArticleNode(chosen, url) : null;
  let content = contentBlock ? contentBlock.innerHTML.trim() : '';
  // Nếu phần HTML quá ít nhưng website công bố articleBody trong JSON-LD, dùng nó.
  if (cleanText(contentBlock?.textContent || '').length < 120 && typeof ld.articleBody === 'string')
    content = extractTextBody(ld.articleBody);
  const plainLength = cleanText(content.replace(/<[^>]*>/g, ' ')).length;
  if (!title || title.length < 8 || plainLength < 120)
    throw new Error('Đã tải được trang nhưng không nhận diện đủ nội dung bài viết. Hãy thử bài công khai khác; trang này có thể thay đổi cấu trúc HTML.');
  const parsed = new URL(url);
  const path = parsed.pathname.split('/').filter(Boolean).pop() || '';
  const unique = (parsed.hostname + parsed.pathname).toLowerCase();
  let hash = 2166136261;
  for (let i=0; i<unique.length; i++) { hash ^= unique.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const id = `news-${(hash >>> 0).toString(36)}-${slugify(path).slice(0, 44)}`;
  return {
    id, title, slug: slugify(path.replace(/\.[a-z0-9]+$/i,'').replace(/-\d{10,}$/,'')) || slugify(title),
    excerpt: cleanText(excerpt).slice(0, 850), content,
    author, category: mapCategory(section, url), publishedAt: String(publishedAt),
    source: parsed.hostname.replace(/^www\./i,''), url, image
  };
}
async function fetchArticleHtml(url) {
  let response;
  try {
    response = await fetch('/api/crawl', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({url})
    });
  } catch {
    throw new Error('Không kết nối được API crawler. Trên website online, hãy tải lại trang và thử lại; khi chạy máy cá nhân, dùng python server.py.');
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('Máy chủ bạn đang mở không hỗ trợ API crawler. Hãy truy cập đường link THE DAILY đã triển khai online.'); }
  if (!response.ok) throw new Error(payload.error || `Máy chủ trả về HTTP ${response.status}.`);
  if (!payload.html) throw new Error('Máy chủ trả về HTML rỗng.');
  return payload;
}
let crawled = null;
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#crawlerForm');
  const status = document.querySelector('#status');
  const preview = document.querySelector('#preview');
  const save = document.querySelector('#saveBtn');
  const reset = document.querySelector('#resetBtn');
  const crawlButton = form?.querySelector('button[type="submit"]');
  const healthButton = document.querySelector('#checkServerBtn');
  const show = (msg, ok = true) => {
    status.textContent = msg;
    status.className = `status show ${ok ? 'ok' : 'err'}`;
  };
  healthButton?.addEventListener('click', async () => {
    healthButton.disabled=true;
    try{
      const response=await fetch('/api/health',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok||data.status!=='ok')throw Error('Máy chủ chưa sẵn sàng.');
      show('Đã kết nối máy chủ crawler. Bây giờ hãy nhập URL bài báo và nhấn “Crawl dữ liệu”.');
    }catch(error){
      show('Không kết nối được API crawler. Nếu đang dùng Render Free, máy chủ có thể cần khoảng một phút để khởi động; hãy thử lại. Nếu chạy local, dùng python server.py.',false);
    }finally{healthButton.disabled=false;}
  });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const url = document.querySelector('#url').value.trim();
    if (!/^https?:\/\//i.test(url)) { show('URL phải bắt đầu bằng https:// hoặc http://.', false); return; }
    crawled = null;
    crawlButton.disabled = true;
    show('Đang tải và phân tích bài viết...');
    preview.textContent = 'Đang xử lý...';
    try {
      const response = await fetchArticleHtml(url);
      crawled = extractArticle(response.html, response.url);
      preview.textContent = JSON.stringify(crawled, null, 2);
      show('Crawl thành công! Hãy kiểm tra JSON rồi nhấn “Lưu vào LocalStorage”.');
    } catch(err) {
      preview.textContent = 'Chưa có dữ liệu. ' + err.message;
      show(err.message, false);
    } finally {
      crawlButton.disabled = false;
    }
  });
  save?.addEventListener('click', () => {
    if (!crawled) { show('Chưa có bài crawl thành công để lưu.', false); return; }
    const posts = getPosts();
    const idx = posts.findIndex(post => post.id === crawled.id || post.url === crawled.url);
    if (idx >= 0) posts[idx] = crawled;
    else posts.unshift(crawled);
    try { savePosts(posts); show(`Đã lưu bài “${crawled.title}” vào LocalStorage.`); }
    catch (error) { show('Không lưu được: LocalStorage có thể đã đầy. Hãy xuất dữ liệu trước.', false); }
  });
  reset?.addEventListener('click', () => {
    if (confirm('Xóa toàn bộ bài đang lưu trong trình duyệt? Hãy xuất JSON trước nếu cần sao lưu.')) {
      savePosts([]); preview.textContent = ''; crawled = null;
      show('Đã xóa dữ liệu LocalStorage.');
    }
  });
});
// Nhập và xuất dữ liệu Bài 1, không xóa bài sẵn có khi thêm từ crawler.
document.addEventListener('DOMContentLoaded', () => {
  const file = document.querySelector('#jsonFile'), importBtn = document.querySelector('#importBtn');
  const info = document.querySelector('#importStatus');
  importBtn?.addEventListener('click', async () => {
    try {
      if (!file?.files?.length) throw Error('Hãy chọn file posts.json từ Bài 1.');
      const raw = JSON.parse(await file.files[0].text());
      const list = Array.isArray(raw) ? raw : raw.posts;
      if (!Array.isArray(list)) throw Error('File phải chứa mảng bài viết hoặc object có trường posts.');
      const normalized = list.map((p,i) => ({
        id: String(p.id || p.url || 'import-' + i), title: String(p.title || ''),
        slug: String(p.slug || ''), excerpt: String(p.excerpt || ''), content: String(p.content || ''),
        author: typeof p.author === 'object' ? String(p.author?.name || '') : String(p.author || ''),
        category: p.category || p.categoryIds?.[0] || 'latest',
        categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : [],
        publishedAt: String(p.publishedAt || ''), source: String(p.source || ''),
        url: String(p.url || ''), image: String(p.image || '')
      })).filter(p => p.title);
      if (!normalized.length) throw Error('Không tìm thấy bài có tiêu đề trong file.');
      const merged = new Map(getPosts().map(p => [p.url || p.id, p]));
      normalized.forEach(p => merged.set(p.url || p.id, p));
      savePosts([...merged.values()]);
      info.textContent = `Đã nhập ${normalized.length} bài; hiện có ${merged.size} bài (loại trùng URL).`;
      info.className = 'status show ok';
    } catch(error) { info.textContent = error.message; info.className = 'status show err'; }
  });
  document.querySelector('#exportBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getPosts(), null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'posts-export.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
});
