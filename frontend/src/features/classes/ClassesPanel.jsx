export function ClassesPanel({
  classForm,
  classes,
  onDeleteClass,
  onSubmit,
  setClassForm,
}) {
  return (
    <section className="two-column">
      <form className="panel" onSubmit={onSubmit}>
        <h2>{classForm.id ? "Sửa lớp" : "Thêm lớp"}</h2>
        <input
          placeholder="Mã lớp"
          value={classForm.classCode}
          onChange={(event) =>
            setClassForm({ ...classForm, classCode: event.target.value })
          }
        />
        <input
          placeholder="Tên lớp"
          value={classForm.className}
          onChange={(event) =>
            setClassForm({ ...classForm, className: event.target.value })
          }
        />
        <div className="actions">
          {classForm.id && (
            <button
              className="secondary"
              onClick={() =>
                setClassForm({
                  id: null,
                  classCode: "",
                  className: "",
                })
              }
              type="button"
            >
              Hủy
            </button>
          )}
          <button type="submit">{classForm.id ? "Lưu sửa" : "Thêm"}</button>
        </div>
      </form>

      <section className="panel">
        <h2>Danh mục lớp</h2>
        <div className="class-list">
          {classes.map((item) => (
            <article className="class-item" key={item.id || item.classCode}>
              <div>
                <strong>{item.classCode}</strong>
                <span>{item.className}</span>
              </div>
              <div className="row-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    setClassForm({
                      id: item.id,
                      classCode: item.classCode,
                      className: item.className,
                    })
                  }
                  type="button"
                >
                  Sửa
                </button>
                <button
                  className="danger"
                  disabled={!item.id}
                  onClick={() => onDeleteClass(item.id)}
                  type="button"
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
