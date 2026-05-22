import {Routes, Route} from 'react-router-dom';
import OrdersPage from "./components/OrdersPage"
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import HomePage from "./components/HomePage"
import AdminMenuPage from "./components/admin/AdminMenuPage";
import AdminStatsPage from "./components/admin/AdminStatsPage";
import AdminInventoryPage from "./components/admin/AdminInventoryPage";
import AdminRecipesPage from "./components/admin/AdminRecipesPage";
import AdminEmployeesPage from "./components/admin/AdminEmployeesPage";
import AdminLoginPage from "./components/admin/AdminLoginPage";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";






function App() {

  

  return (
    
    
    
    
    <Routes>
      <Route path="/" element={<HomePage/>}></Route>
      <Route path="/orders" element={<OrdersPage/>}></Route>
      <Route path="/admin/login" element={<AdminLoginPage/>}></Route>
      <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboardPage/></ProtectedAdminRoute>}></Route>
      <Route path="/admin/menu" element={<ProtectedAdminRoute><AdminMenuPage/></ProtectedAdminRoute>}></Route>
      <Route path="/admin/stats" element={<ProtectedAdminRoute><AdminStatsPage/></ProtectedAdminRoute>}></Route>
      <Route path="/admin/inventory" element={<ProtectedAdminRoute><AdminInventoryPage/></ProtectedAdminRoute>}></Route>
      <Route path="/admin/recipes" element={<ProtectedAdminRoute><AdminRecipesPage/></ProtectedAdminRoute>}></Route>
      <Route path="/admin/employees" element={<ProtectedAdminRoute><AdminEmployeesPage/></ProtectedAdminRoute>}></Route>
    </Routes>
    

    
  )
}

export default App
