import {Routes, Route} from 'react-router-dom';
import OrdersPage from "./components/OrdersPage"
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import HomePage from "./components/HomePage"
import AdminMenuPage from "./components/admin/AdminMenuPage";
import AdminStatsPage from "./components/admin/AdminStatsPage";
import AdminInventoryPage from "./components/admin/AdminInventoryPage";
import AdminRecipesPage from "./components/admin/AdminRecipesPage";
import AdminEmployeesPage from "./components/admin/AdminEmployeesPage";






function App() {

  

  return (
    
    
    
    
    <Routes>
      <Route path="/" element={<HomePage/>}></Route>
      <Route path="/orders" element={<OrdersPage/>}></Route>
      <Route path="/admin" element={<AdminDashboardPage/>}></Route>
      <Route path="/admin/menu" element={<AdminMenuPage/>}></Route>
      <Route path="/admin/stats" element={<AdminStatsPage/>}></Route>
      <Route path="/admin/inventory" element={<AdminInventoryPage/>}></Route>
      <Route path="/admin/recipes" element={<AdminRecipesPage/>}></Route>
      <Route path="/admin/employees" element={<AdminEmployeesPage/>}></Route>
    </Routes>
    

    
  )
}

export default App
