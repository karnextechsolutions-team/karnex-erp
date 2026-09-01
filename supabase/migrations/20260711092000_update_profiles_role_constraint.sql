-- Drop the existing role check constraint if it exists
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated check constraint supporting both lowercase and uppercase variations of standard ERP roles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'admin', 'manager', 'procurement', 'production', 'sales', 'viewer',
    'qa', 'finance', 'hr',
    'ADMIN', 'SALES', 'PROCUREMENT', 'QA', 'PRODUCTION', 'FINANCE', 'HR', 'MANAGER', 'VIEWER'
  )
);
