import React, { useContext } from 'react'
import Item from '../Item/Item';
import './NewCollections.css'
import { ShopContext } from '../../Context/ShopContext';

const NewCollections = () => {
  const { all_product } = useContext(ShopContext);

  // Pick ~3 from each category so all 3 categories show on home page
  const pick = (cat, n) => all_product.filter(p => p.category === cat).slice(0, n);
  const newCollections = [...pick('women', 3), ...pick('men', 3), ...pick('kid', 2)];

  return (
    <div className='new-collections'>
      <h1>NEW COLLECTIONS</h1>
      <hr />
      <div className="collections">
        {newCollections.map((item, i) => {
          return <Item
            key={i}
            id={item.id}
            name={item.name}
            image={item.image}
            new_price={item.new_price}
            old_price={item.old_price}
          />
        })}
      </div>
    </div>
  )
}

export default NewCollections
