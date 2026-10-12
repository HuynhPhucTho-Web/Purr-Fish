# Purr-Fish – Tài liệu mô tả chi tiết game

## 1. Tổng quan

Purr-Fish là một game mô phỏng nuôi mèo kết hợp với cơ chế clicker và quản lý tài nguyên. Người chơi chăm sóc một chú mèo, thu thập cá, nâng cấp sức mạnh, mở skin, quản lý trạng thái ăn uống và đi lên cấp độ. Mỗi lần tương tác với mèo và hoạt động trong hồ cá đều tạo ra tiền tệ (cá) để mở khóa tiến triển và nội dung mới.

Game được xây dựng bằng React + TypeScript + Vite và tích hợp Firebase cho đăng nhập, lưu dữ liệu đám mây, bảng xếp hạng và đồng bộ dữ liệu người chơi.

---

## 2. Mục tiêu trò chơi

Mục tiêu chính của người chơi là:

- chăm sóc mèo để duy trì trạng thái khỏe mạnh;
- thu thập cá từ cú click, tự động bắt cá và hồ cá;
- bán cá trong giỏ cá để tích lũy tiền và tiến lên cấp;
- nâng cấp sức mạnh riêng cho mèo;
- mở khóa skin và trang phục mới cho mèo;
- đạt thứ hạng cao trong bảng xếp hạng và nâng cấp toàn bộ hệ thống.

Người chơi không chỉ "bấm" để kiếm tiền mà còn phải quản lý sức khỏe và năng lượng của mèo, vì trạng thái đói và khát có ảnh hưởng trực tiếp đến hiệu suất auto-fish và độ hiệu quả của click.

---

## 3. Cấu trúc game

### 3.1. Màn hình chính

Game chủ yếu chia thành các view chính sau:

1. Cat Room (Phòng mèo)
   - nơi người chơi tương tác trực tiếp với mèo;
   - có thể vuốt ve, cho ăn, cho uống, xem trạng thái;
   - xem cấp độ, chỉ số sức mạnh, lượng cá tự động/s.

2. Fish Pond (Hồ cá)
   - nơi bắt cá bằng cách tương tác với bể cá;
   - cá có thể được thu thập và lưu vào giỏ cá.

3. Fish Basket (Giỏ cá)
   - nơi xem danh sách cá đã bắt;
   - có thể bán cá lẻ hoặc bán tất cả;
   - hỗ trợ theo dõi số lượng, giá trị và tiến độ thu thập.

4. Food Shop & Meal Plan (Cửa hàng thức ăn)
   - mua thức ăn và nước;
   - dùng gói dinh dưỡng để tăng trạng thái ăn uống;
   - cho mèo ăn uống và duy trì sức khỏe dài hạn.

5. Shop & Skins (Cửa hàng nâng cấp và skin)
   - mua upgrade cho mèo như móng vuốt, tốc độ bắt cá, combo, vương giả;
   - mở khóa skin mới và trang bị cho mèo.

6. Leaderboard (Bảng xếp hạng)
   - hiển thị cấp độ, XP, hạng, số cá lớn nhất, điểm số cá tích lũy.

7. Account & Settings (Tài khoản & cài đặt)
   - quản lý tài khoản,
   - cài đặt âm thanh, haptics, hiệu ứng, lưu game;
   - xuất/nhập save, đồng bộ Firebase.

---

## 4. Cơ chế gameplay

### 4.1. Clicker và combo

Khi người chơi tương tác với mèo bằng click, hệ thống tính toán lượng cá kiếm được dựa trên:

- sức mạnh click cơ bản của mèo;
- cấp độ nâng cấp móng vuốt và cá vàng;
- skin hiện tại đang mặc;
- hệ số combo đang có;
- trạng thái dinh dưỡng (ăn uống và nước).

Tính năng combo cho phép người chơi click liên tiếp để tăng phần thưởng, với tỷ lệ phụ thuộc vào upgrade combo. Khi combo đạt mức cao, trạng thái Frenzy sẽ được kích hoạt, làm tăng giá trị click và hiệu ứng ưu đãi.

