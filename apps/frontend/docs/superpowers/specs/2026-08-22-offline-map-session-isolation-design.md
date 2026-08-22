# Offline Map Fallback and Session Isolation Design

## Goal

Giữ được ngữ cảnh bản đồ khi chạy local không có Internet, đồng thời bảo đảm User mới đăng nhập chỉ nhìn thấy dữ liệu chuyến đi thuộc phiên của chính họ.

## Confirmed root causes

- `CrabMap` đã tạo Leaflet map, route và marker; tile nền duy nhất lấy từ `*.tile.openstreetmap.org`. DNS của môi trường local không phân giải được host này, nên nền map trống.
- Backend tạo trip với `FINDING_DRIVER`; chỉ `POST /trips/:id/accept` mới đổi sang `ACCEPTED`. Customer không có code gọi endpoint accept.
- `CustomerHomePage` chỉ hydrate khi API có active trip. Khi API trả `null`, Zustand giữ `activeTrip` trong bộ nhớ từ phiên trước. `authStore.login` cũng không reset session-bound stores hoặc tái xác thực socket đang mở.

## Chosen design

### Offline map layer

Giữ `TileLayer` OpenStreetMap làm nguồn chính. Sau hai `tileerror` liên tiếp mà chưa có `tileload`, map bật `OfflineMapLayer`: Leaflet `GridLayer` tạo canvas tile cục bộ, có lưới tọa độ, đường sơ đồ và nhãn "Bản đồ offline". Layer này không gọi network, pan/zoom cùng Leaflet và không che marker, route hay radius. Một thông báo UI nêu rõ dữ liệu đường/địa danh không khả dụng để không gây hiểu lầm là bản đồ đường phố thật.

### Session isolation

`authStore.login` và `logout` trở thành ranh giới dọn session: disconnect socket cũ, reset `tripStore` và `driverStore`, sau đó mới lưu token/user mới và kết nối socket. `CustomerHomePage` tiếp tục làm lớp bảo vệ thứ hai: response `GET /trips/active` là `null` sẽ gọi reset thay vì giữ state trước đó.

## Scope and safety

- Chỉ thay đổi `apps/frontend`; không đổi API, backend dispatch hoặc trip state machine.
- Không thêm dependency hoặc asset tile lớn.
- Fleet simulation chỉ là lớp hiển thị local; không được gọi accept API.
- Simulator vẫn chỉ phát chuyển động tại `ACCEPTED` và `IN_TRANSIT`.

## Verification

- Unit test kích hoạt fallback sau hai tile errors, và không kích hoạt khi tile tải thành công.
- Unit/integration test login mới xóa trip/driver state đang tồn tại.
- Unit test hydrate `null` xóa trip customer đang stale.
- Chạy toàn bộ `npm.cmd test`, production build và local browser smoke khi DNS tile không khả dụng.
