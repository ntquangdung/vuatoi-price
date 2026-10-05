# VUA TỎI PRICE

Ứng dụng React + Vite, Firebase Google Auth, Firestore và Firebase Hosting. Domain triển khai: **price.vuatoi.com.vn**, theo yêu cầu trực tiếp của chủ dự án (thay domain gia trong specification).

## Chạy local

Yêu cầu Node.js 22.12+ và npm. `npm install`, copy `.env.example` thành `.env.local`, điền Web config project **vuatoi-price**, chạy `npm run dev`. Không commit `.env.local`. `npm run build` tạo thư mục `dist`; `npm run preview` kiểm tra bản build. Nếu npm trên Windows lỗi, dùng `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"` thay cho npm.

Bản hiện tại ưu tiên chạy local theo yêu cầu. Mở `http://127.0.0.1:5173/` để tính giá và `http://127.0.0.1:5173/admin/products` để nhập sản phẩm thật. Gmail Admin đầu tiên là `cmavuatoilyson@gmail.com`. Có thể chạy `start-local.cmd` khi server chưa chạy, hoặc dùng `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`. Giữ cửa sổ terminal mở trong lúc sử dụng.

Frontend chạy trên máy; backend/data dùng Firebase thật. Danh mục sẽ do Admin tự nhập, không seed giá sản phẩm giả. Giá và products nằm trong Firestore; calculator chỉ nằm trong React state. Các bước domain và publish trong phần Deployment để dùng sau, không phải điều kiện sử dụng local.

## Firebase ban đầu

