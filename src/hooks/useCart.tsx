import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => { prevCartRef.current = cart });

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productExists = cart.find(product => product.id === productId)

      const stock = await api.get(`stock/${productId}`).then(response => response.data)

      const stockAmount = stock.amount
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productExists) {
        productExists.amount = amount
      } else {
        const product = await api.get(`products/${productId}`).then(response => response.data)

        const newProduct = { ...product, amount }

        updatedCart.push(newProduct)
      }

      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = cart.findIndex(product => product.id === productId)

      if (productIndex === -1) throw new Error()

      updatedCart.splice(productIndex, 1)

      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const stock = await api.get(`stock/${productId}`).then(response => response.data)

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)

      if (!productExists) throw new Error()

      productExists.amount = amount

      setCart(updatedCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
