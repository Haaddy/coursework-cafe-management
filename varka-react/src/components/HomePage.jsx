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
  const onClickSubmitOrderButton = () =>{
    console.log("модалкаоткрта");
    setModalState(true)
    
  }

 const onSubmitOrder = () => {
  const order = {
    cart: cart
  };

  fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Не удалось создать заказ");
      }
      return res.json();
    })
    .then(data => {
      console.log("order is add:", data);
      alert(`Заказ №${data.orderNumber || data.id} создан`);
      setCart([]);
      setModalState(false);
    })
    .catch(err => alert(err.message || "Ошибка создания заказа"));
};

  const onClose =() =>{
    console.log("modal are close");
    setModalState(false)
    
  }

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
          modalState= {modalState}
          onSubmitOrder={onSubmitOrder}
          onClose={onClose}
        />
      </div>)
}

export default HomePage
    



