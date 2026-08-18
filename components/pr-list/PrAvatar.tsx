import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';

// shadcn's AvatarImage renders a plain <img> (Base UI's Avatar.Image), not
// next/image, and its fallback logic is coupled to Base UI's own load-state
// tracking. GitHub avatar URLs are always present on our data (never
// undefined), so there's no real fallback case to preserve — composing
// Avatar's shell directly with next/image keeps the sizing/ring styling
// while actually getting next/image's optimization, instead of fighting
// Base UI's internals to graft one onto the other.
export function PrAvatar({
  src,
  alt,
  size = 'default',
}: {
  src: string;
  alt: string;
  size?: 'default' | 'sm';
}) {
  const pixels = size === 'sm' ? 24 : 32;
  return (
    <Avatar size={size}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${pixels}px`}
        className="rounded-full object-cover"
      />
    </Avatar>
  );
}
