import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';
import { PrivateRoute } from './PrivateRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { DepositsPage } from '@/pages/admin/DepositsPage';
import { NotificationsPage } from '@/pages/admin/NotificationsPage';
import { PromotionsPage } from '@/pages/admin/PromotionsPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { TaskManagerPage } from '@/pages/admin/TaskManagerPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { VIPManagerPage } from '@/pages/admin/VIPManagerPage';
import { WithdrawalsPage } from '@/pages/admin/WithdrawalsPage';
import { DepositPage } from '@/pages/user/DepositPage';
import { HomePage } from '@/pages/user/HomePage';
import { NewsPage } from '@/pages/user/NewsPage';
import { ProfilePage } from '@/pages/user/ProfilePage';
import { StorePage } from '@/pages/user/StorePage';
import { TaskCenterPage } from '@/pages/user/TaskCenterPage';
import { WithdrawPage } from '@/pages/user/WithdrawPage';

export const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    <Route element={<PrivateRoute />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/deposit" element={<DepositPage />} />
      <Route path="/withdraw" element={<WithdrawPage />} />
      <Route path="/store" element={<StorePage />} />
      <Route path="/tasks" element={<TaskCenterPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Route>

    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<UsersPage />} />
      <Route path="/admin/deposits" element={<DepositsPage />} />
      <Route path="/admin/withdrawals" element={<WithdrawalsPage />} />
      <Route path="/admin/vip" element={<VIPManagerPage />} />
      <Route path="/admin/tasks" element={<TaskManagerPage />} />
      <Route path="/admin/promotions" element={<PromotionsPage />} />
      <Route path="/admin/notifications" element={<NotificationsPage />} />
      <Route path="/admin/settings" element={<SettingsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
