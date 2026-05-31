function OrderModal(props) { // ! модальное окно подтверждения заказа

  const {
    modalState, // ! открыто ли окно
    onSubmitOrder, // ! отправка заказа
    onClose, // ! закрытие окна
    orderError = "", // ! текст ошибки
  } = props;

  const handleSubmit = (e) => { // ! обработка формы
    e.preventDefault()
    onSubmitOrder()
  }

  return (
    <div className={`modal ${modalState ? "modal--active" : ""}`}>
      
      <div className="modal__overlay" onClick={onClose} />

      <div
        className="modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal__title">Оформление заказа</h3>

        <form className="modal__form" onSubmit={handleSubmit}>
          <p className="order-details__hint">
            После создания заказа будет показан номер заказа.
          </p>

          {orderError ? (
            <p className="order-details__error" role="alert">
              {orderError}
            </p>
          ) : null}

          <button
            className="button button--accent modal__submit"
            type="submit"
          >
            Подтвердить
          </button>

        </form>
      </div>
    </div>
  )
}

export default OrderModal