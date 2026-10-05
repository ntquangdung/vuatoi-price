# VUA TỎI PRICE

Ứng dụng React + Vite, Firebase Google Auth và Firestore. Bản production: `https://vuatoi-price.vercel.app`.

## Chạy local

Yêu cầu Node.js 22.12+, Java 21+ và npm. `npm install`, copy `.env.example` thành `.env.local`, điền Web config project **vuatoi-price**, chạy `npm run dev:local` (hoặc `start-local.cmd`). Không commit `.env.local`. `npm run build` tạo thư mục `dist`; `npm run preview` kiểm tra bản build. Nếu npm trên Windows lỗi, dùng `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"` thay cho npm.

Bản local mở ở `http://127.0.0.1:5173/`; Admin tại `http://127.0.0.1:5173/admin/products`. Gmail Admin đầu tiên là `cmavuatoilyson@gmail.com`. Giữ cửa sổ terminal mở trong lúc sử dụng. Lần đầu `dev:local` đọc 29 sản phẩm hiện có từ project thật, tách giá đại lý và nạp bản sao vào Firestore Emulator trên máy. Firebase Auth **vẫn là Google thật**: người dùng chọn tài khoản Google, không nhập thông tin giả lập. Chỉ Firestore dùng Emulator; thay đổi ở Admin local chưa ghi lên Firestore production. Dữ liệu local được lưu vào `.local-data/firestore-snapshot.json` khoảng mỗi 15 giây và khôi phục khi chạy lại.

Home yêu cầu đăng nhập Google trước khi đọc sản phẩm. Admin tự nhập giá; không seed giá giả. Lần tính chỉ được lưu vào Firestore khi bấm **Tính tổng**; **Nhập lại từ 0** chỉ xóa dữ liệu đang nhập trên Home.

## Firebase ban đầu

1. Mở [Firebase Console project vuatoi-price](https://console.firebase.google.com/project/vuatoi-price/overview). Authentication → Sign-in method → bật **Google**, chọn support email.
2. Authentication → Settings → Authorized domains: đã cho phép `localhost`, `127.0.0.1` và `vuatoi-price.vercel.app`.
3. Tạo Cloud Firestore database `(default)` ở location phù hợp. Không dùng Test Mode.
4. Seed Admin đầu tiên bằng Console: collection `admins`, document ID **cmavuatoilyson@gmail.com**, fields `email` (string) = `cmavuatoilyson@gmail.com`, `active` (boolean) = `true`, `createdAt` (timestamp) = thời điểm tạo. ID là Gmail viết thường, không encode; dấu chấm và @ hợp lệ trong một Firestore document ID, Gmail không chứa dấu `/`.
5. Deploy `firestore.rules` trước khi dùng app. Sau đó đăng nhập Admin để thêm sản phẩm. Không có sản phẩm mẫu hard-code. Nếu seed products bằng Console, mỗi document cần name/string, unit/string, price/number >= 0, active/boolean, createdAt/timestamp và updatedAt/timestamp.

## Chức năng và bảo mật

Home cần Google Login để xem sản phẩm đang bán. Chỉ có một mục sản phẩm: đổi tên mục, thêm/xóa dòng, đổi sản phẩm và số lượng. Chọn giảm theo % hoặc tiền; bấm **Tính tổng** để hiện tổng và lưu bản chụp giá, số lượng, chiết khấu vào `calculations`. **Nhập lại từ 0** xóa form hiện tại; lịch sử đã lưu vẫn còn. Giá đại lý được lưu riêng trong `dealerPrices`, chỉ Admin hoặc Gmail được Admin cấp trong `/admin/dealers` mới đọc được. Người không có quyền chỉ nhận sản phẩm và giá bán lẻ.

Admin `/admin`, `/admin/products`, `/admin/admins`, `/admin/history`: Google Login, kiểm tra realtime document admins của chính email; chỉ Admin active có quyền đọc lịch sử, ghi products và quản lý Gmail. Lịch sử chỉ nhận bản ghi từ Google Login, không cho sửa; Admin chọn giữ 3/7/10/30 ngày, mặc định 7. Khi Admin mở Lịch sử hoặc lưu thời hạn mới, app xóa các bản ghi quá hạn. Vì project chưa bật Billing, hiện không có tác vụ máy chủ tự chạy khi Admin không mở trang. Rules còn kiểm tra email_verified, provider google.com, dữ liệu và thời điểm xóa. Xóa sản phẩm bằng active=false để có thể khôi phục.

## Kiểm tra

`npm test`: format VND, quantity, tổng, chiết khấu và bản chụp lịch sử một mục.

`npm run test:rules`: cần Java 21+ cho Firestore Emulator; kiểm tra đăng nhập Home, phân quyền giá đại lý, Gmail, lưu/đọc lịch sử, thời hạn 3/7/10/30 ngày và chỉ xóa bản ghi quá hạn. Chỉ dùng project demo/test với emulator; script kết nối 127.0.0.1:8080.

Kiểm tra UI desktop/mobile và production: tìm sản phẩm, đổi số lượng/sản phẩm, chiết khấu, Tính tổng, Nhập lại, lịch sử và cài đặt thời hạn; đăng nhập Admin; tạo/sửa/ngừng bán/bật lại sản phẩm; thêm/tắt/xóa Gmail khác; lỗi mạng và không có sản phẩm.

## Deploy

1. `npx firebase login`, `npx firebase projects:list`, xác nhận quyền project vuatoi-price.
2. Điền `.env.local` trước khi build; Vite đưa Web config vào bundle.
3. `npm run build`, `npx firebase deploy --only firestore:rules --project vuatoi-price`, rồi `npx vercel deploy --prod --yes` lên project Vercel `vua-toi/vuatoi-price`.
4. Kiểm tra HTTPS, reload trực tiếp `/admin/products` và `/admin/history`, Google Login và toàn bộ chức năng trên production.

Vercel có rewrite SPA trong `vercel.json`. Firebase Hosting vẫn có cấu hình trong `firebase.json` nhưng hiện không dùng cho URL production này.

Tài liệu: [Google Auth](https://firebase.google.com/docs/auth/web/google-signin), [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started), [Hosting custom domain](https://firebase.google.com/docs/hosting/custom-domain).

## Trạng thái bàn giao

Đã chuyển 29 giá đại lý từ `products` sang `dealerPrices` trên Firestore production, xác minh không còn trường giá đại lý trong tài liệu sản phẩm, triển khai Security Rules mới và deploy Vercel production. Bản Vercel đã tắt Require Log In, `vuatoi-price.vercel.app` có trong Firebase Auth Authorized Domains. Xem [DEPLOYMENT.md](DEPLOYMENT.md) để biết trạng thái triển khai.

Đã kiểm tra: 5 bài test tính toán, 8 nhóm Rules bằng Emulator, build Vite, local snapshot khôi phục đủ 29 sản phẩm, Vercel production trả HTTP 200 cho Home và route Admin, người chưa đăng nhập bị Firestore từ chối đọc products và dealerPrices. Google Login thật đã được kiểm tra trên bản local; cần kiểm tra tương tác trên trình duyệt production sau deploy. Không tạo bản ghi lịch sử kiểm thử trên Firestore thật.

`npm audit --omit=dev` không còn lỗ hổng tại lúc kiểm tra. Firebase CLI vẫn có cảnh báo dependency chuyển tiếp thuộc công cụ development; chúng không được đưa vào frontend bundle. Không dùng `audit fix --force` để ép downgrade Firebase SDK.