1. Mở [Firebase Console project vuatoi-price](https://console.firebase.google.com/project/vuatoi-price/overview). Authentication → Sign-in method → bật **Google**, chọn support email.
2. Authentication → Settings → Authorized domains: thêm `localhost`, `127.0.0.1` nếu chạy local, `price.vuatoi.com.vn`, `vuatoi-price.web.app` và `vuatoi-price.firebaseapp.com`.
3. Tạo Cloud Firestore database `(default)` ở location phù hợp. Không dùng Test Mode.
4. Seed Admin đầu tiên bằng Console: collection `admins`, document ID **cmavuatoilyson@gmail.com**, fields `email` (string) = `cmavuatoilyson@gmail.com`, `active` (boolean) = `true`, `createdAt` (timestamp) = thời điểm tạo. ID là Gmail viết thường, không encode; dấu chấm và @ hợp lệ trong một Firestore document ID, Gmail không chứa dấu `/`.
5. Deploy `firestore.rules` trước khi dùng app. Sau đó đăng nhập Admin để thêm sản phẩm. Không có sản phẩm mẫu hard-code. Nếu seed products bằng Console, mỗi document cần name/string, unit/string, price/number >= 0, active/boolean, createdAt/timestamp và updatedAt/timestamp.

## Chức năng và bảo mật

Home không cần đăng nhập, đọc query `active == true` bằng realtime listener. Calculator nằm trong React state; không ghi quotes/orders/history, refresh sẽ xóa phiên. Giá mới và sản phẩm ngừng bán cập nhật realtime; dòng ngừng bán được đánh dấu và không còn tính vào tổng. Số lượng mặc định min=0, step=1; hàm tính hỗ trợ số thập phân. Mỗi mục có thể đổi tên, thêm/xóa dòng, đổi sản phẩm, đổi số lượng và xóa mục.

Admin `/admin`, `/admin/products`, `/admin/admins`: Google Login, kiểm tra realtime document admins của chính email; chỉ Admin active có quyền đọc tất cả sản phẩm, ghi products và quản lý Gmail. Người ngoài chỉ được đọc document quyền của chính mình, không list admins. Rules còn kiểm tra email_verified và provider google.com, kiểu dữ liệu, giá, timestamps, fields hợp lệ. Không thể tự tắt/xóa Admin hiện tại; Admin khác vẫn có thể thu hồi quyền. Xóa sản phẩm bằng active=false để có thể khôi phục. Admin đầu tiên và phục hồi khi mất tất cả quyền cần Console/IAM. Firebase Web API key không thay thế Security Rules.

## Kiểm tra

`node --test tests/calculator.test.js`: format VND, quantity, tổng và thay đổi giá/sản phẩm.

`npm run test:rules`: cần Java 21+ cho Firestore Emulator, kiểm tra public reads, từ chối write, chặn tự nâng quyền, Google verified Admin CRUD, dữ liệu không hợp lệ, quản lý Gmail và thu hồi quyền. Chỉ dùng project demo/test với emulator; script kết nối 127.0.0.1:8080.

Kiểm tra UI desktop/mobile và production: tìm sản phẩm, thêm nhiều dòng/mục, đổi số lượng/sản phẩm, xóa dòng/mục, tổng; đăng nhập Admin và Gmail ngoài danh sách; tạo/sửa/ngừng bán/bật lại sản phẩm; thêm/tắt/xóa Gmail khác; lỗi mạng và không có sản phẩm. Không coi build thành công là kiểm tra production.

## Deploy price.vuatoi.com.vn

1. `npx firebase login`, `npx firebase projects:list`, xác nhận quyền project vuatoi-price.
2. Điền `.env.local` trước khi build; Vite đưa Web config vào bundle.
3. `npm run build`, `npx firebase deploy --only hosting,firestore:rules --project vuatoi-price`.
4. Firebase Console → Hosting → Add custom domain → nhập **price.vuatoi.com.vn**.
5. Tại nhà cung cấp DNS, thêm chính xác các bản ghi TXT và A/CNAME mà wizard Firebase cung cấp, tránh bản ghi xung đột. Không suy đoán IP và không thay DNS khi chưa có quyền. Chờ xác minh và certificate TLS.
6. Bổ sung domain vào Auth Authorized domains, kiểm tra HTTPS, reload trực tiếp `/admin/products`, Google login và toàn bộ chức năng trên production.

Firebase Hosting có rewrite SPA và public dir dist đã được chuẩn bị trong `firebase.json`; project target trong `.firebaserc`. Deploy sẽ cập nhật Rules hiện có, cần kiểm tra nếu project dùng chung với ứng dụng khác.

Tài liệu: [Google Auth](https://firebase.google.com/docs/auth/web/google-signin), [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started), [Hosting custom domain](https://firebase.google.com/docs/hosting/custom-domain).

## Trạng thái bàn giao

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để lấy preview, DNS cụ thể và lệnh publish production. Firestore/Google Provider/Admin ban đầu/authorized domains/Rules đã cấu hình trên project thật. `scripts/firebase-project.cjs` dùng tài khoản Firebase CLI, không tạo backend riêng: không tham số là kiểm tra domains; `--apply` cấu hình domains và seed Admin nếu chưa tồn tại; `--domain` kiểm tra/tạo binding domain được yêu cầu.

Đã kiểm tra: 2 bài calculator và 5 nhóm Rules bằng Emulator; Google Login bằng Gmail Admin; thêm/sửa/ngừng bán/bật lại sản phẩm qua UI; tìm sản phẩm, nhiều dòng/mục, đổi số lượng/sản phẩm, tổng, xóa dòng/mục; realtime giữa hai tab; Home mobile 390px không tràn ngang. Dữ liệu kiểm thử sản phẩm đã dọn khỏi Firestore. `node scripts/verify-firebase.mjs` kiểm tra read-only production: query active được phép, public query toàn bộ products/admins bị từ chối.

`npm audit --omit=dev` không còn lỗ hổng tại lúc kiểm tra. Firebase CLI vẫn có cảnh báo dependency chuyển tiếp thuộc công cụ development; chúng không được đưa vào frontend bundle. Không dùng `audit fix --force` để ép downgrade Firebase SDK.
