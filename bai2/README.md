# THE DAILY — Bài 2: Website tin tức, triển khai online được

Website sử dụng **HTML, CSS, JavaScript thuần** ở giao diện và **LocalStorage** để lưu bài viết. Tích hợp 92 bài thu thập từ Bài 1, thanh chuyên mục, trang danh sách, chi tiết bài viết và trang Crawler riêng. Python `server.py` làm **máy chủ online hoặc cục bộ / trung gian tải HTML** khi trang báo không cho JavaScript ở trình duyệt đọc trực tiếp do CORS.

## 1. Dùng website online hoặc chạy local

Để sử dụng mà **không phải chạy `python server.py` trên máy cá nhân**, đọc **`../HUONG_DAN_DEPLOY_ONLINE.md`** và triển khai qua Render. Phần hướng dẫn bên dưới chỉ dùng khi muốn thử offline/local.

### Chạy thử trên Windows/VS Code

1. Giải nén ZIP và mở thư mục **`bai2`** trong VS Code (thư mục có `server.py`).
2. Nếu máy đang chạy Live Server hoặc `python -m http.server`, hãy dừng bằng `Ctrl + C`.
3. Trong Terminal của VS Code, chạy:

```powershell
python -m pip install -r requirements.txt
python server.py
```

4. Truy cập **http://localhost:5500/**. Website tự nạp 92 bài trong `data/posts.json` trên trình duyệt mới.
5. Bấm **Crawler** trên navbar hoặc vào **http://localhost:5500/crawler.html** để nhập URL một bài báo công khai (không phải trang chủ), bấm **Crawl dữ liệu**, xem JSON và **Lưu vào LocalStorage**.

> Ở chế độ local, giữ Terminal mở. Khi đã triển khai Render, máy chủ chạy online nên người dùng không cần giữ Terminal hay VS Code.

## 2. Các vấn đề đã sửa

- **Vấn đề 1 (đã sửa từ phiên bản trước):** Dữ liệu 92 bài có sẵn được tự tải ở lần truy cập đầu; không ghi đè LocalStorage đã có bài, kể cả dữ liệu người dùng thêm từ Crawler.
- **Vấn đề 2:** Nội dung Bài 1 dạng văn bản thuần có `\n\n` được hiển thị thành các đoạn `<p>` rõ ràng; nội dung HTML từ Crawler vẫn được làm sạch và hiển thị đúng cấu trúc.
- **Vấn đề 3:** Footer của cả **trang chủ, trang chi tiết, trang Crawler** được tạo từ một nguồn chung; có tên/mô tả, liên kết Trang chủ/Tin mới/Crawler/Liên hệ, chuyên mục, email, địa chỉ, Facebook/YouTube/TikTok và bản quyền; đáp ứng bố cục responsive. Các biểu tượng mạng xã hội mở **trang chủ nền tảng**, không giả mạo tài khoản của nhóm.
- **Vấn đề 4:** Có trang Crawler riêng, trường URL, nút **Kiểm tra kết nối**, nút Crawl, xem kết quả JSON, lưu LocalStorage. Backend trả về thông báo lỗi riêng khi bị website nguồn chặn (403/429), URL không tồn tại, không có kết nối hoặc nội dung không nhận diện được. **Không thể bảo đảm crawl thành công ở mọi báo**, đặc biệt trang chặn truy cập tự động. Việc kiểm thử trực tiếp với URL thật phụ thuộc kết nối mạng trên máy người chạy.
- **Vấn đề 5:** Số bài ở tiêu đề được đếm theo **chuyên mục đang chọn**, ví dụ Quân sự có 10 bài thay vì luôn hiện 92 bài toàn hệ thống.

## 3. Thông tin liên hệ cần chỉnh trước khi nộp

Trong `assets/js/app.js`, tìm hàm `renderFooter()`, rồi thay **`hello@thedaily.example`** và **`Hà Nội, Việt Nam`** bằng thông tin liên hệ thực tế của nhóm. Đây là **dữ liệu minh họa**; địa chỉ `.example` không nhận thư. Các nút Facebook, YouTube và TikTok hiện dẫn đến trang chủ các nền tảng; nếu nhóm có tài khoản thực tế, hãy thay bằng đường dẫn tài khoản nhóm.

Trang THE DAILY **không dùng tên website nguồn làm tên thương hiệu**, nhưng giữ `source`, `url` trong JSON và nguồn bài báo khi hiển thị để ghi xuất xứ đúng.

## 4. Kiểm tra nhanh trước khi nộp

- Trình duyệt mới mở `http://localhost:5500` phải có ngay **92 bài**.
- Chọn **Quân sự**, phần đếm có **10 bài**.
- Nhấn một bài; nội dung có **nhiều đoạn**, có tác giả, thời gian đăng, chuyên mục và footer.
- Kiểm tra nút liên kết nhanh, liên kết email (địa chỉ demo, cần thay), các icon xã hội trên cả 3 trang.
- Mở Crawler -> **Kiểm tra kết nối** (phải báo server sẵn sàng) -> dán một URL **bài báo công khai** -> Crawl. Khi thành công, thấy JSON và có thể lưu vào LocalStorage.
- Kiểm tra responsive trong Chrome DevTools bằng chế độ thiết bị di động.

## 5. Những giới hạn cần hiểu

- Frontend thuần HTML/CSS/JavaScript; Crawler dùng Python phía máy chủ, vì browser bị giới hạn CORS. **Nếu giảng viên cấm mọi backend ngoài JavaScript**, cần xin xác nhận hoặc chuyển backend sang JavaScript.
- Một số website từ chối crawler với HTTP 403/429 hoặc tải nội dung qua JavaScript. Đây là giới hạn thực của nguồn, không phải mọi URL đều crawl được.
- Khi công khai nội dung thu thập, hãy kiểm tra quyền sử dụng và ghi nguồn.

## Cấu trúc

- `index.html` — Trang chủ/chuyên mục
- `article.html` — Trang chi tiết
- `crawler.html` — Quản lý dữ liệu và thu thập bài qua URL
- `data/posts.json` — 92 bài từ Bài 1 (tự tải lần đầu)
- `data/menu.json` — Cây chuyên mục
- `assets/js/app.js` — LocalStorage, giao diện danh sách, chi tiết và footer
- `assets/js/crawler.js` — Trích xuất bài, chuẩn hóa JSON, lưu/xuất/nhập
- `server.py` — Cổng trung gian lấy HTML và API kiểm tra kết nối
