import {useEffect, useRef} from 'react';

function OrderModal(props) {

  const{
    modalState,
    onSubmitOrder,
    onClose
  }=props

  const inputRef = useRef(null)

  useEffect(()=>{
    if(modalState){
      inputRef.current?.focus()
    }

  }, [modalState])
  const handleSubmit = (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    const customerName = formData.get("customerName")

    if (!customerName.trim()) return

    onSubmitOrder(customerName)
    e.target.reset()
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
          
          <input
            className="modal__input"
            name="customerName"
            placeholder="Имя клиента"
            required
            ref={inputRef}
          />

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