import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  X, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getNotificationIcon = (type) => {
  switch (type) {
    case 'payment_pending':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'payment_confirmed':
      return <DollarSign className="w-5 h-5 text-green-500" />;
    case 'appointment_confirmed':
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    case 'appointment_cancelled':
      return <X className="w-5 h-5 text-red-500" />;
    case 'new_appointment':
      return <Calendar className="w-5 h-5 text-purple-500" />;
    case 'system_alert':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const getNotificationColor = (type, priority) => {
  if (priority === 'urgent') return 'border-red-500 bg-red-50';
  if (priority === 'high') return 'border-orange-500 bg-orange-50';
  
  switch (type) {
    case 'payment_pending': return 'border-yellow-500 bg-yellow-50';
    case 'payment_confirmed': return 'border-green-500 bg-green-50';
    case 'appointment_confirmed': return 'border-blue-500 bg-blue-50';
    case 'appointment_cancelled': return 'border-red-500 bg-red-50';
    case 'new_appointment': return 'border-purple-500 bg-purple-50';
    default: return 'border-gray-300 bg-white';
  }
};

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotifications();
    
    // Verificar novas notificações a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      // Try to dynamically import the Notification entity
      const { Notification } = await import("@/entities/all");
      
      if (Notification) {
        const data = await Notification.filter({ status: 'unread' }, '-created_date', 10);
        setNotifications(data || []);
        setError(null);
      } else {
        console.warn("Notification entity not available");
        setNotifications([]);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setError(error.message);
      setNotifications([]);
    }
    setIsLoading(false);
  };

  const dismissNotification = async (notificationId) => {
    try {
      const { Notification } = await import("@/entities/all");
      await Notification.update(notificationId, { status: 'dismissed' });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Erro ao dispensar notificação:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { Notification } = await import("@/entities/all");
      await Notification.update(notificationId, { status: 'read' });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const handleConfirmPayment = async (notification) => {
    try {
      if (notification.financial_record_id) {
        const { confirmPayment } = await import("@/functions/confirmPayment");
        
        const response = await confirmPayment({
          transactionId: notification.financial_record_id,
          paymentMethod: 'confirmed',
          notes: 'Pagamento confirmado via notificação'
        });

        if (response.data.success) {
          // Remove a notificação da lista
          await dismissNotification(notification.id);
          
          // Recarregar página para atualizar dados
          window.location.reload();
        } else {
          alert('Erro ao confirmar pagamento: ' + response.data.message);
        }
      }
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      alert('Erro ao confirmar pagamento');
    }
  };

  // Don't render anything if there's an error, loading, or no notifications
  if (error || isLoading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm ${getNotificationColor(notification.type, notification.priority)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {notification.title}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                    {notification.message}
                  </p>
                  
                  {/* Botões de ação para notificações de pagamento */}
                  {notification.type === 'payment_pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        onClick={() => handleConfirmPayment(notification)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Confirmar Pagamento
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => dismissNotification(notification.id)}
                      >
                        Dispensar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {format(new Date(notification.created_date), 'HH:mm', { locale: ptBR })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}