# Triển khai Vercel

URL production: https://vuatoi-price.vercel.app/ · Vercel project: `vua-toi/vuatoi-price` · Firebase project: `vuatoi-price`.

Ngày 06/10/2026 đã cập nhật FE production lên Vercel và Firestore Security Rules lên Firebase. Vercel deployment `dpl_85XqNbY7QNWXGYu9MSx6k2iKJqCj` ở trạng thái Ready và alias đúng URL trên. Home và `/admin/history` đều trả HTTP 200; không bật lớp đăng nhập Vercel. Firebase Auth cho phép `vuatoi-price.vercel.app`.

## Dữ liệu và quyền

Dữ liệu production có 29 sản phẩm. Migration đã sao lưu dữ liệu cũ trong `.local-data/` (chỉ trên máy local, được gitignore), chuyển đủ 29 giá đại lý vào `dealerPrices` và xóa trường `dealerPrice` khỏi `products`. Security Rules giới hạn giá đại lý cho Admin hoặc Gmail được Admin cấp trong `/admin/dealers`. Home yêu cầu Google Login; mọi Gmail Google có thể dùng giá bán lẻ, còn giá đại lý phụ thuộc quyền trong Firestore.

Home dùng tên mục làm thông tin khách hàng, có địa chỉ và một trong sáu phương thức thanh toán bên dưới. Khi tính tổng, thông tin này được lưu cùng bản chụp đơn hàng. Trong Lịch sử, Admin mở từng bản ghi để xuất một thông báo đơn hàng `.xlsx` riêng. File có ba dòng thông tin công ty ở góc trái trên cùng, tiếp theo là khách hàng, địa chỉ, thanh toán, sản phẩm, chiết khấu và tổng tiền; không có Gmail hay mã lưu nội bộ. Chỉ khi Gmail đã lưu lần tính hiện còn quyền xem giá đại lý và bản ghi có đủ giá đại lý, file mới thêm cột giá đại lý và tổng đại lý bên cạnh giá bán lẻ. Bản ghi cũ không có địa chỉ/thanh toán sẽ hiển thị rõ "Chưa nhập"/"Chưa chọn"; Rules vẫn cho phép định dạng cũ.

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

Đã kiểm tra 9/9 bài test tính toán/XLSX, 8/8 nhóm Security Rules và build Vite. Bài test mở lại file XLSX cho đơn bán lẻ và đơn có quyền đại lý, xác nhận Gmail, mã lưu và giá đại lý không xuất hiện trong file bán lẻ. Cần kiểm tra thao tác tải file bằng Gmail Admin trên URL production sau lần deploy này.

Binding domain cũ `price.vuatoi.com.vn` ở Firebase Hosting còn `HOST_MISMATCH`; nó không ảnh hưởng URL Vercel và không thuộc lần triển khai này.
