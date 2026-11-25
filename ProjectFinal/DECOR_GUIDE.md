# Bộ decor mở rộng

Đã thêm 24 món nội thất/trang trí và 4 mục kiến trúc: cửa đóng, cửa mở, cửa sổ/rèm, đoạn hàng rào. Mỗi mục có 4 hướng, tổng 112 PNG mới và 28 atlas. Cửa đóng/mở là hai trạng thái của cùng một loại cửa, không phải hai vật phải đặt đồng thời. Bộ cũ được giữ để có lựa chọn trống hoặc trang trí sẵn.

Mở `5_Previews/Asset_Viewer.html` và chọn nhóm **Bộ decor mới**. Nút xoay đổi sprite theo hướng; phần thông tin ghi vị trí đặt và các thành phần đã gộp. `5_Previews/Decor_Combinations.png` minh họa cách kết hợp. Map demo cơ bản vẫn giữ bố trí trước đó; các món mới nằm trong danh mục để chọn decor.

## Quy tắc gộp và tách

| Bộ gộp — di chuyển/xoay một lần | Đã nằm trong sprite | Đặt riêng |
|---|---|---|
| ComputerDesk | Bàn, màn hình, bàn phím, chuột | OfficeChair, TrashBin |
| TVConsole | Kệ, TV, sách trong kệ | Sofa, bàn trà, đèn |
| DiningTableSet | Bàn ăn, khăn caro, lọ hoa | Các ghế ăn |
| KitchenCounterSet | Tủ bếp, mặt bàn, cốc, hũ | Bếp, bồn rửa, tủ lạnh |
| KitchenWallShelf | Kệ, thanh treo, 3 chảo, cốc/hũ | Gắn vào tường |
| EntryConsoleSet | Bàn console, khung ảnh, sách, chậu cây | Thảm lối vào |
| LongSofa | Sofa dài, gối xanh và vàng | Bàn trà, kệ TV |
| CatBedSet | Đệm tròn và mèo đang ngủ | Mèo là hình tĩnh, không có AI/animation |
| ReadingTray | Khay, hai sách, cốc, giấy | Đặt trên bàn trà |

Những thành phần đã gộp không có thể chọn/xóa riêng trong bộ này. Ví dụ thay màn hình riêng trên ComputerDesk cần tạo biến thể bàn khác. Cách gộp này cho phép người chơi decor nhanh mà không phải căn từng món nhỏ; các sprite bàn trống cũ vẫn dùng được cho bộ phụ kiện khác.

## Danh sách mới

| Nhóm | Asset |
|---|---|
| Làm việc / TV | ComputerDesk, OfficeChair, TrashBin, TVConsole |
| Bếp / lối vào | DiningTableSet, KitchenCounterSet, KitchenWallShelf, EntryConsoleSet |
| Đồ trang trí nhỏ | WallPainting, PhotoFrame, ReadingTray, TableLamp |
| Sofa / phòng ngủ | LongSofa, ThrowPillow, CatBedSet, Slippers |
| Thảm / lavabo | RoundRug, FloralRug, StudyRug, BathroomVanity |
| Cây / phụ kiện | TrailingPlant, FlowerVase, SmallPlant, DoorMat |
| Kiến trúc | DoorClosed, DoorOpen, CurtainedWindow, FenceSegment |

## Đặt phụ kiện dễ và đúng lớp

`4_Data_and_Fonts/Configs/DecorPlacement.json` phân loại vị trí đặt: sàn, thảm sát sàn, mặt bàn, mép tủ, mặt ghế, tường, ô cửa và ranh giới sân. Đây là dữ liệu bàn giao cho hệ thống decor, chưa phải code kéo-thả trong game.

- Đồ chính trên sàn: đặt theo lưới gợi ý 16 px, tính footprint theo hướng. Xoay bằng thứ tự Down → Right → Up → Left. Atlas vẫn có cột Down, Left, Right, Up.
- Phụ kiện nhỏ trên bàn: dùng điểm gắn trên mặt bàn, cho phép căn lưới nhỏ 4 px. Khi xác nhận đặt, lưu quan hệ cha–con và vị trí tương đối với bàn. Khi bàn di chuyển, phụ kiện đi theo; khi bàn xoay, chọn sprite và điểm gắn phù hợp của hướng mới.
- Thứ tự vẽ phụ kiện đi theo đồ chủ rồi thêm một độ ưu tiên nhỏ. Không sắp xếp độc lập chỉ theo vị trí đáy ảnh, vì đèn/khay có thể bị vẽ dưới mặt bàn.
- Cây dây rủ `TrailingPlant`: pivot nằm ở đáy chậu, không ở đầu dây rủ. Dùng `frames[].pivotPixels` vì mỗi hướng có chiều dài dây khác nhau. Phần dây tự kéo xuống dưới mặt tủ.
- Gối rời đặt lên ghế/sofa có chỗ trống. LongSofa đã có hai gối, tránh tự thêm trùng vào đúng vị trí đó.
- Tranh/kệ treo/cửa sổ chỉ gắn lên mặt tường hợp lệ. Các góc bên là hình phối cảnh trang trí, không phải bộ tile tường ghép tự động.
- Thảm ở dưới đồ vật và nhân vật, không có collider cứng. Đồ gắn trên bàn/tường không tự tạo vật cản trên sàn.

Chưa có tọa độ socket mặt bàn được nghiệm thu theo từng món/từng hướng. Coder cần khai báo chúng và kiểm tra va chạm, khoảng trống, giới hạn mặt bàn trong engine. Hướng xoay, pivot và nhóm gộp đã có sẵn trong `FurnitureRules.json`.

## Kiến trúc và giới hạn

Cửa đóng và mở dùng cùng tỷ lệ, ô ảnh và điểm đặt; có thể thử đổi state. Hình tạo sinh có thể khác chút chi tiết khung ở hai trạng thái, chưa phải chuỗi hoạt ảnh cửa nội suy. Các cửa/cửa sổ/hàng rào đã vẽ vào nền hiện tại vẫn ở đó: không chồng sprite mới lên rồi kỳ vọng cửa nền biến mất. Dùng các sprite kiến trúc cho scene ghép hoặc chỉnh riêng nền khi tích hợp.

Những đồ tròn và đối xứng có thể gần giống nhau khi xoay. Mèo chỉ là vật trang trí nằm trong CatBedSet. Các ảnh nguồn và prompt nằm ở `1_2D_Art/Environment/Source/DecorExpansion/` và `Tools/decor-expansion.json`; được tạo bằng imagegen tích hợp, rồi chia ảnh/căn pivot bằng script.

Để dựng lại riêng bộ mới (cần Node.js + sharp): `node Tools/build-decor-expansion.js`, sau đó `node Tools/build-preview.js` và `node Tools/validate-assets.js`. Các script cập nhật manifest, catalog và trang xem thử.
