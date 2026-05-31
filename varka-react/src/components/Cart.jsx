function Cart(props) { // ! корзина текущего заказа
  const { 
    cart, // ! позиции в корзине
    removeFromCart, // ! удаление позиции
    onClickSubmitOrderButton, // ! открытие оформления заказа
    totalPrice, // ! итоговая сумма
   } = props;


   
  return(
    <section className="cart">
      <h2 className="cart__title">Текущий заказ</h2>

      <div className="cart__items">
        {cart.length === 0 ? (
          <div className="cart__empty">Корзина пуста</div>
        ) : (
          cart.map((item, index) => {
            const key = `${item.id}-${item.volume}-${index}`;
            return (
            <div key={key} className="cart-item">
              <div className="cart-item__info">
                <div className="cart-item__name">{item.name}</div>
                {item.volume && (
                  <div className="cart-item__volume">{item.volume} мл</div>
                )}
                <div className="cart-item__price">{item.price} BYN</div>
              </div>
              <button className="cart-item__remove" onClick={() => removeFromCart(key)}>
                🗑️ Убрать
              </button>
            </div>
          )})
        )}
      </div>

      <div className="cart__footer">
        <div className="cart__total">Итого: {totalPrice} BYN</div>
        <button className="button button--accent" onClick={onClickSubmitOrderButton}>
          Оформить заказ
        </button>
      </div>
    </section>

    
   
  )
  
}

export default Cart;