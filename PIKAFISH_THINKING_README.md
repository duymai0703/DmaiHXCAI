# Pikafish Thinking README

README này mô tả cách Pikafish tư duy khi phân tích một hình cờ tướng: engine nhìn bàn cờ ra sao, dùng mạng NNUE để đánh giá thế nào, giá trị quân được dùng ở đâu, điểm số được quy đổi ra sao, và vì sao nước tốt nhất không đơn giản là nước ăn quân nhiều nhất.

Các phần dưới đây dựa trên source hiện tại trong repo, đặc biệt là:

- `src/types.h`
- `src/evaluate.cpp`
- `src/search.cpp`
- `src/position.cpp`
- `src/movepick.cpp`
- `src/uci.cpp`
- `src/nnue/nnue_architecture.h`
- `src/nnue/features/half_ka_v2_hm.cpp`

## 1. Tư duy tổng quát của Pikafish

Pikafish không đánh cờ theo kiểu có một bảng luật cố định như "xe bằng 900, mã bằng 450, tốt qua sông cộng 80" rồi cộng trừ thủ công. Nó là engine kiểu Stockfish hiện đại cho cờ tướng:

1. Biểu diễn hình cờ thật nhanh bằng bitboard, hash và các bảng attack.
2. Sinh nước đi hợp lệ.
3. Dùng tìm kiếm alpha-beta nhiều tầng để thử các biến.
4. Dùng NNUE để đánh giá tĩnh ở các node.
5. Dùng transposition table, move ordering, history, pruning, LMR, quiescence search để không phải duyệt toàn bộ cây.
6. Trả về nước có giá trị cao nhất sau khi đã nhìn trước nhiều lớp phản ứng.

Nói ngắn gọn: NNUE nói "hình này có vẻ tốt/xấu bao nhiêu", còn search kiểm tra "nếu đi nước này, đối thủ đáp lại tốt nhất thì kết quả thật còn tốt không".

## 2. Bàn cờ được engine nhìn như thế nào

Trong `src/types.h`, bàn cờ tướng được đánh chỉ số `90` ô:

- 9 cột: `FILE_A` tới `FILE_I`
- 10 hàng: `RANK_0` tới `RANK_9`
- Các ô là `SQ_A0 ... SQ_I9`

Quân được mã hóa thành `PieceType`:

| Quân | PieceType |
|---|---|
| Xe | `ROOK` |
| Sĩ | `ADVISOR` |
| Pháo | `CANNON` |
| Tốt/Binh | `PAWN` |
| Mã | `KNIGHT` |
| Tượng | `BISHOP` |
| Tướng | `KING` |

Mỗi bên có màu:

- `WHITE`: bên đỏ trong cách engine/FEN nội bộ thường dùng
- `BLACK`: bên đen

Engine dùng `Bitboard = u128`, đủ chứa 90 ô. Việc hỏi "ô này bị quân nào tấn công", "xe đi được đường nào", "pháo có đúng một ngòi không", "mã có bị cản chân không" được tối ưu bằng bitboard và bảng attack dựng sẵn trong `src/bitboard.*`.

Ví dụ tốt/binh:

- Trước khi qua sông chỉ tấn công/đi thẳng.
- Sau khi qua sông có thêm hướng ngang.
- Logic này nằm ở `pawn_attacks_bb()` trong `src/bitboard.h`.

## 3. Giá trị quân cơ bản trong source

Trong `src/types.h`, Pikafish có bảng giá trị quân cơ bản:

| Quân | Giá trị nội bộ |
|---|---:|
| Xe | `1305` |
| Pháo | `773` |
| Mã | `720` |
| Sĩ | `219` |
| Tượng | `187` |
| Tốt/Binh | `144` |
| Tướng | `0` |

Lưu ý rất quan trọng: đây không phải công thức đánh giá cuối cùng kiểu "cộng quân là ra điểm". Các giá trị này được dùng trong nhiều chỗ phụ trợ:

- Tính vật chất lớn còn lại qua `pos.major_material()`.
- Sắp xếp nước ăn quân trong `MovePicker`.
- Static Exchange Evaluation, tức ước lượng trao đổi quân có lời hay lỗ.
- Futility/quiescence pruning.
- Một số nhánh cắt tỉa và heuristic.

