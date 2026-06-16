import { ReflectionEditor } from '@/src/ui/ReflectionEditor'

// Edit reuses the exact write screen (spec §8.3). In Next 15 route params are async.
export default async function EditReflectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ReflectionEditor reflectionId={id} />
}
