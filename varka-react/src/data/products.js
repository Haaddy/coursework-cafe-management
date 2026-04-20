const products = [
    { 
        id: 1, name: "Капучино", category: "coffee",
        isVolumes: true,
        price: { "250": 10, "350": 12, "500": 15 }
    },
    { 
        id: 2, name: "Чизкейк", category: "dessert",
        isVolumes: false,
        price: 16  // без объёма — просто число
    },
    { 
        id: 3, name: "Мохито", category: "drink",
        isVolumes: true,
        price: { "250": 13, "350": 15, "500": 18 }
    },
]
export default products;