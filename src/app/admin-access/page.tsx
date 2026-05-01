"use client";

import { useEffect } from "react";

export default function AdminAccess() {
  useEffect(() => {
    // Set Jonathan as super admin
    const jonathanUser = {
      id: 'jonathan-bradley',
      name: 'Jonathan Bradley',
      email: 'jonathan@ottoservco.com',
      role: 'super_admin',
      isOttoServEmployee: true,
      clientAccess: ['all'],
      permissions: [
        'view_all_clients',
        'manage_client_services',
        'view_aggregate_analytics',
        'system_admin',
        'billing_admin'
      ]
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("ottoserv_current_user", JSON.stringify(jonathanUser));
      localStorage.setItem("ottoserv_token", "super_admin_token");
      
      // Redirect to admin dashboard
      window.location.href = "/dashboard/admin";
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-white mb-2">🔴 Super Admin Access</h1>
        <p className="text-gray-400">Setting up Jonathan's live data access...</p>
      </div>
    </div>
  );
}