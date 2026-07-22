import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth } from "date-fns";

export default function FinancialStats({ transactions, isLoading }) {
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const calculateStats = () => {
    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    const income = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    return { income, expenses, balance, totalTransactions: thisMonthTransactions.length };
  };

  const stats = calculateStats();

  const StatCard = ({ title, value, icon: Icon, color, isLoading }) => (
    <Card className="relative overflow-hidden dark:bg-gray-900 dark:border-gray-700">
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${color} rounded-full opacity-10`} />
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                R$ {value.toFixed(2)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
              <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Receitas Este Mês"
        value={stats.income}
        icon={TrendingUp}
        color="bg-green-500"
        isLoading={isLoading}
      />
      <StatCard
        title="Despesas Este Mês"
        value={stats.expenses}
        icon={TrendingDown}
        color="bg-red-500"
        isLoading={isLoading}
      />
      <StatCard
        title="Saldo do Mês"
        value={stats.balance}
        icon={Wallet}
        color={stats.balance >= 0 ? "bg-blue-500" : "bg-red-500"}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Transações"
        value={stats.totalTransactions}
        icon={DollarSign}
        color="bg-purple-500"
        isLoading={isLoading}
      />
    </div>
  );
}