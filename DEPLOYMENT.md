# Triển khai Vercel

URL production: https://vuatoi-price.vercel.app/ · Vercel project: `vua-toi/vuatoi-price` · Firebase project: `vuatoi-price`.

Ngày 06/10/2026 đã cập nhật FE production lên Vercel và Firestore Security Rules lên Firebase. Vercel deployment `dpl_8hzsQsqisSkMAy3pFUNzS1Y7RaqV` ở trạng thái Ready và alias đúng URL trên. Home và `/admin/history` đều trả HTTP 200; không bật lớp đăng nhập Vercel. Firebase Auth cho phép `vuatoi-price.vercel.app`.

## Dữ liệu và quyền

Dữ liệu production có 29 sản phẩm. Migration đã sao lưu dữ liệu cũ trong `.local-data/` (chỉ trên máy local, được gitignore), chuyển đủ 29 giá đại lý vào `dealerPrices` và xóa trường `dealerPrice` khỏi `products`. Security Rules giới hạn giá đại lý cho Admin hoặc Gmail được Admin cấp trong `/admin/dealers`. Home yêu cầu Google Login; mọi Gmail Google có thể dùng giá bán lẻ, còn giá đại lý phụ thuộc quyền trong Firestore.

Home có địa chỉ dưới tên mục và lựa chọn một trong sáu phương thức thanh toán bên dưới. Khi tính tổng, hai thông tin được lưu cùng bản chụp đơn hàng. Admin xem lại chúng trong Lịch sử và xuất toàn bộ các bản ghi còn lưu thành `.xlsx`. File có ba dòng thông tin công ty ở góc trái trên cùng, tiếp theo là từng lần tính, sản phẩm, chiết khấu, tổng bán lẻ và tổng đại lý. Bản ghi cũ không có địa chỉ/thanh toán sẽ hiển thị rõ "Chưa nhập"/"Chưa chọn"; Rules vẫn cho phép định dạng cũ trong thời gian chuyển phiên bản.

## Publish production

Vercel production dùng environment variables của project `vua-toi/vuatoi-price`. Chỉ triển khai bản Vercel cho lần bàn giao này; không thay DNS hoặc deploy Firebase Hosting live.

```powershell
npm test
npm run test:rules
npm run build
npx firebase deploy --only firestore:rules --project vuatoi-price --non-interactive
npx vercel deploy --prod --yes
```

Các lệnh deploy cần Firebase CLI đăng nhập `cmavuatoilyson@gmail.com` và Vercel account sở hữu project. Mã Web config không phải service-account credential; `.env.local` được gitignore.

## Kiểm tra

- HTTPS `vuatoi-price.vercel.app`, route trực tiếp `/admin/products` và `/admin/admins`.
- Home tải Firestore, tìm/chọn sản phẩm trong một mục, đổi số lượng, chiết khấu, bấm Tính tổng để lưu lịch sử và Nhập lại từ 0.
- Admin Lịch sử chọn giữ bản ghi 3/7/10/30 ngày (mặc định 7); bản ghi quá hạn được dọn khi Admin mở trang hoặc đổi cài đặt.
- Google Login của Gmail Admin, Gmail ngoài danh sách bị chặn.
- Thêm/sửa/ngừng bán/bật lại sản phẩm; thêm/tắt/xóa Gmail khác.
- Console không có lỗi nghiêm trọng; layout mobile và desktop.

Đã kiểm tra 8/8 bài test tính toán/XLSX, 8/8 nhóm Security Rules, build Vite, tạo XLSX từ bundle production trong Chrome và Vercel build production. Home/Admin qua HTTPS trả HTTP 200. Chưa kiểm tra thao tác tải file bằng Gmail Admin trên URL production sau lần deploy này.

Binding domain cũ `price.vuatoi.com.vn` ở Firebase Hosting còn `HOST_MISMATCH`; nó không ảnh hưởng URL Vercel và không thuộc lần triển khai này.
