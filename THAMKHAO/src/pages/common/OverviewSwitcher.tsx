import React from 'react';
import { useAppStore } from '../../store/useAppStore';

import StudentOverview from '../student/Overview';
import TeacherDashboard from '../teacher/TeacherDashboard';
import AdminDashboard from '../admin/AdminDashboard'; // <-- Import Admin Dashboard

const OverviewSwitcher = () => {
  const { currentUser } = useAppStore();

  if (currentUser.role === 'admin') {
    return <AdminDashboard />;
  }

  if (currentUser.role === 'teacher') {
    return <TeacherDashboard />;
  }

  return <StudentOverview />;
};

export default OverviewSwitcher;