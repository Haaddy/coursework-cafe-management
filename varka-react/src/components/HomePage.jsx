import Menu from "./Menu";
import Cart from "./Cart";
import OrderModal from "./OrderModal";
import OrdersButton from "./OrdersButton";
import { useState, useEffect } from "react"

function HomePage() {

const [cart, setCart] = useState([])
const [menu, setMenu] = useState([])
const [activeCategory, setActiveCategory] = useState(null)
const [modalState, setModalState] = useState(false)
   useEffect(() => {
    fetch("http://localhost:3001/menu")
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

 const onSubmitOrder = (orderName) => {
  const order = {
    name: orderName,
    cart: cart
  };

  fetch("http://localhost:3001/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order),
  })
    .then(res => res.json())
    .then(data => {
      console.log("order is add:", data);
      setCart([]);
      setModalState(false);
    })
    .catch(err => console.error(err));
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
    



