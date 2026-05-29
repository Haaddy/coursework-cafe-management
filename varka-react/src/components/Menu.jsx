import CategoryButtons from "./CategoryButtons";
import ProductCard from "./ProductCard";


function Menu(props)  {

    const {
        addToCart,
        activeCategory,
        onCategoryChange,
        menu,
    } =props

    const fillteredCategory = activeCategory 
    ?menu.filter((product )=> product.category === activeCategory) 
    : menu

    return (
         <section className="menu">
          <div className="menu__header">
            <h2 className="menu__title">Меню</h2>
          </div>

           <CategoryButtons 
            onCategoryChange={onCategoryChange}
            activeCategory={activeCategory}
           />

          <div className="menu__list" id="menuList">
           
           {fillteredCategory.map((product) => (
            <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                isVolumes={product.isVolumes}
                available={product.available}
                volumeAvailability={product.volumeAvailability}
                stockMessage={product.stockMessage}
                onAdd={addToCart}
            />
           ))}

            

          </div>
        </section>
    );
}

export default Menu;

