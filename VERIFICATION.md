# Kiểm tra VUA TỎI PRICE

Ngày 03/10/2026. Bản build đã đưa lên channel `review` của Firebase Hosting; database và Auth dùng project thật `vuatoi-price`.

Phạm vi hiện tại theo yêu cầu mới: hoàn thiện FE/backend/data và dùng local; domain/production để sau. Người dùng sẽ tự nhập sản phẩm trong Admin. Google Login trên local đã đạt, việc chọn tài khoản ở preview HTTPS không còn là bước chặn bàn giao local.

Bản local cuối đã build thành công sau khi bổ sung thông báo mất mạng, ngăn gửi thao tác lưu khi offline, xử lý lỗi khởi tạo Firebase, khóa form trong lúc lưu và tách lỗi tải dữ liệu khỏi lỗi form. Đã kiểm tra lại Admin local/Gmail trùng/Gmail ngoài @gmail.com/chuyển tab và console không có lỗi. Bộ Rules không thay đổi sau lần kiểm thử 5/5 đã đạt.

| Hạng mục | Kết quả |
|---|---|
| Vite production build | Đạt; không lỗi build, các chunk dưới 500 kB |
| Calculator tests | 2/2 đạt: VND, quantity, tổng và thay đổi giá/sản phẩm |
| Firestore Emulator Rules | 5/5 nhóm đạt: public query active, chặn ghi/list không quyền, chặn tự nâng quyền, Admin CRUD/validation, quản lý Gmail/thu hồi quyền/provider verified |
| Firestore production read-only | Đạt: public query active được phép; query toàn bộ products và admins bị từ chối |
| Google Login local | Đạt: `cmavuatoilyson@gmail.com` vào Dashboard, đọc danh sách admins |
| Product CRUD qua UI / Firebase thật | Đạt: thêm, sửa giá, ngừng bán, bật lại |
| Home qua UI / Firebase thật | Đạt: tìm/chọn, nhiều dòng/mục, đổi tên mục/sản phẩm/số lượng, xóa dòng/mục, tổng |
| Realtime giữa hai tab | Đạt: sửa giá làm grand total đổi 500.000đ → 650.000đ; ngừng bán loại giá dòng khỏi tổng |
| Home mobile 390px | Đạt: scrollWidth = innerWidth = 390; input/nút/tổng đọc được |
| Console local sau sửa JSX | Không có lỗi tại phiên UI kiểm tra cuối |
| HTTPS preview | Home tải Firestore; route trực tiếp `/admin/products` trả về trang Login; Google Login HTTPS đang chờ người dùng chọn tài khoản trong popup |
| Gmail CRUD | Đã kiểm thử quyền create/update/delete bằng Emulator; UI danh sách và bảo vệ tài khoản hiện tại đã kiểm tra trên Firebase thật |
| npm audit production | 0 vulnerabilities với `--omit=dev`; Firebase CLI còn cảnh báo dependency development chuyển tiếp |

Hai sản phẩm tạm `[KIỂM TRA]` đã xóa khỏi Firestore sau kiểm tra. Tại thời điểm bàn giao ngày 03/10 chưa có sản phẩm/giá thật; Admin nhập danh mục thực tế qua UI. Không lưu calculator state vào DB, không tạo quotes/orders/history/employees.

Chưa xác minh production trên domain chính: DNS `price.vuatoi.com.vn` vẫn trỏ máy chủ cũ; bản ứng dụng mới chưa publish channel live. Xem `DEPLOYMENT.md` cho DNS và lệnh go-live.

Ảnh kiểm tra lưu tại `artifacts/home-desktop.jpg`, `artifacts/home-mobile.jpg`, `artifacts/admin-mobile.jpg`. Những ảnh có nhãn KIỂM TRA được chụp trước khi dọn dữ liệu.

## Cập nhật giao diện ngày 05/10/2026

Home và Admin được chỉnh bố cục, màu sắc, cỡ chữ, trạng thái rỗng và nút thao tác. Home dùng ô autocomplete có đơn giá/đơn vị, hỗ trợ phím mũi tên/Enter/Escape và tự mở danh sách lên phía trên khi thiếu chỗ. Số lượng có nút tăng/giảm, vẫn cho nhập trực tiếp. Tổng tiền ở cuối trang không che nút tạo mục. Admin dùng form cạnh bảng trên desktop; bảng chuyển thành các thẻ có nhãn và nút thao tác trên mobile.

- Production build đạt; calculator tests 2/2 đạt.
- Kiểm tra UI bằng dữ liệu sản phẩm hiện có trên Firebase: chọn bằng chuột/bàn phím, tìm kiếm không có kết quả, tăng/giảm về 0, nhập thập phân, đổi sản phẩm, đổi tên/tạo/xóa mục, xóa dòng và tổng nhiều mục đều đạt.
- Home được kiểm tra ở 320px và 390px, không tràn ngang; popup mở lên phía trên và tiền triệu hiển thị được ở 320px.
- Admin desktop/mobile: tìm kiếm, mở form sửa, hủy sửa, trạng thái không có kết quả và tab Gmail đạt. Không ghi hoặc sửa dữ liệu Firebase trong lần chỉnh FE này.
- Console phiên kiểm tra không có lỗi. Auth, Firestore services và Security Rules giữ nguyên; không deploy hoặc thay DNS.
- Ảnh mới: `artifacts/fe-home-desktop.jpg`, `artifacts/fe-home-mobile.jpg`, `artifacts/fe-admin-desktop.jpg`, `artifacts/fe-admin-mobile.jpg`.
