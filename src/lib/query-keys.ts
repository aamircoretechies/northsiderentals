export const queryKeys = {
  userProfile: ['userProfile'] as const,
  dashboardBootstrap: ['dashboard', 'bootstrap'] as const,
  driverAgeOptions: ['driverAge', 'options'] as const,
  promotions: ['promotions'] as const,
  notificationsList: (page = 1, limit = 50) =>
    ['notifications', 'list', page, limit] as const,
  bookingsList: (status: string, page: number, limit: number) =>
    ['bookings', 'list', status, page, limit] as const,
  bookingsDetail: (reference: string) => ['bookings', 'detail', reference] as const,
  bookingsWorkflow: (reference: string, workflowCode: string) =>
    ['bookings', 'workflow', reference, workflowCode] as const,
  bookingsDocuments: (reference: string, workflowCode: string) =>
    ['bookings', 'documents', reference, workflowCode] as const,
  bookingsSignatures: (reference: string) =>
    ['bookings', 'signatures', reference] as const,
};

