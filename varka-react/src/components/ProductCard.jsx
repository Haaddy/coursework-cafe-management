import { useEffect, useMemo, useState } from "react";

const VOLUME_OPTIONS = ["250", "350", "500"];

function ProductCard(props) {
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

    const [selectedVolume, setSelectedVolume] = useState(isVolumes ? "250" : null);

    const isVolumeAvailable = (volume) => volumeAvailability?.[volume] !== false;

    const currentVolumeAvailable = isVolumes
        ? isVolumeAvailable(selectedVolume)
        : available !== false;

    const currentStockMessage = useMemo(() => {
        if (currentVolumeAvailable) {
            return null;
        }
        if (isVolumes) {
            return "Для выбранного объёма закончились ингредиенты";
        }
        return stockMessage || "Товар временно недоступен";
    }, [currentVolumeAvailable, isVolumes, stockMessage]);

    useEffect(() => {
        if (!isVolumes || !volumeAvailability) {
            return;
        }
        if (isVolumeAvailable(selectedVolume)) {
            return;
        }
        const firstAvailable = VOLUME_OPTIONS.find((volume) => isVolumeAvailable(volume));
        if (firstAvailable) {
            setSelectedVolume(firstAvailable);
        }
    }, [isVolumes, volumeAvailability, selectedVolume]);

    const currentPrise = isVolumes ? price[selectedVolume] : price;

    const onAddClick = () => {
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

    const renderVolumeOption = (volume) => {
        const volumeAvailable = isVolumeAvailable(volume);
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