Điểm cuối của engine chủ yếu đến từ NNUE + search, không phải chỉ từ bảng quân này.

## 4. NNUE đánh giá hình cờ ra sao

File chính: `src/evaluate.cpp`.

Khi cần đánh giá một vị trí tĩnh, Pikafish gọi:

```cpp
auto [psqt, positional] = network.evaluate(pos, accumulators, caches);
Value nnue = psqt + positional;
```

Nghĩa là mạng NNUE trả về 2 phần:

- `psqt`: phần giống "piece-square table" đã học, tức quân nào ở ô nào, trong ngữ cảnh vua/tướng và cấu trúc hiện tại.
- `positional`: phần chiến lược/vị trí do mạng học được sâu hơn.

Sau đó Pikafish không lấy nguyên `psqt + positional`, mà scale thêm:

```cpp
int nnueComplexity = abs(psqt - positional);
optimism += optimism * nnueComplexity / 465;
nnue -= nnue * nnueComplexity / 11743;

int material = pos.major_material();
int v = (nnue * (17380 + material) + optimism * (3061 + material)) / 20582;
v -= (v * pos.rule60_count()) / 253;
```

Ý nghĩa:

- Nếu `psqt` và `positional` lệch nhau mạnh, vị trí được coi là phức tạp hơn.
- Điểm NNUE bị giảm nhẹ theo độ phức tạp để tránh quá tự tin.
- `optimism` được trộn vào, thường liên quan tới cách search điều chỉnh kỳ vọng.
- Vật chất còn lại (`major_material`) ảnh hưởng cách scale điểm.
- Nếu gần hòa theo luật 60 nước, điểm bị damp xuống.

Cuối cùng điểm được clamp để không lẫn với vùng điểm chiếu bí:

```cpp
VALUE_MATED_IN_MAX_PLY + 1 <= v <= VALUE_MATE_IN_MAX_PLY - 1
```

## 5. NNUE được "cho xem" những đặc trưng nào

Kiến trúc NNUE nằm ở `src/nnue/nnue_architecture.h`.

Các feature chính:

```cpp
using ThreatFeatureSet = Features::FullThreats;
using PSQFeatureSet    = Features::HalfKAv2_hm;
```

Mạng có kích thước:

- `L1 = 1024`
- `L2 = 31`
- `L3 = 32`
- `PSQTBuckets = 16`
- `LayerStacks = 16`

Luồng mạng:

1. Sparse input features.
2. `AffineTransformSparseInput`
3. `SqrClippedReLU`
4. `ClippedReLU`
5. `AffineTransform`
6. `ClippedReLU`
7. `AffineTransform`
8. Quy đổi output về thang khoảng `600 * OutputScale`.

Nói theo ngôn ngữ cờ: NNUE không chỉ thấy "đỏ hơn xe". Nó thấy tổ hợp:

- Tướng hai bên ở đâu.
- Quân nào nằm ở ô nào.
- Có cần mirror hình cờ theo trục để gom thế đối xứng không.
- Bên nào còn bao nhiêu xe/mã/pháo.
- Threat/attack pattern.
- Bucket theo cấu trúc quân mạnh còn lại.

Trong `src/nnue/features/half_ka_v2_hm.cpp`, feature bucket phụ thuộc vào:

- Vị trí tướng mình.
- Vị trí tướng đối phương.
- Có cần mirror trung lộ không.
- Attack bucket theo số xe/mã/pháo.
- Layer stack bucket theo tương quan xe và tổng mã/pháo hai bên.

Ví dụ:

```cpp
bucket = king_bucket * 4 + attack_bucket;
```

Vì vậy cùng một quân mã đứng ở cùng một ô nhưng điểm có thể khác hẳn nếu tướng hai bên đổi vị trí, xe/pháo còn khác, hoặc thế công/thủ khác.

## 6. Vì sao engine không tính lại toàn bộ NNUE mỗi nước

Khi đi một nước, `src/position.cpp` cập nhật `DirtyPiece`:

- quân nào đi từ đâu tới đâu,
- quân nào bị ăn,
- có cần refresh accumulator không,
- bucket/mirror có đổi không.

Trong `Position::do_move()`, engine cập nhật:

- Zobrist key,
- pawn key,
- non-pawn key,
- material,
- checkers bitboard,
- dirty NNUE accumulator.

