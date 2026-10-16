# BÀI 1 – THU THẬP DỮ LIỆU BÀI VIẾT

## 1. Đối chiếu với đề
- Tạo object JSON cây chuyên mục của Dân trí: `data/menu.json`.
- Thu thập tối thiểu **10 bài thật cho mỗi chuyên mục** (bao gồm Mới nhất, Thế giới, Thời sự và 8 chuyên mục con): `collect.py`.
- Các trường dữ liệu: `id`, `title`, `slug`, `excerpt`, `content`, `author`, `category`, `publishedAt`, `source`, `url`. Trường `image`/`categoryIds` được bổ sung để tiện dùng trong Bài 2.
- Hàm JavaScript chuẩn hóa dữ liệu từ URL: `js/extractArticle.js`.

## 2. Cách chạy
Có Python 3.10+ và kết nối Internet bình thường:

```bash
python -m pip install -r requirements.txt
python collect.py --limit 10 --pages 5
```

Dữ liệu kết quả:
- `data/posts.json`: tất cả bài viết thu thập được (chỉ có bài thật).
- `data/report.json`: số lượng theo chuyên mục và lỗi gặp phải.

**Quan trọng:** `data/posts.json` đang là `[]` vì môi trường xây dựng file không thể kết nối trực tiếp đến Dân trí để thu thập và kiểm chứng nội dung. Không dùng bài viết mẫu giả để thay thế và không khẳng định đã đạt 10 bài/mục trước khi chạy, kiểm tra report.

## 3. Phân tích cấu trúc
Danh mục `home` và `dt360` không được xem là chuyên mục tin tức phải đạt quota; `latest`, `the-gioi`, `thoi-su` cùng các mục con được tính riêng. Tổng 11 chuyên mục, chỉ tiêu tối thiểu 110 lần phân loại bài (một bài có thể hiện diện ở nhiều chuyên mục). Các bài được gộp theo URL, có mảng `categoryIds` để phản ánh nhiều mục nếu cần.

## 4. Lưu ý
- Website có thể thay đổi CSS class, cấu trúc phân trang, biện pháp chống bot nên crawler có thể cần điều chỉnh.
- Trình duyệt hạn chế lấy HTML từ domain khác do CORS. Hàm `extractArticleFromURL` minh họa chuẩn hóa bằng JavaScript; nếu fetch bị chặn hãy thu thập từ máy có Internet bằng `collect.py` hoặc qua backend/proxy hợp lệ.
- Tôn trọng robots.txt, giới hạn tốc độ, và quyền tác giả; không tái xuất bản toàn văn bài báo khi chưa có quyền.
- Sau khi chạy, mở `data/report.json` để kiểm tra số lượng thực tế từng danh mục, bài thiếu nội dung và lỗi.

## 5. Ví dụ object đầu ra (cấu trúc, không phải bản ghi đã thu thập)
```json
{
  "id": "dtri-20260928122246655",
  "title": "Tiêu đề lấy từ bài báo thật",
  "slug": "tieu-de-bai-bao",
  "excerpt": "Mô tả ngắn lấy từ bài báo",
  "content": "Nội dung trích xuất từ bài báo",
  "author": "Tên tác giả",
  "category": "thoi-su",
  "publishedAt": "2026-09-28T12:22:00+07:00",
  "source": "dantri.com.vn",
  "url": "https://dantri.com.vn/...-20260928122246655.htm"
}
```
