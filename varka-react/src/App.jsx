import {Routes, Route} from 'react-router-dom';
import OrdersPage from "./components/OrdersPage"
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import HomePage from "./components/HomePage"
import AdminMenuPage from "./components/admin/AdminMenuPage";






function App() {

  

  return (
    
    
    
    
    <Routes>
      <Route path="/" element={<HomePage/>}></Route>
      <Route path="/orders" element={<OrdersPage/>}></Route>
      <Route path="/admin" element={<AdminDashboardPage/>}></Route>
      <Route path="/admin/menu" element={<AdminMenuPage/>}></Route>
    </Routes>
    

    
  )
}

export default App
