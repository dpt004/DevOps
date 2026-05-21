export const dayOfWeekOptions = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 7, label: "Chủ nhật" },
];

export const dayLabels = Object.fromEntries(
  dayOfWeekOptions.map((item) => [item.value, item.label]),
);

export const subjectOptions = [
  "Phát triển ứng dụng Web",
  "Đảm bảo chất lượng phần mềm",
  "Kiến trúc và Thiết kế phần mềm",
  "Quản lý dự án phần mềm",
  "Trí tuệ nhân tạo",
  "Học máy",
  "An toàn bảo mật thông tin",
  "Hệ quản trị cơ sở dữ liệu",
  "Mạng máy tính",
  "Cấu trúc dữ liệu và Giải thuật",
  "Lập trình hướng đối tượng",
];

export const roomOptions = [
  "Phòng 101",
  "Phòng 102",
  "Phòng 201",
  "Phòng 202",
  "Phòng 301",
  "Phòng 302",
  "Phòng 401",
  "Phòng 402",
  "Phòng Thực hành 1",
  "Phòng Thực hành 2",
  "Hội trường A",
  "Hội trường B",
];
