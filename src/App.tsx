import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { showSuccess } from '@/utils/toast';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentDetailsPage from './pages/IncidentDetailsPage';
import NotFound from "./pages/NotFound";

// Import custom hooks
import { useAuth } from './hooks/use-auth';
import { useIncidents } from './hooks/use-incidents';
import { useVisitors } from './hooks/use-visitors';
import { useBiomedicalEquipment } from './hooks/use-biomedical-equipment';
import { useNotifications } from './hooks/use-notifications';
import { useBookings } from './hooks/use-bookings';
import { usePlannedTasks } from './hooks/use-planned-tasks';
import { useUserManagement } from './hooks/use-user-management';

const queryClient = new QueryClient();

const App = () => {
  // Global states managed by App.tsx and passed to hooks
  const { currentUser, users, setUsers, handleLogin, handleLogout, setCurrentUser, updatePassword, fetchAllProfiles } = useAuth({ initialUsers: {} }); // Initial users will be fetched from DB
  const { notifications, addNotification, markNotificationsAsRead, markNotificationAsRead, deleteAllNotifications, setNotifications } = useNotifications();

  // Other hooks
  const { incidents, setIncidents, addIncident, updateIncidentStatus, deleteIncident, addInterventionReport, assignTicket, unassignTicket, planIntervention, updatePrestataire } = useIncidents({ currentUser, users, addNotification });
  const { visitors, setVisitors, addVisitor, signOutVisitor, deleteVisitor } = useVisitors({ currentUser });
  const { biomedicalEquipment, setBiomedicalEquipment, maintenanceTasks, setMaintenanceTasks, addBiomedicalEquipment, updateBiomedicalEquipmentStatus, scheduleMaintenanceTask, updateMaintenanceTaskStatus } = useBiomedicalEquipment({ addNotification });
  const { rooms, setRooms, bookings, setBookings, doctors, setDoctors, addBooking, updateBooking, deleteBooking, expiringBookingIds, preExpiringBookingIds, startBooking, endBooking } = useBookings({ currentUser, users, addNotification });
  const { plannedTasks, setPlannedTasks, addPlannedTask, updatePlannedTaskStatus, deletePlannedTask } = usePlannedTasks({ currentUser, users, addNotification });
  const { addUser, deleteUser, updateUserPermissions } = useUserManagement({ setUsers, fetchAllProfiles }); // Pass fetchAllProfiles

  const handleResetData = async () => {
    // This function will need to be updated to clear data from Supabase
    // For now, it will only clear local state, which will be overwritten by DB fetches
    setIncidents([]);
    setVisitors([]);
    setBiomedicalEquipment([]);
    setMaintenanceTasks([]);
    setBookings([]);
    setNotifications([]);
    setPlannedTasks([]);
    setUsers({});
    setRooms([]);
    setDoctors([]);
    setCurrentUser(null);
    showSuccess("Toutes les données de l'application ont été réinitialisées (localement).");
    // In a real scenario, this would involve calling Supabase functions to truncate tables.
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {currentUser ? (
              <>
                <Route 
                  path="/" 
                  element={
                    <DashboardPage
                      user={currentUser.details}
                      username={currentUser.username}
                      onLogout={handleLogout}
                      onResetData={handleResetData}
                      incidents={incidents}
                      addIncident={addIncident}
                      updateIncidentStatus={updateIncidentStatus}
                      deleteIncident={deleteIncident}
                      addInterventionReport={addInterventionReport}
                      assignTicket={assignTicket}
                      unassignTicket={unassignTicket}
                      planIntervention={planIntervention}
                      updatePrestataire={updatePrestataire}
                      visitors={visitors}
                      addVisitor={addVisitor}
                      signOutVisitor={signOutVisitor}
                      deleteVisitor={deleteVisitor}
                      biomedicalEquipment={biomedicalEquipment}
                      addBiomedicalEquipment={addBiomedicalEquipment}
                      updateBiomedicalEquipmentStatus={updateBiomedicalEquipmentStatus}
                      maintenanceTasks={maintenanceTasks}
                      scheduleMaintenanceTask={scheduleMaintenanceTask}
                      updateMaintenanceTaskStatus={updateMaintenanceTaskStatus}
                      notifications={notifications}
                      markNotificationsAsRead={markNotificationsAsRead}
                      markNotificationAsRead={markNotificationAsRead}
                      deleteAllNotifications={deleteAllNotifications}
                      users={users}
                      addUser={addUser}
                      deleteUser={deleteUser}
                      updateUserPermissions={updateUserPermissions}
                      rooms={rooms}
                      bookings={bookings}
                      addBooking={addBooking}
                      updateBooking={updateBooking}
                      deleteBooking={deleteBooking}
                      doctors={doctors}
                      plannedTasks={plannedTasks}
                      addPlannedTask={addPlannedTask}
                      updatePlannedTaskStatus={updatePlannedTaskStatus}
                      deletePlannedTask={deletePlannedTask}
                      expiringBookingIds={expiringBookingIds}
                      preExpiringBookingIds={preExpiringBookingIds}
                      startBooking={startBooking}
                      endBooking={endBooking}
                      onUpdatePassword={updatePassword}
                    />
                  } 
                />
                <Route path="/incident/:id" element={<IncidentDetailsPage incidents={incidents} users={users} currentUser={currentUser?.details || null} />} />
                <Route path="/login" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route 
                  path="/login" 
                  element={
                    <LoginPage 
                      onLogin={handleLogin} 
                    />
                  } 
                />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;