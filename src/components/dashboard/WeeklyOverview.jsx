import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_LABELS = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

export default function WeeklyOverview({ appointments = [], isLoading }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // segunda
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekData = weekDays.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayOfWeek = day.getDay();
    const count = appointments.filter(
      (apt) =>
        apt.appointment_date === dateStr &&
        (apt.status === "confirmed" || apt.status === "completed")
    ).length;

    return { day: DAY_LABELS[dayOfWeek], appointments: count };
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Visão Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                fontSize={12}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value) => [value, "Atendimentos"]}
              />
              <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}