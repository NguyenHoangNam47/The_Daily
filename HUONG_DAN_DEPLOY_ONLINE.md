# THE DAILY — HƯỚNG DẪN ĐƯA WEBSITE & CRAWLER LÊN MẠNG

## Bạn nhận được gì?

- Trang chủ THE DAILY, menu chuyên mục, trang chi tiết, footer responsive.
- `bai2/data/posts.json`: 92 bài của Bài 1. Trình duyệt chưa có dữ liệu sẽ tự tải từ JSON lần đầu.
- Trang `/crawler.html`: nhập **URL bài báo riêng lẻ** → API lấy HTML → JavaScript chuẩn hóa → xem JSON → **Lưu vào LocalStorage**.
- Cùng một địa chỉ website dùng cho giao diện và API; khi đã triển khai lên Render **không cần chạy Python trên máy bạn**.
- `bai1/` chứa source và dữ liệu bài tập phần 1 để nộp chung.

> Lưu ý: server Python **vẫn tồn tại trên máy chủ Render**, chỉ là Render tự chạy nó. Đề bài yêu cầu frontend HTML/CSS/JS thuần; nếu giáo viên cấm mọi backend Python, hãy hỏi giáo viên trước khi nộp.

## Cách dễ nhất: triển khai qua GitHub + Render

### Bước A. Đưa mã nguồn lên GitHub

1. Giải nén ZIP này. Thư mục gốc phải thấy `render.yaml`, `bai1/`, `bai2/`.
2. Tạo kho mã (repository) trên GitHub. Nên chọn **Private**, nhất là khi dữ liệu bài báo cần xem xét quyền sử dụng.
3. Đưa **toàn bộ nội dung của thư mục đã giải nén** lên repository. Dùng GitHub Desktop: **File → Add local repository** (nếu chưa là repo, chọn **Create a repository here**), Commit, Publish repository. Hoặc dùng Git/VS Code.
4. Kiểm tra repo trên GitHub có `render.yaml` **ở cấp gốc**, đồng thời có `bai2/server.py` và `bai2/requirements.txt`.

### Bước B. Tạo website online trên Render

1. Vào https://dashboard.render.com/ và đăng nhập.
2. Chọn **New → Blueprint**, kết nối GitHub và chọn repo bạn vừa tạo.
3. Chọn tệp Blueprint `render.yaml` nếu được hỏi, kiểm tra dịch vụ `the-daily-tin-tuc` thuộc gói **Free**, rồi xác nhận tạo.
4. Render sẽ tự cài thư viện trong `bai2/requirements.txt` và chạy `python server.py` trên máy chủ. Bạn **không phải tự chạy lệnh đó**.
5. Chờ trạng thái **Live**. Trong Dashboard, bấm URL được cấp, có dạng `https://the-daily-tin-tuc-xxxx.onrender.com/` (đây chỉ là ví dụ; dùng URL Render thực tế của bạn).
6. Truy cập `<URL-THẬT>/api/health`: phải trả JSON có `"status":"ok"`. Mở `<URL-THẬT>/crawler.html` để thử.

**Nếu không muốn dùng Blueprint:** Render → **New → Web Service** → chọn repo → Runtime `Python` → Root Directory `bai2` → Build Command `pip install -r requirements.txt` → Start Command `python server.py` → Instance type **Free** → Deploy. Cách này tương đương với `render.yaml`.

### Bước C. Thử chức năng trên bản online

1. Mở URL Render vừa nhận, trang chủ phải hiển thị các bài báo từ JSON ở lần mở mới.
2. Chọn **Crawler** → **Kiểm tra kết nối**. Phải báo crawler sẵn sàng.
3. Dán một **URL bài báo cụ thể, công khai** từ một nguồn được cho phép (không nhập URL trang chủ của báo).
4. Nhấn **Crawl dữ liệu** → nếu thành công, phần **JSON chuẩn hóa** xuất hiện.
5. Nhấn **Lưu vào LocalStorage** → về trang chủ. Bài vừa lưu sẽ được thêm vào danh sách.

**Không đảm bảo mọi URL crawl được:** Nguồn tin có thể chặn bots (403/429), yêu cầu đăng nhập, bảo vệ CAPTCHA, hoặc nội dung được tạo bằng JavaScript. Đây là giới hạn từ website nguồn. Không dùng dịch vụ để vượt qua bảo vệ truy cập.

## Những điều cần nhớ trước khi nộp

- **LocalStorage thuộc từng địa chỉ website và từng trình duyệt.** 93 bài lưu trên `localhost` **không tự chuyển** sang URL Render. Bản online nạp 92 bài từ JSON; muốn thêm bài đã lưu riêng ở localhost, vào trang Crawler cũ → **Xuất dữ liệu JSON**, sau đó vào trang online → **Nhập bài viết vào LocalStorage**.
- LocalStorage **không đồng bộ cho các máy khác nhau**. Trên máy giảng viên, website sẽ tự nạp 92 bài có sẵn từ file JSON của dự án; những bài bạn crawl thêm trên máy mình không xuất hiện trên máy giảng viên trừ khi xuất/nhập JSON hoặc cập nhật bộ dữ liệu nguồn trong dự án.
- Trang chủ của dịch vụ Render Free có thể phải khởi động lại sau **15 phút không có lượt truy cập**. Lượt đầu sau khi ngủ thường chờ khoảng một phút. Đây là hành vi bình thường của gói Free.
- `render.yaml` cấu hình giới hạn một số website tin tức công khai, tối đa 12 lần crawl mỗi 10 phút cho một địa chỉ kết nối và 3 lượt crawl đồng thời nhằm tránh lạm dụng. Muốn mở rộng nguồn hợp lệ, đặt environment variable `CRAWLER_ALLOWED_DOMAINS` trên Render, ví dụ `dantri.com.vn,vietnamnet.vn,vtcnews.vn,baomoi.com,example-news.com`.
- Giao diện có HTML/CSS/JavaScript thuần; **API dùng Python server-side**. Không phải dự án frontend-only.
- Chỉnh email và địa chỉ minh họa trong `bai2/assets/js/app.js` (hàm `renderFooter`) trước khi nộp. Các liên kết mạng xã hội đang trỏ đến trang chủ nền tảng.
- Khi triển khai công khai, tôn trọng quyền tác giả. Các bài thu thập có nguồn bên ngoài; không nên đăng lại toàn văn công khai khi chưa có quyền sử dụng. Có thể dùng tiêu đề, đoạn mô tả ngắn, thông tin nguồn và liên kết trở về báo gốc hoặc dữ liệu do nhóm tự viết.

## Nếu cần chạy local để sửa code

Mở terminal trong `bai2/`, chạy:

```powershell
python -m pip install -r requirements.txt
python server.py
```

Sau đó mở http://localhost:5500/. Chỉ cần bước này **khi phát triển cục bộ**, không cần khi dùng đường link Render đã triển khai.

## Tài liệu chính thức

- Render — Deploy your first service: https://render.com/docs/your-first-deploy
- Render — Deploy for free: https://render.com/docs/free
- Render — Blueprint reference: https://render.com/docs/blueprint-spec
