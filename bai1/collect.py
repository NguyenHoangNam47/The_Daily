"""Thu thập tin từ các trang chuyên mục Dân trí theo Bài 1.
Chạy: python collect.py --limit 10 --pages 5
Chỉ lưu dữ liệu được trang nguồn trả về; không tạo dữ liệu giả.
"""
import argparse
import json
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
MENU = json.loads((ROOT / 'data/menu.json').read_text(encoding='utf-8'))['menu']
USER_AGENT = 'NewsCourseworkCollector/1.0 (+educational local project)'
HEADERS = {'User-Agent': USER_AGENT, 'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.7'}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)
ARTICLE_RE = re.compile(r'-\d{12,17}\.htm(?:[?#].*)?$', re.I)


def categories(menu):
    for item in menu:
        if item.get('type') == 'category':
            yield {'id': item['id'], 'title': item['title'], 'url': item['url']}
            for child in item.get('children', []):
                yield {'id': child['id'], 'title': child['title'], 'url': child['url']}


def text(node):
    return node.get_text(' ', strip=True) if node else ''


def meta(soup, *selectors):
    for selector in selectors:
        el = soup.select_one(selector)
        if el and el.get('content'):
            return el['content'].strip()
    return ''


def ld_article(soup):
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            obj = json.loads(script.string or script.get_text())
        except (ValueError, TypeError):
            continue
        stack = obj if isinstance(obj, list) else [obj]
        while stack:
            item = stack.pop()
            if isinstance(item, list):
                stack.extend(item)
            elif isinstance(item, dict):
                t = item.get('@type', '')
                if 'Article' in str(t) or t == 'NewsArticle':
                    return item
                if '@graph' in item:
                    stack.extend(item['@graph'])
    return {}


def clean_html(soup):
    blocks = ['.singular-content', '.e-magazine__body', '.article-content', '.dt-news__content',
              '[itemprop="articleBody"]', 'article .content', 'article']
    node = next((soup.select_one(s) for s in blocks if soup.select_one(s)), None)
    if not node:
        return ''
    for tag in node.select('script, style, iframe, form, button, .ads, .advertisement, .related-news, .social-share'):
        tag.decompose()
    paragraphs = [text(p) for p in node.select('p')]
    paragraphs = [p for p in paragraphs if len(p) > 25]
    return '\n\n'.join(paragraphs)


def extract_post(html, url, category):
    soup = BeautifulSoup(html, 'lxml')
    ld = ld_article(soup)
    title = meta(soup, 'meta[property="og:title"]', 'meta[name="twitter:title"]') or text(soup.select_one('h1')) or ld.get('headline', '')
    excerpt = (meta(soup, 'meta[name="description"]', 'meta[property="og:description"]')
               or text(soup.select_one('.singular-sapo,.article-sapo,.lead,.sapo')) or ld.get('description', ''))
    author = meta(soup, 'meta[name="author"]')
    if not author:
        obj = ld.get('author', '')
        if isinstance(obj, list):
            obj = obj[0] if obj else ''
        author = obj.get('name', '') if isinstance(obj, dict) else str(obj)
    if not author:
        author = text(soup.select_one('.author-name,.author,.singular-author'))
    published = (meta(soup, 'meta[property="article:published_time"]', 'meta[name="pubdate"]')
                 or ld.get('datePublished', '') or (soup.select_one('time[datetime]') or {}).get('datetime', ''))
    image = meta(soup, 'meta[property="og:image"]')
    if not image and isinstance(ld.get('image'), str):
        image = ld['image']
    content = clean_html(soup)
    slug_with_id = urlparse(url).path.rsplit('/', 1)[-1].removesuffix('.htm')
    match = re.search(r'-(\d{12,17})$', slug_with_id)
    slug = re.sub(r'-\d{12,17}$', '', slug_with_id)
    pid = f'dtri-{match.group(1)}' if match else 'dtri-' + slug
    # Tránh ghi nhận bài chưa trích được nội dung như một kết quả hợp lệ.
    if not title or not content or len(content) < 100:
        raise ValueError('Thiếu tiêu đề hoặc nội dung bài viết')
    return {'id': pid, 'title': title, 'slug': slug, 'excerpt': excerpt,
            'content': content, 'author': author or 'Không rõ', 'category': category,
            'publishedAt': published, 'source': 'dantri.com.vn', 'url': url, 'image': image}