Có xác suất crit (chí mạng) tăng phần thưởng, đồng thời xuất hiện hiệu ứng hiệu ứng floating text và sparkles.

### 4.2. Auto-fish

Ngoài click, mèo còn có khả năng bắt cá tự động theo thời gian. Tỷ lệ auto-fish được tính từ:

- upgrade "Mèo siêu tốc";
- upgrade "Mèo hoàng gia";
- hệ số tăng của skin;
- trạng thái của mèo: nếu ăn và uống đủ 60% trở lên, auto-fish tăng thêm 25%; nếu quá đói hoặc khát, auto-fish giảm 25%.

Điều này khiến game có cảm giác idle progression: người chơi có thể để game chạy nền và tiếp tục tích lũy cá từ từ.

### 4.3. Hệ thống thức ăn và nước

Mèo có hai chỉ số quan trọng:

- Food (thức ăn)
- Water (nước)

Hai chỉ số này giảm dần theo thời gian và khi người chơi tương tác. Nếu mèo đói hoặc khát, hiệu suất click và auto-fish sẽ bị giảm. Người chơi có thể:

- mua thức ăn và nước từ cửa hàng;
- cho mèo ăn trực tiếp từ kho đồ;
- sử dụng meal plan để tự động cho ăn uống theo lịch trình.

Nếu đang hoạt động một gói kế hoạch dinh dưỡng, game tự động cho mèo ăn uống khi mức dinh dưỡng dưới ngưỡng 30%.

---

## 5. Hệ thống tiền tệ và tiến hóa

### 5.1. Tiền tệ chính

Tiền tệ chính của game là "cá" (fish), được dùng để:

- mua vật phẩm;
- mua upgrade;
- mở khóa skin;
- thanh toán cho thức ăn và combo;
- tương tác trong toàn bộ hệ thống kinh tế.

### 5.2. Tổng quan kinh tế

Player thu nhập chủ yếu từ 3 nguồn:

1. Click vào mèo
2. Auto-fish theo thời gian
3. Bán cá trong giỏ cá

Nền kinh tế của game được thiết kế theo hướng tăng dần và nghiệm thu dần: các upgrade cấp thấp dễ mua, upgrade cao yêu cầu người chơi tích lũy lớn hơn và đạt tiến độ cấp cao hơn.

### 5.3. XP và cấp độ

Mỗi lượng cá kiếm được và từng hành động trong game góp vào XP. Hệ thống cấp độ tính theo tổng XP đã tích lũy.

Theo tiến độ, mèo cũng phát triển theo các giai đoạn:

- giai đoạn khởi đầu;
- giai đoạn tăng trưởng;
- giai đoạn trưởng thành;
- giai đoạn hoàng gia / đặc biệt.

Điều này khiến việc nuôi mèo có cảm giác tiến bộ dài hạn, không chỉ dừng ở việc "bấm tiền".

---

## 6. Hệ thống upgrade

Game có các loại nâng cấp chính như sau:

### 6.1. Móng vuốt khỏe
- tăng lượng cá mỗi lần click;
- cấp độ tăng dần theo từng mức.

### 6.2. Mèo siêu tốc
- tăng lượng cá bắt được tự động mỗi giây;
- hỗ trợ màn hình idle.

### 6.3. Cá vàng
- tăng hệ số sản lượng click;
- có hiệu ứng nhân đôi / nhân nhiều hơn tùy level.

### 6.4. Combo xịn
- tăng hiệu quả combo;
- kéo dài thời gian combo và lợi ích khi click liên tục.

### 6.5. Mèo hoàng gia
- nâng mức sản lượng tối đa;
- tăng cả hiệu quả click và auto-fish;
- mở khóa các trạng thái cực mạnh ở tiến độ cao.

Mỗi upgrade đều có mô tả trực quan, chi phí, và tác động rõ ràng cho người chơi.

---

## 7. Hệ thống skin

Skin là vật phẩm trang trí và đồng thời tăng hiệu suất của mèo. Mỗi skin có:

- tên và mô tả;
- giá unlock;
- chỉ số click bonus;
- chỉ số auto bonus;
- hệ số combo bonus;
- màu sắc và biểu tượng mèo.

