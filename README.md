# THE DAILY — Bài tập lớn web tin tức, phiên bản triển khai online

**Xem [HUONG_DAN_DEPLOY_ONLINE.md](HUONG_DAN_DEPLOY_ONLINE.md)** để đưa toàn bộ website và crawler lên Render chỉ một lần. Sau đó chỉ cần dùng URL Render; **không cần chạy Python thủ công trên máy cá nhân**.

- `render.yaml`: Render Blueprint (repo root); triển khai `bai2/` lên dịch vụ Web Service Free.
- `bai1/`: dữ liệu và chương trình của Bài 1.
- `bai2/`: frontend HTML/CSS/JS, 92 bài mặc định, Python API hỗ trợ crawler.
- `bai2/server.py`: Render chạy tự động bằng `python server.py` (host `0.0.0.0`, port `$PORT`).
- `bai2/assets/js/crawler.js`: gửi yêu cầu API trên **cùng domain**; không cần sửa URL API thủ công.

Dữ liệu crawl mới được lưu trong LocalStorage của từng trình duyệt; không đồng bộ giữa các máy. Nếu muốn giữ dữ liệu từ phiên bản localhost, xuất JSON và nhập lại trên website online.

**Giới hạn:** Website nguồn có thể chặn crawler; backend Python vẫn cần máy chủ online. Có quy định giới hạn truy cập và danh sách nguồn tin hợp lệ để giảm lạm dụng. Giữ ghi nguồn và tôn trọng bản quyền nội dung báo chí.
