import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getHospital, HOSPITALS, refCardsFor, tipsFor } from '@/src/content/hospitals'
import { HospitalProfile } from '@/src/ui/hospital/HospitalProfile'

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
  if (!h) return { title: 'Hospital not found · Prac.' }
  return {
    title: `${h.name} — placement logistics · Prac.`,
    description: h.intro,
  }
}

export default async function HospitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hospital = getHospital(slug)
  if (!hospital) notFound()

  return (
    <HospitalProfile
      hospital={hospital}
      hospitals={HOSPITALS}
      tips={tipsFor(hospital.id)}
      refCards={refCardsFor(hospital.id)}
    />
  )
}