def link_candidates(html, page_url):
    soup = BeautifulSoup(html, 'lxml')
    found, seen = [], set()
    for anchor in soup.select('a[href]'):
        url = urljoin(page_url, anchor['href']).split('#')[0].split('?')[0]
        if (urlparse(url).hostname or '').lower() not in ('dantri.com.vn', 'www.dantri.com.vn'):
            continue
        if not ARTICLE_RE.search(url) or url in seen:
            continue
        seen.add(url)
        found.append(url)
    return found


def fetch(url, timeout=20):
    r = SESSION.get(url, timeout=timeout)
    r.raise_for_status()
    return r.text


def robots_ok(url):
    root = f'{urlparse(url).scheme}://{urlparse(url).netloc}'
    parser = RobotFileParser()
    try:
        parser.set_url(root + '/robots.txt')
        parser.read()
        return parser.can_fetch(USER_AGENT, url)
    except Exception:
        print('Không xác minh được robots.txt; dừng để tránh thu thập trái quy định:', root)
        return False


def collect(limit=10, pages=5, pause=1.5, respect_robots=True):
    all_records = {}
    by_category = defaultdict(list)
    errors = []
    for cat in categories(MENU):
        print(f'\n[{cat["title"]}]')
        if respect_robots and not robots_ok(cat['url']):
            errors.append({'category': cat['id'], 'error': 'robots.txt không cho phép hoặc không xác minh được'})
            continue
        candidate_urls = []
        for page in range(1, pages + 1):
            page_url = cat['url'] if page == 1 else cat['url'].replace('.htm', f'/trang-{page}.htm')
            try:
                candidate_urls.extend(link_candidates(fetch(page_url), page_url))
            except Exception as ex:
                errors.append({'category': cat['id'], 'page': page_url, 'error': str(ex)})
            time.sleep(pause)
            if len(set(candidate_urls)) >= limit * 3:
                break
        candidate_urls = list(dict.fromkeys(candidate_urls))
        for url in candidate_urls:
            if len(by_category[cat['id']]) >= limit:
                break
            if respect_robots and not robots_ok(url):
                continue
            try:
                post = all_records.get(url) or extract_post(fetch(url), url, cat['id'])
                all_records[url] = post
                by_category[cat['id']].append(post['id'])
                print(' ✓', post['title'][:85])
            except Exception as ex:
                errors.append({'category': cat['id'], 'url': url, 'error': str(ex)})
            time.sleep(pause)
        print(f'  Đạt {len(by_category[cat["id"]])}/{limit} bài')
    # Bài có thể thuộc nhiều chuyên mục; giữ một bản ghi duy nhất + mảng categoryIds.
    posts = []
    for url, post in all_records.items():
        post['categoryIds'] = [cat for cat, ids in by_category.items() if post['id'] in ids]
        posts.append(post)
    output = {'collectedAt': datetime.now(timezone.utc).isoformat(), 'minimumPerCategory': limit,
              'totalUniquePosts': len(posts), 'categoryCounts': {cat['id']: len(by_category[cat['id']]) for cat in categories(MENU)},
              'posts': posts, 'errors': errors}
    (ROOT / 'data/posts.json').write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding='utf-8')
    (ROOT / 'data/report.json').write_text(json.dumps({k:v for k,v in output.items() if k != 'posts'}, ensure_ascii=False, indent=2),encoding='utf-8')
    print('\nĐã lưu data/posts.json và data/report.json')
    print('Chuyên mục chưa đạt chỉ tiêu:', [k for k,v in output['categoryCounts'].items() if v < limit])
    return output


if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Thu thập tối thiểu 10 tin thật cho mỗi chuyên mục')
    p.add_argument('--limit', type=int, default=10)
    p.add_argument('--pages', type=int, default=5)
    p.add_argument('--pause', type=float, default=1.5)
    args = p.parse_args()
    collect(args.limit, args.pages, args.pause)
