import {Link} from 'react-router-dom';

function OrdersButton() { // ! кнопка перехода к списку заказов
    return (
        <Link to="/orders" className="orders-button">
            📋
        </Link>
           
    )
}

export default OrdersButton