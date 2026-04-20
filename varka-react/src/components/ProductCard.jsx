import { useState } from "react";

function ProductCard(props) {
    const { 
        id,
        name,
        price,
        isVolumes,
        onAdd,
        
        
    } = props;

    const [selectedVolume, setSelectedVolume] = useState(isVolumes ? "250" : null)

    const currentPrise = isVolumes ? price[selectedVolume] : price
   const onAddClick = () =>{
    onAdd(
        {
            id,
            name, 
            price: currentPrise,
            volume : selectedVolume,
            
        }
    );
   }

    

    return (
        <div className="card product-card">
              <div>
                <div className="product-card__title">{name}</div>
                <div className="product-card__price">{`${currentPrise} BYN`}</div>
                {isVolumes &&
              <> 
                    <div className="product-card__volume-label">Объём</div>
                    <div className="product-card__volume">
                        <label className="product-card__volume-option">
                            <input
                                type="radio"
                                name={`volume-${id}`}
                                value="250"
                                checked = {selectedVolume == "250"}
                                onChange={({target})=> setSelectedVolume(target.value)}
                                
                            />
                            <span>250 мл</span>
                        </label>
                        <label className="product-card__volume-option">
                            <input
                                type="radio"
                                name={`volume-${id}`}
                                value="350"
                                checked = {selectedVolume == "350"}
                                onChange={({target})=> setSelectedVolume(target.value)}
                            />
                            <span>350 мл</span>
                        </label>
                        <label className="product-card__volume-option">
                            <input
                                type="radio"
                                name={`volume-${id}`}
                                value="500"
                                checked = {selectedVolume == "500"}
                                onChange={({target})=> setSelectedVolume(target.value)}
                            />
                            <span>500 мл</span>
                        </label>
                    </div>
                </>
                }

              </div>
              
              <button className="button button--primary" onClick={onAddClick}>
                +
              </button>
         </div>
    )

         
    
}

export default ProductCard;
