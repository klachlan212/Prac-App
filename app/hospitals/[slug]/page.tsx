import type { Metadata } from 'next'
import { getHospital, HOSPITALS } from '@/src/content/hospitals'
import { HospitalProfile } from '@/src/ui/hospital/HospitalProfile'

// The known roster is prerendered for nice metadata/SEO; any moderator-added
// hospital still resolves dynamically (the profile fetches it by slug from the DB).
export function generateStaticParams() {
  return HOSPITALS.map((h) => ({ slug: h.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const h = getHospital(slug)
  return h
    ? { title: `${h.name} — placement logistics · Prac.`, description: h.intro }
    : {
        title: 'Hospital directory — placement logistics · Prac.',
        description: 'Parking, access, food and culture for Australian hospital placements.',
      }
}

export default async function HospitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <HospitalProfile slug={slug} />
}
