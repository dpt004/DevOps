export function classLabel(item) {
  if (!item) {
    return "";
  }

  return item.classCode === item.className
    ? item.classCode
    : `${item.classCode} - ${item.className}`;
}

export function ClassSelect({ classes, label = "Lớp", onChange, value }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Chọn lớp</option>
        {classes.map((item) => (
          <option key={item.classCode} value={item.classCode}>
            {classLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
