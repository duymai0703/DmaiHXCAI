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

## Netlify frontend + Cloud Run backend

Netlify chỉ nên dùng để host giao diện tĩnh. Pikafish vẫn phải chạy ở backend riêng như Google Cloud Run hoặc VPS.

1. Deploy backend trước bằng Cloud Run.
2. Lấy URL backend, ví dụ:

```text
https://dmaihxcai-xxxxx-uc.a.run.app
```

3. Trong `analysis-app/public/config.js`, đặt:

```js
window.DMAIHXCAI_API_BASE = "https://dmaihxcai-xxxxx-uc.a.run.app";
```

4. Deploy project lên Netlify. File `netlify.toml` đã trỏ publish folder tới:

```text
analysis-app/public
```

Khi đó mọi thiết bị mở URL Netlify sẽ dùng frontend trên Netlify, còn engine Pikafish và ChessDB proxy chạy qua backend Cloud Run.

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