Ví dụ skin có sẵn như:

- Mèo Cam Vui Vẻ
- Mèo Kem Tai Cụp
- Mèo Bicolor Nhị Thể
- Mèo Xám Hoàng Gia Anh
- Mèo Mướp Rừng
- Mèo Tuxedo Quý Phái
- Mèo Ragdoll Tuyết

Các skin không chỉ tạo độ mới mẻ mà còn reshape hiệu năng game, khiến người chơi lựa chọn giữa mục tiêu thẩm mỹ và hiệu quả kinh tế.

---

## 8. Hệ thống giỏ cá và bán cá

### 8.1. Giỏ cá

Sau khi bắt được cá ở hồ cá, cá được lưu vào giỏ cá dưới dạng danh sách từng con. Người chơi có thể:

- xem cá đã bắt;
- kiểm tra giá trị;
- bán cá ở từng mục;
- bán tất cả cá cùng lúc.

### 8.2. Tính giá trị cá

Mỗi loại cá có giá trị và độ hiếm khác nhau. Game có mô hình rút gọn với nhiều loại cá và rank/rarity. Một số cá đặc biệt có giá trị cao hơn và thường đi cùng hiệu ứng thưởng như golden fish.

### 8.3. Tác dụng của bí quyết bán cá

Việc bán cá là nhịp thở quan trọng của vòng lặp kiếm tiền. Khi player tích lũy đủ cá, họ có thể:

- mua upgrade;
- mua skin;
- nạp thức ăn và truyền động lực;
- mở khóa gói meal plan.

Nói cách khác, giỏ cá là phần chuyển đổi giữa gameplay thu thập và hệ thống tài nguyên.

---

## 9. Bảng xếp hạng và hệ thống người chơi

Game tích hợp Firebase và hệ thống đăng nhập người dùng. Người chơi có thể:

- đăng nhập bằng hệ thống xác thực Firebase;
- đồng bộ tiến độ lên Cloud;
- cập nhật dữ liệu bảng xếp hạng theo cấp độ, XP, số lượng cá, skin đang mặc và giai đoạn mèo.

Bảng xếp hạng dựa trên:

- level;
- xp;
- rank tier;
- fish trong tài khoản;
- biggest fish kg (cá lớn nhất);
- skin và chất lượng mèo.

Điều này mang lại yếu tố cạnh tranh và tạo động lực cho người chơi tiếp tục cải thiện tiến độ.

---

## 10. Lưu dữ liệu và tiến độ

Game hỗ trợ:

- lưu dữ liệu cục bộ bằng local storage;
- đồng bộ lên Firestore;
- xuất save code;
- nhập save code;
- reset game khi cần bắt đầu lại;
- tính toán phần thưởng offline khi người chơi rời khỏi game.

Với tính năng offline reward, khi người chơi quay lại sau một khoảng thời gian, hệ thống sẽ tính toán số cá kiếm được trong thời gian đó và trao thưởng tương ứng. Đây là yếu tố cực kỳ quan trọng cho một game dạng idle/clicker.

---

## 11. Tính năng đồ họa và trải nghiệm người dùng

Game có nhiều yếu tố tương tác nhằm tăng cảm giác hài hước và thú vị:

- floating items khi click hoặc hoàn thành sự kiện;
- sparkle effect khi có combo hoặc crit;
- animation mèo hoạt động, nháy mắt và thay đổi biểu cảm;
- âm thanh và haptics để làm rõ thao tác;
- giao diện tuần tự theo từng view, từng phần mục tiêu rõ ràng;
- thiết kế chủ đạo là màu sắc ấm áp, dễ thương và phù hợp với hướng mèo + cá.

Điều này giúp game không chỉ là clicker thuần túy mà còn là trải nghiệm "nuôi thú cưng" có tính biểu cảm.

---

## 12. Vòng lặp chơi chính

Vòng lặp game cơ bản như sau:

