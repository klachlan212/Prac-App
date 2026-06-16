import { AuthGuard } from '@/src/auth/guard'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
