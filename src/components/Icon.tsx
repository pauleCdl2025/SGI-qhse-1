import {
  Gauge, Shield, PlusCircle, Users, SprayCan, Wrench, Calendar, LogIn, LogOut, AlertCircle, Clock, CheckCircle2, AlertTriangle,
  Hourglass, Check, ClipboardCheck, Save, History, UserCog, Ticket, CheckCheck, Settings, Filter,
  CalendarPlus, FileText, Download, Bell, BarChart, Camera, ListChecks, ClipboardList, Play, X, UserPlus, HeartPulse, Menu, Crown, Stethoscope, LucideProps, UserX,
  MapPin, LayoutGrid, List, ChevronLeft, ChevronRight, Pencil, Eye, EyeOff, Mail, KeyRound, LayoutDashboard, CalendarDays, Upload, ExternalLink, Edit, ArrowLeft, FileBarChart,
  ShieldCheck, Flame, Info
} from 'lucide-react';

const icons = {
  Gauge, Shield, PlusCircle, Users, SprayCan, Wrench, Calendar, LogIn, LogOut, AlertCircle, Clock, CheckCircle2, AlertTriangle,
  Hourglass, Check, ClipboardCheck, Save, History, UserCog, Ticket, CheckCheck, Settings, Filter,
  CalendarPlus, FileText, Download, Bell, BarChart, Camera, ListChecks, ClipboardList, Play, X, UserPlus, HeartPulse, Menu, Crown, Stethoscope, UserX,
  MapPin, LayoutGrid, List, ChevronLeft, ChevronRight, Pencil, Eye, EyeOff, Mail, KeyRound, LayoutDashboard, CalendarDays, Upload, ExternalLink, Edit, ArrowLeft, FileBarChart,
  ShieldCheck, Flame, Info
};

export const Icon = ({ name, ...props }: { name: string } & LucideProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    // Fallback to a default icon or null if you prefer
    const DefaultIcon = AlertCircle;
    return <DefaultIcon {...props} />;
  }

  return <LucideIcon {...props} />;
};