1. Người chơi click vào mèo để kiếm cá.
2. Mèo ngày càng mạnh hơn nhờ upgrade và skin.
3. Người chơi cho mèo ăn uống để duy trì hiệu suất.
4. Hệ thống auto-fish bắt cá đều đặn.
5. Người chơi chuyển cá từ hồ sang giỏ cá.
6. Bán cá để đổi lấy tiền cho nâng cấp và mua vật phẩm.
7. Cấp độ tăng, thứ hạng cải thiện, skin và phòng mèo mở rộng.
8. Quá trình lặp lại để tối ưu hóa lợi ích và thử thách mới.

Đây là vòng lặp kinh điển của game idle + management + progression.

---

## 13. Công nghệ và kiến trúc triển khai

Game được xây dựng trên nền tảng:

- React + TypeScript
- Vite
- Firebase Authentication
- Firestore
- Local storage
- CSS module / custom stylesheet

Cấu trúc dự án tách rõ theo từng phần:

- App.tsx: điều phối màn hình game và navigation;
- hooks/useGameState.ts: quản lý trạng thái chính của game;
- data/: chứa upgrade, skin, cá, mức rank, gói thực phẩm;
- services/: cấu hình xác thực và lưu trữ đám mây;
- utils/: tính toán, save game, âm thanh, kinh tế;
- components/: giao diện người dùng và màn hình chính.

---

## 14. Nhận định tổng quát

Purr-Fish là một game kết hợp giữa clicker, quản lý mèo và nền kinh tế thu thập cá. Nó không chỉ tập trung vào việc "cày cá" mà còn tạo ra cảm giác nuôi thú cưng, chăm sóc và xây dựng nhân vật. Với hệ thống upgrade, skin, cơ chế combo, auto-fish, lưu trữ đám mây và bảng xếp hạng, game mang tính lặp lại cao nhưng vẫn có độ tiến hóa rõ ràng và khung chơi dài hạn.

Nếu nhìn theo hướng thiết kế, đây là một tựa game phù hợp với người chơi yêu thích:

- game idle nhẹ;
- game clicker phát triển theo cấp độ;
- quản lý tài nguyên và vật phẩm;
- chăm sóc thú cưng và phụ kiện cá nhân hóa.

---

## 15. Kết luận

Purr-Fish là một sản phẩm game có phong cách dễ thương, mang nhịp chơi đơn giản nhưng sâu và lâu dài. Trọng tâm của game nằm ở việc biến hành động nhỏ như click vào mèo hay giữ cho mèo no đủ thành một hệ thống tài nguyên lớn, tạo ra sự tiến bộ liên tục và hứng thú lâu dài cho người chơi.



