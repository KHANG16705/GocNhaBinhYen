# ProjectFinal — Góc Nhà Bình Yên (Chuẩn Mỹ Thuật & Dữ Liệu v1.9)

Bộ tài nguyên thiết kế & dữ liệu duy nhất của dự án **Góc Nhà Bình Yên**, đồng bộ hoàn toàn với `../GDD Góc Nhà Bình Yên v1.9 ProjectFinal.docx` (`schemaVersion: 9`, `mapRevision: "1.9-PF"`).

Mở **`5_Previews/Asset_Viewer.html`** bằng trình duyệt để xem nhân vật 4 hướng, xoay 48 loại nội thất/kiến trúc, duyệt đủ 10 loài cây × 3 giai đoạn, 6 loài cá, Ao cá, Bể cá, Giàn phơi và bộ vật phẩm việc nhà. Xem bố cục tổng thể tại **`5_Previews/Map_Demo_v19.png`**.

## Nội dung hiện có (Đã kiểm định `Validation.json`)

- **Bản đồ 1536 × 1152 px (48 × 36 ô @ 32 PPU):**
  - 5 khu trong nhà (Phòng ngủ trên trái, Góc làm việc/Hành lang giữa, Phòng khách giữa phía trước, Bếp trên phải, **Phòng tiện ích/Giặt dưới phải đã mở cửa đi thông từ hành lang gỗ**) + Sân vườn phía dưới.
  - Gồm `Background_EmptyMap.png`, `Background_Base.png`, `Background_Occlusion.png` và **16 đoạn tường rời `Backgrounds/Walls/`** ghép khớp pixel 100% để Y-sort.
- **Hai nhân vật Nam / Nữ:** Spritesheet `768 × 448 px` (`96 × 112 px`/frame, pivot `[48, 104]`), 4 hướng × 8 cột (2 Idle @ 2 fps + 6 Walk @ 8 fps), kèm 64 PNG frame rời và 16 clip JSON.
- **Nội thất & Trang trí (48 mục × 4 hướng = 192 PNG + 48 atlas):**
  - 20 mục cơ bản + **24 món bày bán trong Cửa hàng** (6 danh mục, đã khai báo giá bán & tọa độ socket mặt bàn/mép tủ/ghế/tường trong `FurnitureRules.json`) + **4 asset kiến trúc** (`DoorClosed`, `DoorOpen`, `CurtainedWindow`, `FenceSegment`).
- **10 loài cây trồng × 3 giai đoạn (`30 PNG`, `112 × 112 px`, pivot `[56, 104]`):** Hoa cúc, Hoa hồng, Hướng dương, Táo, Lê, Xoài, Cây cảnh, Bonsai, Lan đột biến, Kim tiền — trồng trên **2 luống vườn phải (6 ô độc lập)**.
- **Hệ thống Câu cá & Bể cá trưng bày (`1_2D_Art/Fishing/`):** Ao cá sân vườn `POND_01` (thay luống trái cũ), Bể cá phòng khách `AQUARIUM_01`, phông nền màn Xem Bể cá phóng to `UI_Aquarium_Background.png` (`960 × 500 px`), Cần câu, FX phao/gợn nước/bọt khí và **6 loài cá** (`Fish_Guppy`, `Fish_NeonTetra`, `Fish_Goldfish`, `Fish_Betta`, `Fish_MiniKoi`, `Fish_MiniArowana`).
- **Hệ thống Việc nhà & Trạm giặt phơi (`1_2D_Art/Chores/`):** Bụi phòng khách (`Dust_01/02`), Vết bẩn bếp (`KitchenStain_01/02`), Quần áo bẩn phòng ngủ (`DirtyClothes_01/02`), Giỏ bẩn/ướt (`LaundryBasket_Full/Wet`), Cây lau (`Mop`), Máy giặt trạng thái đang giặt (`Washing_01/02`) & chờ lấy (`Ready`), Giàn phơi 3 trạng thái (`Empty`/`Drying`/`DryReady`).
- **UI & Fonts (`1_2D_Art/UI/`, `4_Data_and_Fonts/Fonts/`):** 13 thành phần 9-slice PNG chuẩn bảng màu GDD `#FFF5DF` / `#52724E`, 11 UI Icons, 6 World Icons, font `Noto Sans` (Regular/SemiBold + OFL).
- **Âm thanh (`3_Audio/`, 14 tệp):** `BGM/HomeLoop.ogg` + 13 SFX WAV 16-bit 44.1 kHz (`Click`, `Coin`, `Place`, `Sweep`, `Water`, `PestCatch`, `Wipe`, `Cloth`, `WashLoop`, `Ready`, `Cast`, `FishBite`, `CatchFish`).
- **Dữ liệu cấu hình (`4_Data_and_Fonts/Configs/`):** Đủ bộ JSON chuẩn `1.9-PF` (UTF-8 không BOM): `GameplayConfig.json`, `MapLayout.json`, `MapLayers.json`, `FurnitureRules.json`, `DecorPlacement.json`, `PlantManifest.json`, `AudioManifest.json`, `UITokens.json`, `AnimationManifest.json`, `AssetManifest.json`, `Validation.json` + `ThirdPartyNotices.txt`.

## Cấu trúc thư mục

```text
ProjectFinal/
├── 1_2D_Art/
│   ├── Backgrounds/       EmptyMap, Base, Occlusion, Walls/ (16 đoạn tường Y-sort)
│   ├── Characters/        Male & Female spritesheets (768×448)
│   ├── Chores/            Bụi, vết bẩn, đồ bẩn, giỏ, cây lau, Máy giặt (Washing/Ready), Giàn phơi (3 trạng thái)
│   ├── Environment/       192 PNG 4 hướng, Atlases/ (48 atlas), Garden/ (4 cảnh quan)
│   ├── Fishing/           Ao cá, Bể cá, Phông nền Bể cá 960×500, 6 loài cá, Cần câu & FX
│   └── UI/                Components/ (13 PNG 9-slice), Icons/ (11 UI icons), WorldIcons/ (6 world icons)
├── 2_Animations/
│   ├── Characters/        Male/ & Female/: Frames/ (64 PNG) + 16 clip JSON
│   └── Plants/            10 loài × 3 giai đoạn = 30 PNG (112×112)
├── 3_Audio/
│   ├── BGM/               HomeLoop.ogg
│   └── SFX/               13 tệp WAV (16-bit 44.1 kHz)
├── 4_Data_and_Fonts/
│   ├── Configs/           Toàn bộ JSON chuẩn v1.9-PF
│   └── Fonts/             Noto Sans Regular/SemiBold + OFL.txt
├── 5_Previews/            Asset_Viewer.html, Map_Demo_v19.png và các bảng catalog
├── References/            Style_Reference.png
├── Tools/                 Script dựng/kiểm tra asset và prompt nguồn
└── ThirdPartyNotices.txt  Thông tin bản quyền font, artwork và âm thanh
```
