import Menu from "./Menu";
import Cart from "./Cart";
import OrderModal from "./OrderModal";
import OrdersButton from "./OrdersButton";
import { useState, useEffect } from "react"
import { API_BASE_URL } from "../constants/api";

function HomePage() {

const [cart, setCart] = useState([])
const [menu, setMenu] = useState([])
const [activeCategory, setActiveCategory] = useState(null)
const [modalState, setModalState] = useState(false)
const [orderError, setOrderError] = useState("")
   useEffect(() => {
    fetch(`${API_BASE_URL}/menu`)
    .then(res => res.json())
    .then(data => {
      console.log(data);
      
      setMenu(data)
    })
    .catch(err => console.error(err));
  }, []);


  const totalPrice = cart.reduce((acc, item) => acc + item.price,0)
  
  const addToCart =(product) =>{
    console.log(`add product `);
    
      setCart([...cart, product])


  }
  const removeFromCart=(uniqueKey) =>{
    console.log(`prod with id ${uniqueKey} is delete`);

    setCart(cart.filter((item,index)=>{
      const currentKey = `${item.id}-${item.volume}-${index}`;
      return currentKey != uniqueKey;
    }))
    
  }

  const onCategoryChange =(category) =>{
    console.log("category changed");
    setActiveCategory(category)
    
  }
  const isCartItemAvailable = (cartItem) => {
    const menuItem = menu.find((item) => String(item.id) === String(cartItem.id));
    if (!menuItem) {
      return true;
    }
    if (menuItem.isVolumes) {
      return menuItem.volumeAvailability?.[cartItem.volume] !== false;
    }
    return menuItem.available !== false;
  };

  const onClickSubmitOrderButton = () => {
    setOrderError("");
    setModalState(true);
  };

  const onSubmitOrder = async () => {
    const unavailableItem = cart.find((item) => !isCartItemAvailable(item));
    if (unavailableItem) {
      setOrderError(`«${unavailableItem.name}» недоступен — уберите его из корзины или выберите другой объём.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать заказ");
      }

      alert(`Заказ №${data.orderNumber || data.id} создан`);
      setCart([]);
      setOrderError("");
      setModalState(false);
    } catch (err) {
      setOrderError(err.message || "Ошибка создания заказа");
    }
  };

  const onClose = () => {
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
    



