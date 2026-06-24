# Đưa DmaiHXCAI Lên Web Hoàn Chỉnh

Cách đơn giản nhất là deploy **một dịch vụ Docker duy nhất**. Khi đó:

- Frontend chạy cùng domain với backend.
- Pikafish chạy trên server.
- ChessDB được gọi qua backend.
- Mọi thiết bị chỉ cần mở một URL là dùng được.

## Cách Khuyến Nghị: Render Docker

Project đã có sẵn:

- `Dockerfile`
- `.dockerignore`
- `render.yaml`
- `package.json`
- Backend Node.js tại `analysis-app/server.js`
- Frontend tại `analysis-app/public`

Các bước:

1. Đưa thư mục `D:\DmaiHXCAI` lên một GitHub repository.
2. Vào Render Dashboard.
3. Chọn `New` -> `Blueprint`.
4. Kết nối repository vừa tạo.
5. Render sẽ đọc `render.yaml`, build Docker image, compile Pikafish Linux, tải `pikafish.nnue`, rồi chạy web.

Sau khi deploy xong, Render sẽ cấp URL dạng:

```text
https://dmaihxcai.onrender.com
```

Mở URL đó trên điện thoại hoặc máy khác là dùng được engine.

## Vì Sao Không Dùng Mỗi Netlify?

Netlify chỉ host static frontend. Nó không chạy được Pikafish native như một backend thường trực.

Nếu vẫn muốn dùng Netlify:

- Netlify host frontend.
- Render/Cloud Run/VPS host backend.
- `analysis-app/public/config.js` phải trỏ tới URL backend.

Nhưng cách này phức tạp hơn. Với project hiện tại, deploy một Docker service trên Render/Cloud Run/VPS là sạch nhất.

## Chạy Thử Docker Trên Máy Có Docker

```bash
docker build -t dmaihxcai .
docker run --rm -p 8080:8080 dmaihxcai
```

Mở:

```text
http://localhost:8080
```

## Lưu Ý

- Lần build đầu tiên có thể lâu vì phải compile Pikafish và tải NNUE.
- Dịch vụ miễn phí nếu ngủ sau một thời gian không dùng thì lần mở đầu có thể chậm.
- Nếu dùng server yếu, giảm độ sâu engine trong giao diện để phản hồi nhanh hơn.
