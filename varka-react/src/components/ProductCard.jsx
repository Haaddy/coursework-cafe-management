import { useEffect, useMemo, useState } from "react";

const VOLUME_OPTIONS = ["250", "350", "500"];

function ProductCard(props) { // ! карточка товара в меню
    const {
        id,
        name,
        price,
        isVolumes,
        available = true,
        volumeAvailability = null,
        stockMessage = null,
        onAdd,
    } = props;

    const [selectedVolume, setSelectedVolume] = useState(isVolumes ? "250" : null); // ! выбранный объем

    const isVolumeAvailable = (volume) => volumeAvailability?.[volume] !== false; // ! проверка доступности объема

    const currentVolumeAvailable = isVolumes // ! проверка доступности объема
        ? isVolumeAvailable(selectedVolume)
        : available !== false;

    const currentStockMessage = useMemo(() => { // ! сообщение о недоступности товара
        if (currentVolumeAvailable) { // ! если объем доступен
            return null;
        }
        if (isVolumes) { // ! если объем доступен
            return "Для выбранного объёма закончились ингредиенты";
        }
        return stockMessage || "Товар временно недоступен"; // ! сообщение о недостаточности ингредиентов
    }, [currentVolumeAvailable, isVolumes, stockMessage]);

    useEffect(() => { // ! эффект
        if (!isVolumes || !volumeAvailability) { // ! если объем не доступен
            return;
        }
        if (isVolumeAvailable(selectedVolume)) { // ! если объем доступен
            return;
        }
        const firstAvailable = VOLUME_OPTIONS.find((volume) => isVolumeAvailable(volume)); // ! поиск первого доступного объема
        if (firstAvailable) {
            setSelectedVolume(firstAvailable); // ! установка выбранного объема
        }
    }, [isVolumes, volumeAvailability, selectedVolume]);

    const currentPrise = isVolumes ? price[selectedVolume] : price; // ! текущая цена

    const onAddClick = () => { // ! клик на кнопку добавления в корзину
        if (!currentVolumeAvailable) {
            return;
        }
        onAdd({
            id,
            name,
            price: currentPrise,
            volume: selectedVolume,
        });
    };

    const renderVolumeOption = (volume) => { // ! рендер объема
        const volumeAvailable = isVolumeAvailable(volume); // ! проверка доступности объема
        return (
            <label
                key={volume}
                className={`product-card__volume-option${volumeAvailable ? "" : " product-card__volume-option--unavailable"}`}
            >
                <input
                    type="radio"
                    name={`volume-${id}`}
                    value={volume}
                    checked={selectedVolume === volume}
                    disabled={!volumeAvailable}
                    onChange={({ target }) => setSelectedVolume(target.value)}
                />
                <span>{volume} мл</span>
            </label>
        );
    };

    return (
        <div className={`card product-card${currentVolumeAvailable ? "" : " product-card--unavailable"}`}>
            <div>
                <div className="product-card__title">{name}</div>
                <div className="product-card__price">{`${currentPrise} BYN`}</div>
                {currentStockMessage ? (
                    <p className="product-card__stock-warning" role="status">
                        {currentStockMessage}
                    </p>
                ) : null}
                {isVolumes ? (
                    <>
                        <div className="product-card__volume-label">Объём</div>
                        <div className="product-card__volume">
                            {VOLUME_OPTIONS.filter((volume) => price[volume] != null).map(renderVolumeOption)}
                        </div>
                    </>
                ) : null}
            </div>

            <button
                className="button button--primary"
                onClick={onAddClick}
                disabled={!currentVolumeAvailable}
                aria-disabled={!currentVolumeAvailable}
                title={currentStockMessage || undefined}
            >
                +
            </button>
        </div>
    );

         
    
}

export default ProductCard;
