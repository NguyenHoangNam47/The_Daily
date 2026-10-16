/**
 * Bài 1: hàm JavaScript nhận URL bài viết và trả về object chuẩn hóa.
 * Dùng trong trình duyệt hiện đại. Trang ngoài domain có thể chặn CORS,
 * khi đó dùng collect.py hoặc server proxy do bạn quản lý.
 */
function slugify(input = '') {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeArticleHTML(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const val = selector => doc.querySelector(selector)?.getAttribute('content')?.trim() || '';
  const txt = selector => doc.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const title = val('meta[property="og:title"]') || txt('h1') || doc.title;
  const excerpt = val('meta[name="description"]') || val('meta[property="og:description"]') || txt('.singular-sapo,.article-sapo');
  const author = val('meta[name="author"]') || txt('.author-name,.author') || 'Không rõ';
  const publishedAt = val('meta[property="article:published_time"]') ||
    doc.querySelector('time[datetime]')?.getAttribute('datetime') || '';
  const zone = doc.querySelector('.singular-content,.e-magazine__body,.article-content,.dt-news__content,[itemprop="articleBody"],article');
  if (!zone || !title) throw new Error('Không thể trích xuất tiêu đề/nội dung');
  const copy = zone.cloneNode(true);
  copy.querySelectorAll('script,style,iframe,form,button,.ads,.advertisement,.related-news').forEach(el => el.remove());
  const content = Array.from(copy.querySelectorAll('p')).map(p => p.textContent.trim()).filter(p => p.length > 25).join('\n\n');
  if (content.length < 100) throw new Error('Nội dung bài viết quá ngắn hoặc không xác định được');
  const path = new URL(url).pathname.split('/').pop().replace(/\.htm$/i, '');
  const articleCode = path.match(/-(\d{12,17})$/)?.[1];
  const slug = path.replace(/-\d{12,17}$/, '') || slugify(title);
  const category = txt('.breadcrumb a:last-child') || '';
  return {
    id: articleCode ? `dtri-${articleCode}` : `dtri-${slug}`,
    title, slug, excerpt, content, author, category, publishedAt,
    source: new URL(url).hostname.replace(/^www\./, ''), url,
    image: val('meta[property="og:image"]')
  };
}

async function extractArticleFromURL(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL phải bắt đầu bằng http hoặc https');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Không tải được bài viết: HTTP ${response.status}`);
  return normalizeArticleHTML(await response.text(), url);
}

// Ví dụ sử dụng:
// extractArticleFromURL('https://dantri.com.vn/...-20260928122246655.htm')
//   .then(post => console.log(JSON.stringify(post, null, 2)))
//   .catch(console.error);
