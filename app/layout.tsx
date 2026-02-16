import './globals.css'
import LayoutWrapper from '@/components/LayoutWrapper'

export const metadata = {
  title: 'Gorilla Wash',
  description: 'Sistema de Gestión Automotriz',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      {/* El body mantiene el color base claro, pero el Login lo sobreescribirá con su propio fondo oscuro */}
      <body className="bg-gray-50 antialiased">
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  )
}