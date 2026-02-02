import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, CartesianGrid, Bar } from 'recharts';
import { Icon } from "@/components/Icon";
import { Incident, BiomedicalEquipment, PlannedTask, Visitor, Booking, Users, MaintenanceTask, User } from "@/types";
import { DashboardCard } from "../shared/DashboardCard";
import { 
  filterIncidentsByRole, 
  filterVisitorsByRole, 
  filterPlannedTasksByRole, 
  filterMaintenanceTasksByRole, 
  filterBookingsByRole, 
  filterBiomedicalEquipmentByRole 
} from "@/utils/kpiFilter";

interface KpiDashboardProps {
  incidents: Incident[];
  biomedicalEquipment: BiomedicalEquipment[];
  plannedTasks: PlannedTask[];
  visitors: Visitor[];
  bookings: Booking[];
  users: Users;
  maintenanceTasks: MaintenanceTask[];
  currentUser: User;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const KpiDashboard = ({ incidents, biomedicalEquipment, plannedTasks, visitors, bookings, users, maintenanceTasks, currentUser }: KpiDashboardProps) => {
  // Filtrer les données selon le rôle de l'utilisateur
  const filteredIncidents = filterIncidentsByRole(incidents, currentUser, users);
  const filteredVisitors = filterVisitorsByRole(visitors, currentUser, users);
  const filteredPlannedTasks = filterPlannedTasksByRole(plannedTasks, currentUser, users);
  const filteredMaintenanceTasks = filterMaintenanceTasksByRole(maintenanceTasks, currentUser, users);
  const filteredBookings = filterBookingsByRole(bookings, currentUser);
  const filteredBiomedicalEquipment = filterBiomedicalEquipmentByRole(biomedicalEquipment, currentUser);

  // --- Security KPIs ---
  const securityIncidents = filteredIncidents.filter(i => i.service === 'securite');
  const securityIncidentsByType = securityIncidents.reduce((acc, incident) => {
    const type = incident.type;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const securityIncidentsByPriority = securityIncidents.reduce((acc, incident) => {
    const priority = incident.priorite;
    const existing = acc.find(item => item.name === priority);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: priority, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const visitorsToday = filteredVisitors.filter(v => new Date(v.entry_time).toDateString() === new Date().toDateString()).length;
  const totalVisitors = filteredVisitors.length;

  // --- Maintenance KPIs ---
  const maintenanceIncidents = filteredIncidents.filter(i => i.service === 'entretien');
  const maintenanceIncidentsByType = maintenanceIncidents.reduce((acc, incident) => {
    const type = incident.type;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const maintenanceTasksByStatus = filteredPlannedTasks.filter(t => t.assigned_to && ['agent_entretien', 'superviseur_agent_entretien'].includes(t.assigned_to in users ? users[t.assigned_to].role : '')).reduce((acc, task) => {
    const status = task.status;
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);


  // --- Technical KPIs ---
  const technicalIncidents = filteredIncidents.filter(i => i.service === 'technique');
  const technicalIncidentsByType = technicalIncidents.reduce((acc, incident) => {
    const type = incident.type;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const technicalIncidentsByStatus = technicalIncidents.reduce((acc, incident) => {
    const status = incident.statut;
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const totalPlannedMaintenanceTasks = filteredPlannedTasks.filter(t => t.assigned_to && ['technicien', 'superviseur_technicien'].includes(t.assigned_to in users ? users[t.assigned_to].role : '')).length;


  // --- Biomedical KPIs ---
  const equipmentByStatus = filteredBiomedicalEquipment.reduce((acc, eq) => {
    const status = eq.status;
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const maintenanceTasksByType = filteredMaintenanceTasks.reduce((acc, task) => {
    const type = task.type;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  // --- Planning KPIs ---
  const bookingsByRoom = filteredBookings.reduce((acc, booking) => {
    const roomName = booking.room_id; // Assuming roomId is descriptive enough or map to room.name
    const existing = acc.find(item => item.name === roomName);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: roomName, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const bookingsByReason = filteredBookings.reduce((acc, booking) => {
    const title = booking.title;
    const existing = acc.find(item => item.name === title);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: title, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 flex items-center">
        <Icon name="BarChart" className="text-blue-600 mr-3 h-8 w-8" />Tableau de Bord KPIs
      </h2>

      {/* Security KPIs */}
      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Icon name="Shield" className="text-blue-500 mr-2" /> Sécurité & Accueil
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard title="Visiteurs Aujourd'hui" value={visitorsToday} iconName="BookUser" colorClass="bg-blue-100 text-blue-600" />
          <DashboardCard title="Total Visiteurs" value={totalVisitors} iconName="Users" colorClass="bg-blue-100 text-blue-600" />
          <Card>
            <CardHeader><CardTitle>Incidents Sécurité par Type</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={securityIncidentsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {securityIncidentsByType.map((entry, index) => (
                      <Cell key={`cell-sec-type-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Incidents Sécurité par Priorité</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={securityIncidentsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Maintenance KPIs */}
      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Icon name="SprayCan" className="text-green-500 mr-2" /> Entretien
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Problèmes Entretien par Type</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={maintenanceIncidentsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {maintenanceIncidentsByType.map((entry, index) => (
                      <Cell key={`cell-maint-type-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tâches Entretien par Statut</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceTasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical KPIs */}
      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Icon name="Wrench" className="text-orange-500 mr-2" /> Technique
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard title="Tâches Maintenance Planifiées" value={totalPlannedMaintenanceTasks} iconName="CalendarPlus" colorClass="bg-orange-100 text-orange-600" />
          <Card>
            <CardHeader><CardTitle>Interventions Techniques par Type</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={technicalIncidentsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {technicalIncidentsByType.map((entry, index) => (
                      <Cell key={`cell-tech-type-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Interventions Techniques par Statut</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicalIncidentsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Biomedical KPIs */}
      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Icon name="HeartPulse" className="text-red-500 mr-2" /> Biomédical
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Équipements par Statut</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={equipmentByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {equipmentByStatus.map((entry, index) => (
                      <Cell key={`cell-bio-status-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tâches Maintenance Biomédicale par Type</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceTasksByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Planning KPIs */}
      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Icon name="CalendarDays" className="text-cyan-600 mr-2" /> Planning des Salles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Réservations par Salle</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByRoom}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Réservations par Motif</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bookingsByReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {bookingsByReason.map((entry, index) => (
                      <Cell key={`cell-booking-reason-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};