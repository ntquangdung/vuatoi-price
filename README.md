# VUA TỎI PRICE

Ứng dụng React + Vite, Firebase Google Auth và Firestore. Bản Vercel công khai ở `https://vuatoi-price.vercel.app`; domain riêng để cấu hình sau.

## Chạy local

Yêu cầu Node.js 22.12+ và npm. `npm install`, copy `.env.example` thành `.env.local`, điền Web config project **vuatoi-price**, chạy `npm run dev`. Không commit `.env.local`. `npm run build` tạo thư mục `dist`; `npm run preview` kiểm tra bản build. Nếu npm trên Windows lỗi, dùng `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"` thay cho npm.

Bản local mở ở `http://127.0.0.1:5173/`; Admin nhập sản phẩm tại `http://127.0.0.1:5173/admin/products`. Gmail Admin đầu tiên là `cmavuatoilyson@gmail.com`. Có thể chạy `start-local.cmd` khi server chưa chạy, hoặc dùng `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`. Giữ cửa sổ terminal mở trong lúc sử dụng.

Frontend đọc sản phẩm từ Firebase thật. Admin tự nhập giá; không seed giá giả. Lần tính chỉ được lưu vào Firestore khi bấm **Tính tổng**; **Nhập lại từ 0** chỉ xóa dữ liệu đang nhập trên Home.

## Firebase ban đầu

1. Mở [Firebase Console project vuatoi-price](https://console.firebase.google.com/project/vuatoi-price/overview). Authentication → Sign-in method → bật **Google**, chọn support email.
2. Authentication → Settings → Authorized domains: đã cho phép `localhost`, `127.0.0.1` và `vuatoi-price.vercel.app`.
3. Tạo Cloud Firestore database `(default)` ở location phù hợp. Không dùng Test Mode.
4. Seed Admin đầu tiên bằng Console: collection `admins`, document ID **cmavuatoilyson@gmail.com**, fields `email` (string) = `cmavuatoilyson@gmail.com`, `active` (boolean) = `true`, `createdAt` (timestamp) = thời điểm tạo. ID là Gmail viết thường, không encode; dấu chấm và @ hợp lệ trong một Firestore document ID, Gmail không chứa dấu `/`.
5. Deploy `firestore.rules` trước khi dùng app. Sau đó đăng nhập Admin để thêm sản phẩm. Không có sản phẩm mẫu hard-code. Nếu seed products bằng Console, mỗi document cần name/string, unit/string, price/number >= 0, active/boolean, createdAt/timestamp và updatedAt/timestamp.

## Chức năng và bảo mật

Home không cần đăng nhập để xem sản phẩm đang bán. Chỉ có một mục sản phẩm: đổi tên mục, thêm/xóa dòng, đổi sản phẩm và số lượng. Chọn giảm theo % hoặc tiền; bấm **Tính tổng** để hiện tổng và lưu bản chụp giá, số lượng, chiết khấu vào `calculations`. Lần lưu cần Google Login. **Nhập lại từ 0** xóa form hiện tại; lịch sử đã lưu vẫn còn.

Admin `/admin`, `/admin/products`, `/admin/admins`, `/admin/history`: Google Login, kiểm tra realtime document admins của chính email; chỉ Admin active có quyền đọc lịch sử, ghi products và quản lý Gmail. Lịch sử chỉ nhận bản ghi từ Google Login, không cho sửa; Admin chọn giữ 3/7/10/30 ngày, mặc định 7. Khi Admin mở Lịch sử hoặc lưu thời hạn mới, app xóa các bản ghi quá hạn. Vì project chưa bật Billing, hiện không có tác vụ máy chủ tự chạy khi Admin không mở trang. Rules còn kiểm tra email_verified, provider google.com, dữ liệu và thời điểm xóa. Xóa sản phẩm bằng active=false để có thể khôi phục.

## Kiểm tra

`npm test`: format VND, quantity, tổng, chiết khấu và bản chụp lịch sử một mục.

`npm run test:rules`: cần Java 21+ cho Firestore Emulator; kiểm tra quyền sản phẩm, Gmail, lưu/đọc lịch sử, thời hạn 3/7/10/30 ngày và chỉ xóa bản ghi quá hạn. Chỉ dùng project demo/test với emulator; script kết nối 127.0.0.1:8080.

Kiểm tra UI desktop/mobile và production: tìm sản phẩm, đổi số lượng/sản phẩm, chiết khấu, Tính tổng, Nhập lại, lịch sử và cài đặt thời hạn; đăng nhập Admin; tạo/sửa/ngừng bán/bật lại sản phẩm; thêm/tắt/xóa Gmail khác; lỗi mạng và không có sản phẩm.

## Deploy

1. `npx firebase login`, `npx firebase projects:list`, xác nhận quyền project vuatoi-price.
2. Điền `.env.local` trước khi build; Vite đưa Web config vào bundle.
3. `npm run build`, `npx vercel deploy --prod --yes` cho Vercel, hoặc `npx firebase deploy --only hosting,firestore:rules --project vuatoi-price` cho Firebase Hosting.
4. Firebase Console → Hosting → Add custom domain → nhập **price.vuatoi.com.vn**.
5. Tại nhà cung cấp DNS, thêm chính xác các bản ghi TXT và A/CNAME mà wizard Firebase cung cấp, tránh bản ghi xung đột. Không suy đoán IP và không thay DNS khi chưa có quyền. Chờ xác minh và certificate TLS.
6. Bổ sung domain đang dùng vào Auth Authorized domains, kiểm tra HTTPS, reload trực tiếp `/admin/products` và `/admin/history`, Google Login và toàn bộ chức năng trên production.

Firebase Hosting có rewrite SPA và public dir dist đã được chuẩn bị trong `firebase.json`; project target trong `.firebaserc`. Deploy sẽ cập nhật Rules hiện có, cần kiểm tra nếu project dùng chung với ứng dụng khác.

Tài liệu: [Google Auth](https://firebase.google.com/docs/auth/web/google-signin), [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started), [Hosting custom domain](https://firebase.google.com/docs/hosting/custom-domain).

## Trạng thái bàn giao

Firestore Rules mới cho lịch sử và cài đặt thời hạn đã được triển khai trên project thật. Bản Vercel đã tắt Require Log In, `vuatoi-price.vercel.app` đã có trong Firebase Auth Authorized Domains và truy cập công khai trả HTTP 200. Xem [DEPLOYMENT.md](DEPLOYMENT.md) để biết các bước domain riêng còn lại.

Đã kiểm tra: 5 bài test tính toán, 7 nhóm Rules bằng Emulator, build Vite, Home một mục và phần cài đặt 7 ngày trên trình duyệt local. Không tạo bản ghi lịch sử kiểm thử trên Firestore thật.

`npm audit --omit=dev` không còn lỗ hổng tại lúc kiểm tra. Firebase CLI vẫn có cảnh báo dependency chuyển tiếp thuộc công cụ development; chúng không được đưa vào frontend bundle. Không dùng `audit fix --force` để ép downgrade Firebase SDK.
