export const runtime = 'edge';
// Force dynamic rendering so login page is not pre-rendered during build
// (it needs Supabase env vars which are only available at runtime)
export const dynamic = 'force-dynamic';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
