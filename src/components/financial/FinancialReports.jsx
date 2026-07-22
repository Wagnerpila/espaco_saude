import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export default function FinancialReports({ transactions, isLoading }) {
  const generateMonthlyData = () => {
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        monthlyData[month].income += transaction.amount;
      } else {
        monthlyData[month].expenses += transaction.amount;
      }
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  };

  const monthlyData = generateMonthlyData();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Receitas vs Despesas (Últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    `R$ ${value.toFixed(2)}`,
                    name === 'income' ? 'Receitas' : 'Despesas'
                  ]}
                />
                <Bar 
                  dataKey="income" 
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="expenses" 
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}