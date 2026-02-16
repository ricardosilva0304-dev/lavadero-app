import { redirect } from 'next/navigation'

export default function Home() {
  // Esto mandará al usuario directamente al Login apenas entre a la web
  redirect('/login')
}