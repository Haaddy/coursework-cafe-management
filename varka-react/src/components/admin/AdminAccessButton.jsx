function AdminAccessButton({ onClick }) {
  return (
    <button
      type="button"
      className="button button--accent admin-access-button"
      onClick={onClick}
    >
      Admin
    </button>
  );
}

export default AdminAccessButton;
