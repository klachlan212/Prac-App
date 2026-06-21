import { ReflectionEditor } from '@/src/ui/ReflectionEditor'

// `?mode=skill` is the standalone "just log a skill" path (spec §3) — it starts
// at the skills step and skips the reflection prompts.
export default async function NewReflectionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  return <ReflectionEditor mode={mode === 'skill' ? 'skill' : 'full'} />
}
