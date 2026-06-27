# Deploy DmaiHXCAI

Ứng dụng này chạy theo mô hình server-side engine:

- Trình duyệt trên điện thoại/máy tính chỉ mở web và gọi API.
- Node.js backend chạy Pikafish bằng UCI.
- Pikafish chạy trên server/cloud, nên mọi thiết bị truy cập cùng URL đều dùng được engine.

## Chạy bằng Docker

Docker image sẽ tự build Pikafish bản Linux từ source và kèm `pikafish.nnue`.

```bash
docker build -t dmaihxcai .
docker run --rm -p 8080:8080 dmaihxcai
```

Mở:

```text
http://localhost:8080
```

## Deploy Google Cloud Run

Trong thư mục project:

```bash
gcloud run deploy dmaihxcai --source . --region asia-southeast1 --allow-unauthenticated
```

Cloud Run sẽ build Docker image, chạy backend ở biến môi trường `PORT=8080`, và dùng engine tại:

```text
/app/src/pikafish
```

## Netlify frontend + Render/Cloud Run backend

Đây là cách khuyến nghị nếu muốn tránh hẳn màn `Render waking up` ở frontend. Netlify chỉ host giao diện tĩnh, còn Pikafish chạy ở backend riêng như Render hoặc Google Cloud Run.

Nếu frontend cũng chạy trực tiếp trên Render free web service thì lúc service đang ngủ, người dùng vẫn có thể thấy trang chờ của Render trước khi JavaScript của app kịp chạy. Tách frontend ra Netlify sẽ mượt hơn rõ rệt.

1. Deploy backend trước bằng Render hoặc Cloud Run.
2. Lấy URL backend, ví dụ:

```text
https://dmaihxcai.onrender.com
```

3. `netlify.toml` đã có sẵn proxy:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://dmaihxcai.onrender.com/api/:splat"
  status = 200
  force = true
```

4. Trong `analysis-app/public/config.js`, frontend cũng tự nhận biết:
- chạy local hoặc trên chính `*.onrender.com` thì gọi same-origin
- chạy từ `file://` hay host tĩnh khác thì tự gọi `https://dmaihxcai.onrender.com`

5. Deploy project lên Netlify. File `netlify.toml` đã trỏ publish folder tới:

```text
analysis-app/public
```

Khi đó mọi thiết bị mở URL Netlify sẽ dùng frontend trên Netlify, còn engine Pikafish và ChessDB proxy chạy qua backend Render/Cloud Run.

## Deploy VPS/Linux

```bash
cd src
make -j"$(nproc)" build ARCH=x86-64 COMP=gcc
cd ..
npm start
```

Nếu engine nằm ở nơi khác:

```bash
PIKAFISH_ENGINE=/duong/dan/toi/pikafish PORT=8080 npm start
```

## Lưu ý

- Không thể chạy Pikafish trực tiếp trên trình duyệt của từng thiết bị bằng file `.exe`.
- Muốn mọi thiết bị dùng được engine, phải để backend/server chạy engine và public URL web.
- Cloud Run hoặc VPS cần cho phép process con, vì backend dùng Node.js `spawn()` để gọi Pikafish.
