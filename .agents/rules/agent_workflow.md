---
description: Quy trình làm việc bắt buộc dành cho AI Agent khi thao tác với dự án Crab Platform.
---

# Crab Platform - Agent Workflow Rule

Mỗi khi nhận được yêu cầu xử lý công việc trong dự án này, Agent **BẮT BUỘC** phải tuân thủ nghiêm ngặt quy định và quy trình sau đây:

## ⚠️ QUAN TRỌNG NHẤT: Ranh Giới Phát Triển (Scope Boundary)
- Bạn **CHỈ ĐƯỢC PHÉP** implement code, sửa code và thực thi các tính năng thuộc về phía **BACKEND** (hoặc config Infrastructure/Docker). 
- **TUYỆT ĐỐI KHÔNG** được sửa code hoặc implement bất kỳ tính năng nào thuộc về phía **FRONTEND** (ReactJS, UI, HTML/CSS).
- Nếu phát hiện ra lỗi (Bug), lỗ hổng, hoặc problem liên quan đến Frontend, Backend hay thiết kế hệ thống, **PHẢI LOG LẠI NGAY LẬP TỨC** vào file `BUG-TRACKING.md` nằm ở thư mục gốc.

---

## Bước 1: Nạp Ngữ Cảnh (Context Gathering)
Trước khi đưa ra bất kỳ quyết định kỹ thuật hay viết code nào, Agent **PHẢI DÙNG TOOL (`view_file`)** để đọc 2 file cốt lõi:
1. `PROJECT-DETAIL.md`: Để nắm bắt Tech Stack, kiến trúc tổng thể, và Core Features của hệ thống.
2. `backend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`: Để xác định dự án đang ở Phase nào, task nào đã làm xong `[x]`, task nào chưa làm `[ ]`, và implement chính xác sub-task tiếp theo.
*(Nếu xử lý các logic liên quan đến API, hãy đọc thêm `API-CONTRACT.md`)*.

## Bước 2: Thực thi Backend (Backend Implementation Only)
- Tiến hành implement tính năng cho Backend dựa theo task đang làm.
- Sử dụng các tool và skill phù hợp để cấu hình hệ thống đúng theo yêu cầu.
- Tuân thủ tuyệt đối các quy định về Clean Architecture, TypeORM (PostGIS) và State Machine tại `CLAUDE.md` và `backend/CLAUDE.md`.

## Bước 3: Cập nhật Trạng thái & Tài liệu (Post-Implementation Updates)
Ngay sau khi thao tác xong, Agent **BẮT BUỘC** thực hiện các bước cập nhật sau:
1. **Đánh dấu hoàn thành Task**: Đổi trạng thái từ `[ ]` sang `[x]` trong file `backend/DEVELOPMENT-TASK-BY-PHASES-TRACKING-LOGS.md`.
2. **Cập nhật API Schema**: Nếu tính năng vừa làm làm thay đổi cấu trúc dữ liệu REST API (Request/Response) hoặc Socket.io, cập nhật trực tiếp vào `API-CONTRACT.md` để Frontend có tài liệu đối chiếu.
3. **Log Bug (Nếu có)**: Nếu trong lúc dev phát hiện code Frontend sai, Backend thiếu case, mở file `BUG-TRACKING.md` ở root và thêm dòng mới vào bảng để ghi nhận.
