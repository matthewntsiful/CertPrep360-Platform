import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { motion } from 'framer-motion';

const AdminLayout: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-10 min-h-[calc(100vh-10rem)]">
      <AdminSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
