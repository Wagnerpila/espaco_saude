import { useCallback, useEffect, useState } from "react";
import { listBillingConfirmations } from "@/functions/billingConfirmations";

// Cobranças vencidas (avulsas ou de plano) que já passaram 1 dia do
// vencimento e ainda não foram confirmadas pelo admin hoje — ver
// server/src/services/billingConfirmation.js. Usado tanto pelo badge do menu
// quanto pelo pop-up de confirmação no Financeiro.
export function usePendingBillingConfirmations(enabled = true) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await listBillingConfirmations();
      setItems(res.data?.items || []);
    } catch (e) {
      console.error("Erro ao buscar cobranças pendentes de confirmação:", e);
    }
    setIsLoading(false);
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch]);

  return { items, count: items.length, isLoading, refetch };
}