Nhờ vậy NNUE có thể cập nhật tăng dần thay vì dựng lại từ đầu toàn bộ mạng ở mỗi node. Đây là lý do engine có thể phân tích hàng triệu node rất nhanh.

## 7. Search mới là nơi quyết định nước mạnh nhất

Static eval chỉ là một ảnh chụp. Nước mạnh nhất phải qua search.

Trong `src/search.cpp`, hàm chính là:

```cpp
Value Search::Worker::search(...)
```

Các ý chính:

- Dùng alpha-beta negamax.
- Nếu depth về 0 thì vào `qsearch`.
- Kiểm tra lặp, luật 60 nước, mate distance pruning.
- Probe transposition table để dùng kết quả đã biết.
- Gọi NNUE để lấy static eval.
- Dùng pruning để bỏ nhánh ít triển vọng.
- Dùng move ordering để thử nước tốt trước.
- Lưu kết quả lại vào transposition table.

Những kỹ thuật quan trọng:

| Kỹ thuật | Ý nghĩa |
---|---|
| Transposition Table | Nhớ thế đã phân tích để khỏi tính lại |
| Iterative Deepening | Tìm depth 1,2,3...; dùng kết quả cũ để đi sâu tốt hơn |
| Aspiration Window | Tìm quanh điểm dự kiến để nhanh hơn |
| Null Move Pruning | Nếu bỏ lượt mà vẫn tốt, nhiều khả năng vị trí quá mạnh, có thể cắt |
| ProbCut | Nếu một nước ăn/tactical có vẻ vượt beta rõ, cắt sớm |
| LMR | Những nước muộn, ít hứa hẹn được giảm độ sâu |
| Futility Pruning | Nếu static eval quá thấp so với alpha, bỏ nhánh không đủ bù |
| Quiescence Search | Khi hết depth, vẫn tìm tiếp các nước chiến thuật để tránh horizon effect |

## 8. Move ordering: engine ưu tiên thử nước nào trước

File: `src/movepick.cpp`.

Engine không duyệt nước ngẫu nhiên. Nó thử nước có khả năng tốt trước để alpha-beta cắt nhánh mạnh hơn.

Thứ tự ưu tiên thường gồm:

1. Nước từ transposition table.
2. Nước ăn tốt.
3. Nước chiếu.
4. Nước quiet có history tốt.
5. Nước từng tốt trong cùng kiểu cấu trúc tốt/quân.
6. Nước muộn/ít hứa hẹn bị giảm độ sâu hoặc cắt.

Với nước ăn, source dùng:

```cpp
captureHistory + 7 * PieceValue[capturedPiece]
```

Tức ăn quân lớn được ưu tiên, nhưng vẫn kết hợp lịch sử thực chiến của engine.

Với nước không ăn, engine cộng:

- main history,
- pawn history,
- continuation history,
- bonus nếu tạo chiếu,
- phạt nếu đi vào ô bị quân nhỏ hơn tấn công,
- thưởng nếu thoát khỏi ô đang bị quân nhỏ hơn uy hiếp.

Đây là lý do engine có thể tìm các nước không ăn quân nhưng rất mạnh: nó không bị ám ảnh bởi material đơn giản.

## 9. Quiescence Search: tránh nhìn nhầm khi đang loạn chiến

Nếu dừng search đúng lúc một bên vừa treo xe, điểm static sẽ sai. Vì vậy khi depth hết, engine không dừng ngay mà vào:

```cpp
Value Search::Worker::qsearch(...)
```

Qsearch thường xét tiếp:

- nước ăn,
- nước chiếu/evasion,
- tactical move quan trọng,
- SEE để bỏ nước ăn lỗ.

Ví dụ nếu một bên vừa ăn pháo nhưng sau đó bị xe ăn lại, qsearch giúp engine thấy chuỗi đổi quân đó thay vì tưởng đang lời.

## 10. Điểm số nội bộ, centipawn và mate

Trong `src/types.h`:

```cpp
VALUE_MATE = 32000
VALUE_INFINITE = 32001
VALUE_NONE = 32002
```

Các điểm gần `32000` là vùng chiếu bí, không phải ưu quân thường.

Khi xuất UCI, `src/score.cpp` phân biệt:

