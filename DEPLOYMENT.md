# Triển khai price.vuatoi.com.vn

Project: `vuatoi-price` · Hosting site: `vuatoi-price`.

Đã cấu hình: Firestore Standard tại `asia-southeast1`, Google Provider, Gmail Admin đầu tiên `cmavuatoilyson@gmail.com`, authorized domains local/Hosting/domain chính, Security Rules production và custom-domain binding.

## DNS cần thay đổi

Firebase Hosting API ngày 03/10/2026 trả về yêu cầu sau cho domain chính:

| Thao tác | Loại | Host | Giá trị |
|---|---|---|---|
| Xóa bản ghi hiện tại | A | `price` | `160.187.0.67` |
| Thêm | CNAME | `price` | `vuatoi-price.web.app` |

Nếu DNS provider yêu cầu hostname đầy đủ, nhập `price.vuatoi.com.vn`. Không đặt CNAME cùng A/AAAA ở cùng hostname. Việc đổi bản ghi chuyển lưu lượng subdomain sang Firebase Hosting; chỉ thực hiện khi sẵn sàng go-live và có quyền quản lý DNS. Agent chưa thay DNS.

Trạng thái hiện tại là `HOST_MISMATCH`, `OWNERSHIP_MISSING`, certificate đang xác minh vì subdomain vẫn trỏ máy chủ cũ. Sau khi đổi DNS, kiểm tra wizard Firebase Hosting cho yêu cầu cập nhật mới và chờ certificate HTTPS. Bản ghi ACME TXT cho phương án xác minh khác có thể thay đổi; lấy giá trị hiện tại từ Console nếu cần, không dùng mã cũ.

## Publish production

Build từ `.env.local` đã được cấu hình. Preview và production dùng cùng project/database; không nhập dữ liệu giả vào danh sách sản phẩm thực tế.

Bản preview: https://vuatoi-price--review-jpsyrv9r.web.app — hết hạn lúc 16:50 ngày 10/10/2026 (giờ Việt Nam). Bản ứng dụng mới hiện ở channel review theo phạm vi “chuẩn bị deploy”; release live hiện có chưa được cập nhật.

```powershell
node node_modules/vite/bin/vite.js build
node node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project vuatoi-price
```

Nếu cần cập nhật Rules, chạy `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules --project vuatoi-price`. Rules hiện tại đã được publish và kiểm thử. Mã Web config không phải service-account credential; `.env.local` được gitignore.

## Kiểm tra sau go-live

- HTTPS `price.vuatoi.com.vn`, route trực tiếp `/admin/products` và `/admin/admins`.
- Home tải Firestore, tìm/chọn sản phẩm, nhiều mục, đổi số lượng, tổng và realtime.
- Google Login của Gmail Admin, Gmail ngoài danh sách bị chặn.
- Thêm/sửa/ngừng bán/bật lại sản phẩm; thêm/tắt/xóa Gmail khác.
- Console không có lỗi nghiêm trọng; layout mobile và desktop.

Đọc thêm: [Firebase custom domain](https://firebase.google.com/docs/hosting/custom-domain).
