import CategoryButtons from "./CategoryButtons";
import ProductCard from "./ProductCard";


function Menu(props)  { // ! блок меню с фильтром категорий

    const {
        addToCart, // ! добавление в корзину
        activeCategory, // ! активная категория
        onCategoryChange, // ! смена категории
        menu, // ! список позиций меню
    } =props

    const fillteredCategory = activeCategory  // ! фильтрация категорий
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

