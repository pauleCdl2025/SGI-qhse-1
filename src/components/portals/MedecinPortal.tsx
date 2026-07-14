import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { IncidentHistoryCard } from "@/components/shared/IncidentHistoryCard";
import { User, Booking, Notification, Incident } from "@/types";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { PortalPageHeader } from "@/components/shared/PortalPageHeader";

interface PortalProps {
  user: User;
  bookings: Booking[];
  notifications: Notification[];
  incidents: Incident[];
  onNavigate: (tabId: string) => void;
}

// Portail Médecin
export const MedecinPortal = ({ user, bookings, notifications, incidents, onNavigate }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  const myBookings = bookings.filter(b => b.doctor_id === user.id);
  const todayBookings = myBookings.filter(b => {
    const bookingDate = format(new Date(b.start_time), 'yyyy-MM-dd');
    const todayDate = format(today, 'yyyy-MM-dd');
    return bookingDate === todayDate;
  });
  const activeBookings = myBookings.filter(b => b.status === 'en_cours');
  const upcomingBookings = myBookings.filter(b => b.status === 'réservé' && new Date(b.start_time) > today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekBookings = myBookings.filter(b => 
    isWithinInterval(new Date(b.start_time), { start: weekStart, end: weekEnd })
  );
  const unreadNotifications = notifications.filter(n => !n.read);

  // Prochaines consultations (3 prochaines)
  const nextBookings = [...upcomingBookings]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);

  const myIncidents = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myBiomedicalDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  const rawFirstName = (user.first_name || "").trim();
  const rawLastName = (user.last_name || "").trim();
  const doctorDisplayName = `${rawFirstName} ${rawLastName}`.trim() || user.username;

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('medecin', {
        user,
        bookings: myBookings,
        incidents,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <PortalPageHeader
        iconName="Stethoscope"
        title="Portail Médecin"
        subtitle={doctorDisplayName}
        meta={format(today, "EEEE d MMMM yyyy", { locale: fr }) + " - " + format(today, "HH:mm")}
        actions={
          <>
            {unreadNotifications.length > 0 && (
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-center">
                <Icon name="Bell" className="mx-auto mb-2 text-3xl text-cyan-700" />
                <div className="text-3xl font-bold text-slate-900">{unreadNotifications.length}</div>
                <div className="text-sm text-slate-500">Notification{unreadNotifications.length > 1 ? 's' : ''}</div>
              </div>
            )}
            <PortalExcelActions
              portalType="medecin"
              data={{
                bookings: myBookings,
                incidents,
              }}
            />
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-cyan-50 hover:text-cyan-800"
              size="sm"
            >
              <Icon name={isGeneratingReport ? "Clock" : "Download"} className={`mr-2 h-4 w-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Génération...' : 'Exporter PDF'}
            </Button>
          </>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Consultations Aujourd'hui" 
          value={todayBookings.length} 
          iconName="Calendar" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('planningSalles')}
        />
        <DashboardCard 
          title="En Cours" 
          value={activeBookings.length} 
          iconName="Clock" 
          colorClass="bg-yellow-100 text-yellow-600"
          onClick={() => onNavigate('planningSalles')}
        />
        <DashboardCard 
          title="Cette Semaine" 
          value={weekBookings.length} 
          iconName="CalendarCheck" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('planningSalles')}
        />
        <DashboardCard 
          title="Total Consultations" 
          value={myBookings.length} 
          iconName="FileText" 
          colorClass="bg-teal-100 text-teal-600"
          onClick={() => onNavigate('planningSalles')}
        />
      </div>

      {/* Planning du jour et prochaines consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planning du jour */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Calendar" className="text-cyan-600 mr-2" />
              Mon Planning Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayBookings.length > 0 ? (
              <div className="space-y-3">
                {todayBookings
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map(booking => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('planningSalles')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{booking.title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Icon name="Clock" className="inline mr-1" />
                            {format(new Date(booking.start_time), "HH:mm", { locale: fr })} - {format(new Date(booking.end_time), "HH:mm", { locale: fr })}
                          </div>
                          {booking.room_name && (
                            <div className="text-sm text-gray-500 mt-1">
                              <Icon name="MapPin" className="inline mr-1" />
                              {booking.room_name}
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'en_cours' ? 'bg-green-100 text-green-700' :
                          booking.status === 'réservé' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon name="CalendarX" className="text-4xl mx-auto mb-2 text-gray-300" />
                <p>Aucune consultation prévue aujourd'hui</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prochaines consultations */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="CalendarCheck" className="text-blue-600 mr-2" />
              Prochaines Consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextBookings.length > 0 ? (
              <div className="space-y-3">
                {nextBookings.map(booking => {
                  const bookingDate = new Date(booking.start_time);
                  const isTodayBooking = isToday(bookingDate);
                  const isTomorrowBooking = isTomorrow(bookingDate);
                  
                  return (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('planningSalles')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{booking.title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <Icon name="Clock" className="inline mr-1" />
                            {format(bookingDate, "EEEE d MMMM à HH:mm", { locale: fr })}
                          </div>
                          {booking.room_name && (
                            <div className="text-sm text-gray-500 mt-1">
                              <Icon name="MapPin" className="inline mr-1" />
                              {booking.room_name}
                            </div>
                          )}
                          {(isTodayBooking || isTomorrowBooking) && (
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              {isTodayBooking ? 'Aujourd\'hui' : 'Demain'}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                          {booking.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon name="CalendarX" className="text-4xl mx-auto mb-2 text-gray-300" />
                <p>Aucune consultation à venir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Zap" className="text-cyan-600 mr-2" />
            Accès Rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningSalles')}>
              <CardContent className="p-6">
                <Icon name="Calendar" className="text-cyan-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Mon Planning</h3>
                <p className="text-sm text-gray-600">Voir toutes mes consultations</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
              <CardContent className="p-6">
                <Icon name="Shield" className="text-indigo-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Incident de Sécurité</h3>
                <p className="text-sm text-gray-600">Signaler un incident de sécurité</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('doctors')}>
              <CardContent className="p-6">
                <Icon name="Users" className="text-blue-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Annuaire</h3>
                <p className="text-sm text-gray-600">Voir les médecins</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('globalRoomOverview')}>
              <CardContent className="p-6">
                <Icon name="MapPin" className="text-teal-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Vue Globale</h3>
                <p className="text-sm text-gray-600">Vue d'ensemble des salles</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('personalInfo')}>
              <CardContent className="p-6">
                <Icon name="User" className="text-gray-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Mon Profil</h3>
                <p className="text-sm text-gray-600">Modifier mes informations</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Consultations cette semaine</p>
                <p className="text-3xl font-bold text-gray-900">{weekBookings.length}</p>
              </div>
              <Icon name="TrendingUp" className="text-4xl text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Consultations à venir</p>
                <p className="text-3xl font-bold text-gray-900">{upcomingBookings.length}</p>
              </div>
              <Icon name="CalendarClock" className="text-4xl text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux de remplissage</p>
                <p className="text-3xl font-bold text-gray-900">
                  {myBookings.length > 0 ? Math.round((todayBookings.length / myBookings.length) * 100) : 0}%
                </p>
              </div>
              <Icon name="BarChart" className="text-4xl text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <IncidentHistoryCard
        title="Mes incidents déclarés"
        subtitle="Signalements QHSE que j'ai envoyés"
        incidents={myIncidents}
        allIncidents={incidents}
        emptyMessage="Vous n'avez pas encore signalé d'incident QHSE."
      />

      <IncidentHistoryCard
        title="Mes déclarations biomédicales"
        subtitle="Équipements HS déclarés via ce compte"
        incidents={myBiomedicalDeclarations}
        allIncidents={incidents}
        emptyMessage="Aucune déclaration biomédicale pour le moment."
      />
    </div>
  );
};

