import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { playerInitials } from '@/features/players/player-avatar'
import { cn } from '@/lib/utils'

interface PlayerAvatarProps {
  name: string
  avatarUrl: string
  className?: string
}

export function PlayerAvatar({ name, avatarUrl, className }: PlayerAvatarProps) {
  const initials = playerInitials(name)

  return (
    <Avatar
      className={cn('size-10 shrink-0', className)}
      data-size="lg"
    >
      <AvatarImage src={avatarUrl} alt="" />
      <AvatarFallback aria-hidden>{initials}</AvatarFallback>
    </Avatar>
  )
}
