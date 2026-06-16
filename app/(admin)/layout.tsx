import { AuthGuard } from '@/src/auth/guard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
