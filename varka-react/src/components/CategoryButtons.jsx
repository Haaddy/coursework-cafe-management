function CategoryButtons(props) { // ! кнопки фильтра категорий меню

    const {
        onCategoryChange, // ! смена категории
        activeCategory, // ! активная категория
    }=props

    return (
        <div className="menu__categories">
            <button className={`button ${activeCategory === null ? "button--active" : "button--secondary"} `}
                data-category="all" 
                onClick={()=>onCategoryChange(null)}
            >Все</button>
            <button className={`button ${activeCategory === "coffee" ? "button--active" : "button--secondary"} `}
                data-category="coffee" 
                onClick={()=>onCategoryChange("coffee")}
            >Кофе</button>
            <button className={`button ${activeCategory === "dessert" ? "button--active" : "button--secondary"} `}
                data-category="dessert" 
                onClick={()=>onCategoryChange("dessert")}
            >Десерты</button>
            <button className={`button ${activeCategory === "drink" ? "button--active" : "button--secondary"} `} 
                data-category="drink" 
                onClick={()=>onCategoryChange("drink")}
            >Напитки</button>
        </div>
    );
}

export default CategoryButtons;