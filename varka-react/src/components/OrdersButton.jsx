import {Link} from 'react-router-dom';

function OrdersButton() {
    return (
        <Link to="/orders" className="orders-button">
            📋
        </Link>
           
    )
}

export default OrdersButton