- Nếu điểm chưa vào vùng quyết định: xuất `cp`.
- Nếu là thắng/thua cưỡng bức: xuất `mate N`.

Trong `src/uci.cpp`, điểm nội bộ được đổi sang centipawn bằng:

```cpp
to_cp(v, pos) = round(100 * v / a)
```

Trong đó `a` phụ thuộc vật chất còn lại:

```cpp
material = 10*rook + 5*knight + 5*cannon + 3*bishop + 2*advisor + pawn
```

Rồi đưa vào một đa thức WDL để tính hệ số. Vì vậy cùng một `Value` nội bộ có thể đổi ra cp hơi khác ở khai cuộc, trung cuộc, tàn cuộc.

Điểm `+400` không có nghĩa chính xác là hơn 4 tốt theo kiểu tuyệt đối. Nó nghĩa là theo mô hình WDL của engine, vị trí nghiêng mạnh về bên đang được quy chiếu. Trong app của mình, điểm còn được quy đổi theo góc nhìn người dùng và có scale hiển thị riêng, nên nên hiểu là "độ ưu thế" hơn là tiền tệ cố định.

## 11. Tướng bị chiếu bí được xử lý thế nào

Engine không cho ăn tướng như một quân bình thường. Trong `Position::do_move()` có assert:

```cpp
assert(type_of(captured) != KING);
```

Ván cờ kết thúc khi một bên không còn nước hợp lệ để thoát chiếu, tức checkmate. Search trả về giá trị mate gần `VALUE_MATE`, sau đó UCI format thành `mate N`.

Trong app, ta có thể biểu diễn mate thành điểm rất lớn như `31999` hoặc `-31999`, nhưng đó là cách UI thể hiện. Về UCI chuẩn, engine ưu tiên nói "mate trong N nước".

## 12. "Xử lý hình cờ" theo từng bước

Khi người dùng đưa FEN vào engine:

1. Parse FEN thành `Position`.
2. Tạo bitboard cho từng loại quân/màu.
3. Tính Zobrist key để nhận diện thế.
4. Tính các attack/check info.
5. Tạo accumulator NNUE ban đầu.
6. Search bắt đầu từ root.
7. MovePicker sinh và sắp nước.
8. Với mỗi nước:
   - `do_move()` cập nhật position.
   - NNUE accumulator được update bằng dirty feature.
   - search đệ quy.
   - `undo_move()` phục hồi.
9. Khi tới leaf hoặc cần static eval:
   - NNUE trả `psqt + positional`.
   - Eval scale theo material/complexity/rule60.
10. Root chọn PV tốt nhất và trả `bestmove`.

## 13. Cách hiểu điểm trong thực chiến

Một cách đọc gần đúng:

| Điểm hiển thị | Ý nghĩa thực chiến |
---:|---|
| 0 | cân bằng hoặc engine chưa thấy khác biệt rõ |
| ±100 đến ±300 | nhỉnh nhẹ, có lợi thế nhưng chưa quyết định |
| ±400 đến ±700 | ưu rõ, thường do quân/ thế công/ an toàn tướng |
| ±800 đến ±1500 | ưu rất nặng, có thể thắng nếu không sai |
| gần ±32000 hoặc `mate N` | có đường chiếu bí cưỡng bức |

Nhưng cần nhớ: điểm không phải "số quân ăn được". Một thế kém vật chất vẫn có thể dương nếu có chiếu bí, khóa quân, hoặc tướng đối phương quá yếu. Ngược lại, hơn quân vẫn có thể âm nếu tướng bị công sát.

## 14. Kết luận

Pikafish tư duy theo hai lớp:

1. **NNUE hiểu hình cờ**: học từ dữ liệu lớn để đánh giá tổ hợp quân, tướng, thế công, cấu trúc còn lại.
2. **Search kiểm chứng chiến thuật**: thử các phản ứng tốt nhất của hai bên để tránh đánh giá ảo.

Giá trị quân trong source giúp engine định hướng và cắt tỉa, nhưng "linh hồn" của đánh giá hiện đại nằm ở NNUE và quá trình search. Vì vậy khi app vẽ mũi tên nước mạnh nhất, đó không chỉ là nước có điểm static cao, mà là nước sống sót qua nhiều lớp phản biện của chính engine.
