import React, { useContext } from 'react';
import Item from '../Item/Item';
import './Popular.css';
import { usePopular } from '../../hooks/usePopular';
import { ShopContext } from '../../Context/ShopContext';

const Popular = () => {
  const { all_product } = useContext(ShopContext);

  // Use products already loaded (with resolved images) from ShopContext
  // Pick 4 from each category for a balanced display
  const pick = (cat, n) => all_product.filter(p => p.category === cat).slice(0, n);
  const products = [...pick('women', 4), ...pick('men', 4), ...pick('kid', 4)];

  // Fallback: fetch from API hook if ShopContext hasn't loaded yet
  const { products: apiProducts, loading, error } = usePopular(12);
  const displayProducts = products.length > 0 ? products : apiProducts;

  if (loading && displayProducts.length === 0) {
    return (
      <div className="popular">
        <h1>POPULAR PRODUCTS</h1>
        <hr />
        <div className="popular-item"><p>Loading popular products...</p></div>
      </div>
    );
  }

  if (error && displayProducts.length === 0) {
    return (
      <div className="popular">
        <h1>POPULAR PRODUCTS</h1>
        <hr />
        <div className="popular-item"><p>Error loading products: {error}</p></div>
      </div>
    );
  }

  return (
    <div className="popular">
      <h1>POPULAR PRODUCTS</h1>
      <hr />
      <div className="popular-item">
        {displayProducts.map((item, i) => (
          <Item
            key={i}
            id={item.id}
            name={item.name}
            image={item.image}
            new_price={item.new_price}
            old_price={item.old_price}
          />
        ))}
      </div>
    </div>
  );
};

export default Popular;