🎣 TÀI LIỆU MÔ TẢ TÍNH NĂNG: BỂ CÁ SĂN MỒI (FISHING MINIGAME)1. Tổng Quan Tính NăngTên tính năng: Bể Cá Săn Mồi.Mục tiêu người chơi: Dùng xu mua/trang bị cần câu thích hợp, căn thời điểm thả dây câu chính xác để bắt các loại cá trong bể, thu thập cá/xu và tích lũy XP thăng cấp.Cơ chế chính (Core Loop): Chọn/Mua cần câu -> Căn góc thả dây -> Trúng cá / Mini-game kéo cá -> Thu hoạch cá & giảm độ bền cần câu.2. Giao Diện & Vị Trí Trận Đấu (UI/UX)Vị trí Mèo (Nhân vật chính):Mèo đứng cố định tại vị trí hình tròn đỏ ở giữa mép dưới bể cá.Cần câu xuất phát từ vị trí mèo, tự động xoay/lắc lư qua lại theo hình quạt (từ trái qua phải và ngược lại) với góc xoay khoảng -70° đến +70°.Khu vực Bể Cá (Dưới nước):Các loài cá di chuyển tự do ngang/dọc trong bể với nhiều kích thước và tốc độ khác nhau (Cá bé, Cá vừa, Cá lớn, Cá khủng).Mỗi con cá có nhãn hiển thị tên, độ khó và giá trị.Giao diện Thanh Công Cụ / Cửa Hàng (Shop Cần Câu):Nút "Cửa hàng Cần" cho phép mở Pop-up chọn hoặc mua cần câu mới bằng Xu (Gold).Hiển thị Thanh độ bền (Durability) hiện tại của cần câu đang trang bị (Ví dụ: 15/20 lượt câu).3. Cơ Chế Chơi (Gameplay Mechanics)A. Cửa Hàng & Hệ Thống Cần Câu (Rod Shop & Durability)Mua cần câu: Người chơi tích lũy Xu để mua các loại cần câu có chỉ số khác nhau:Cần Gỗ (Cơ bản): Giá rẻ, độ bền thấp (10 lượt), độ may mắn thấp.Cần Tre / Cần Sắt: Độ bền trung bình (20-30 lượt), tốc độ quăng nhanh hơn.Cần Vàng / Cần Cực Siêu: Giá cao, độ bền lớn (50+ lượt), hỗ trợ kéo cá khó dễ hơn.Độ hao mòn (Durability):Mỗi lần quăng dây (dù trúng hay hụt) đều làm giảm 1 điểm độ bền của cần câu.Khi độ bền về 0, cần câu bị gãy/hỏng hoàn toàn.Xử lý khi gãy: Xuất hiện hiệu ứng cần gãy, thông báo "Cần câu đã hỏng! Hãy mua cần mới" và tự động mở Cửa Hàng Cần Câu.B. Thao Tác Quăng Dây Câu (Aiming & Casting)Cần câu tại vị trí tròn đỏ tự động xoay qua lại với tốc độ vừa phải.Chạm/Nhấp màn hình: Khi góc xoay chĩa đúng hướng con cá mong muốn, người chơi chạm vào bất kỳ đâu trên màn hình.Dây câu/Lưỡi câu phóng thẳng ra theo góc đã chọn.Trường hợp Quăng Hụt: Lưỡi câu chạm vào thành bể hoặc không trúng con cá nào $\rightarrow$ Lưỡi câu tự động thu về vị trí ban đầu $\rightarrow$ Trừ 1 độ bền $\rightarrow$ Tiếp tục xoay cần.C. Cơ Chế Kéo Cá (Reeling & Difficulty)Khi lưỡi câu chạm trúng 1 con cá, game tạm dừng di chuyển của con cá đó và chuyển sang Mini-game Kéo Cá:Xuất hiện nút "KÉO" (PULL): Nút bấm to nổi bật xuất hiện trên màn hình.Phân loại độ khó theo loài cá:Cá Nhỏ / Chậm (Dễ): Nhấn giữ hoặc bấm nút "KÉO" 1-2 lần là kéo thành công lên giỏ.Cá Vừa / Nhanh (Trung bình): Xuất hiện thanh lực (Progress Bar). Người chơi phải nhấp nhanh tay để giữ thanh lực trong vùng an toàn trong 3 giây.Cá Lớn / Cực Khó (Cá Khổng Lồ/Siêu Nhanh): Cá vùng vẫy mạnh, người chơi phải nhấp nhịp nhàng (không được nhấp quá nhanh làm đứt dây, không quá chậm để cá trốn thoát).Kết quả:Thành công: Cá được đưa vào Giỏ cá $\rightarrow$ Nhận Xu + XP thăng cấp.Thất bại (Sảy cá): Cá bơi mất, dây câu thu về $\rightarrow$ Vẫn mất 1 độ bền cần.4. Luồng Trạng Thái Game (State Flow cho React)Plaintext[Chọn / Mua Cần Câu] 
       ↓
[Cần xoay tự động] ──(Click màn hình)──> [Quăng dây câu] (Trừ 1 Độ bền)
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
                [Trúng Cá]                                         [Hụt Cá]
                       │                                               │
         [Mini-game Kéo Cá (Nút KÉO)]                                   │
            ┌──────────┴──────────┐                                    │
            ▼                     ▼                                    │
     [Bắt thành công]     [Thất bại/Sảy]                               │
   (+Xu, +XP, +Cá vào giỏ)   (Cá thoát)                                │
            │                     │                                    │
            └─────────────────────┴────────────────────────────────────┘
                                   │
                        [Kiểm tra Độ Bền Cần]
                       ┌───────────┴───────────┐
                       ▼                       ▼
                 (Độ bền > 0)             (Độ bền = 0)
             [Tiếp tục lượt mới]     [Báo hỏng & Mở Shop]