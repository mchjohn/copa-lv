import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
  return (
    <main className="flex flex-col justify-center items-center gap-4 mx-auto px-4 py-16 max-w-6xl text-center container">
      <h1 className="font-semibold text-2xl">Página não encontrada.</h1>
      <Link
        to="/tournaments"
        className={cn(buttonVariants({ variant: 'outline' }), 'min-h-10')}
      >
        Voltar ao início
      </Link>
    </main>
  )
}
