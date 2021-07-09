import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`products/${productId}`);

      const productFormatted = {
        ...product.data,
        amount: 1,
      };

      const passed = cart.some((product) => product.id === productId);

      if (!passed) {
        setCart([...cart, productFormatted]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, productFormatted])
        );
      } else {
        const stock = await api.get(`stock/${productId}`);

        const cartFiltered = cart.filter((product) => product.id !== productId);
        let productAmount = cart.filter((product) => product.id === productId);

        productAmount[0] = {
          ...productAmount[0],
          amount: productAmount[0].amount + 1,
        };

        cartFiltered.push(productAmount[0]);

        if (stock.data?.amount >= productAmount[0].amount) {
          setCart(cartFiltered);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(cartFiltered)
          );
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartFiltered = cart.filter((product) => product.id !== productId);
      const passed = cart.find((product) => product.id === productId);
      if (passed) {
        setCart(cartFiltered);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartFiltered));
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await api.get(`stock/${productId}`);

      const cartFiltered = cart.filter((product) => product.id !== productId);
      let productAmount = cart.filter((product) => product.id === productId);

      if (amount < 1) {
        return;
      }
      productAmount[0] = {
        ...productAmount[0],
        amount: amount,
      };

      cartFiltered.push(productAmount[0]);

      if (stock.data?.amount >= productAmount[0].amount) {
        setCart(cartFiltered);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartFiltered));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
