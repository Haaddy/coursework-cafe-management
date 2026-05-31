import Menu from "./Menu";
import Cart from "./Cart";
import OrderModal from "./OrderModal";
import OrdersButton from "./OrdersButton";
import { useState, useEffect } from "react"
import { API_BASE_URL } from "../constants/api";

function HomePage() { // ! главная страница — меню и корзина

const [cart, setCart] = useState([]) // ! корзина
const [menu, setMenu] = useState([]) // ! меню
const [activeCategory, setActiveCategory] = useState(null) // ! активная категория
const [modalState, setModalState] = useState(false) // ! состояние модального окна
const [orderError, setOrderError] = useState("") // ! ошибка заказа
   useEffect(() => { // ! эффект
    fetch(`${API_BASE_URL}/menu`)
    .then(res => res.json()) // ! получение данных
    .then(data => { // ! обработка данных
      console.log(data); // ! вывод данных в консоль
      
      setMenu(data) // ! установка меню
    })
    .catch(err => console.error(err)); // ! обработка ошибки
  }, []); // ! зависимость


  const totalPrice = cart.reduce((acc, item) => acc + item.price,0) // ! общая цена
  
  const addToCart =(product) =>{ // ! добавление товара в корзину
    console.log(`add product `); 
    
      setCart([...cart, product])


  }
  const removeFromCart=(uniqueKey) =>{ // ! удаление товара из корзины
    console.log(`prod with id ${uniqueKey} is delete`);

    setCart(cart.filter((item,index)=>{
      const currentKey = `${item.id}-${item.volume}-${index}`;
      return currentKey != uniqueKey;
    }))
    
  }

  const onCategoryChange =(category) =>{ // ! изменение категории
    console.log("category changed");
    setActiveCategory(category)
    
  }
  const isCartItemAvailable = (cartItem) => { // ! проверка доступности товара
    const menuItem = menu.find((item) => String(item.id) === String(cartItem.id));
    if (!menuItem) { // ! если товар не найден
      return true; // ! возвращаем true
    }
    if (menuItem.isVolumes) { // ! если товар имеет объемы
      return menuItem.volumeAvailability?.[cartItem.volume] !== false; // ! возвращаем true
    }
    return menuItem.available !== false; // ! возвращаем true
  };

  const onClickSubmitOrderButton = () => { // ! клик на кнопку оформления заказа
    setOrderError("");
    setModalState(true);
  };

  const onSubmitOrder = () => { // ! оформление заказа
    const unavailableItem = cart.find((item) => !isCartItemAvailable(item)); // ! поиск недоступного товара
    if (unavailableItem) { // ! если недоступный товар найден
      setOrderError(`«${unavailableItem.name}» недоступен — уберите его из корзины или выберите другой объём.`);
      return; // ! возвращаем false
    }

    fetch(`${API_BASE_URL}/orders`, { // ! запрос к API
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cart }),
    })
      .then((res) =>
        res.json().catch(() => ({})).then((data) => {
          if (!res.ok) {
            throw new Error(data.error || "Не удалось создать заказ");
          }
          return data;
        })
      )
      .then((data) => {
        alert(`Заказ №${data.orderNumber || data.id} создан`);
        setCart([]); // ! очистка корзины
        setOrderError(""); // ! очистка ошибки
        setModalState(false); // ! закрытие модального окна
      })
      .catch((err) => {
        setOrderError(err.message || "Ошибка создания заказа");
      });
  };

  const onClose = () => { // ! закрытие модального окна
    setOrderError("");
    setModalState(false);
  };

    return (<div className="app">
        <div className="app__container">
          <Menu 
          activeCategory={activeCategory}
          addToCart={addToCart}
          onCategoryChange={onCategoryChange}
          menu={menu}
          />
  
          <Cart 
          cart={cart}
          totalPrice={totalPrice}
          removeFromCart ={removeFromCart}
          onClickSubmitOrderButton ={onClickSubmitOrderButton}
          />
        </div>
  
        
        <OrdersButton />
  
        
        <OrderModal
          modalState={modalState}
          onSubmitOrder={onSubmitOrder}
          onClose={onClose}
          orderError={orderError}
        />
      </div>)
}

export default HomePage
    



