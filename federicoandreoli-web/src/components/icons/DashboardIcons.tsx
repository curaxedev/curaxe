import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

const defaults = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Icon({ size = 24, ...props }: IconProps) {
  return <svg width={size} height={size} {...defaults} {...props} />
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 10.5 12 4l7.5 6.5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20v-9.5Z" />
      <path d="M9.5 21.5v-7h5v7" />
    </Icon>
  )
}

export function IconProfile(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20.5c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    </Icon>
  )
}

export function IconMessages(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 19.5 6.5 15H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10.5Z" />
    </Icon>
  )
}

export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5a4.5 4.5 0 0 0-4.5 4.5c0 5-2.25 6.75-2.25 6.75h13.5S16.5 13 16.5 8A4.5 4.5 0 0 0 12 3.5Z" />
      <path d="M10.25 18.75a1.75 1.75 0 0 0 3.5 0" />
    </Icon>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="2.75" />
      <path d="M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M6.8 17.2l1.4-1.4M15.8 8.2l1.4-1.4" />
    </Icon>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m16.5 16.5 4 4" />
    </Icon>
  )
}

export function IconSend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 12 15-7.5L15 12l-10.5 7.5L6 12l-1.5 0Z" />
      <path d="M6 12h9" />
    </Icon>
  )
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 6 9 12l5.5 6" />
    </Icon>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </Icon>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16.5 8.75a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z" />
      <path d="M19.5 19.5c0-2.5-1.75-4.5-4-4.5" />
    </Icon>
  )
}

export function IconBuilding(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21V7.5l7-4 7 4V21" />
      <path d="M9.5 21v-5h5v5" />
      <path d="M9.5 10h1M13.5 10h1M9.5 14h1M13.5 14h1" />
    </Icon>
  )
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 19 7v5.5c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V7l7-3.5Z" />
      <path d="m9 12 2 2 4-4.5" />
    </Icon>
  )
}

export function IconStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.85 5L12 15.8 7.55 17.7l.85-5L4.8 9.2l5-.7L12 4Z" />
    </Icon>
  )
}

export function IconStarFilled(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.85 5L12 15.8 7.55 17.7l.85-5L4.8 9.2l5-.7L12 4Z" />
    </Icon>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Icon>
  )
}

export function IconList(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Icon>
  )
}

export function IconHeart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5s-7.5-4.5-7.5-10a4.25 4.25 0 0 1 7.5-2.6 4.25 4.25 0 0 1 7.5 2.6c0 5.5-7.5 10-7.5 10Z" />
    </Icon>
  )
}

export function IconEdit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5H5.5a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 5.5 4H12" />
      <path d="M16.5 3.5 20.5 7.5 10 18l-4 1 1-4 9.5-9.5Z" />
    </Icon>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M5 12h14M5 17h14" />
    </Icon>
  )
}

export function IconMoreDots(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 5.5H6.5A1.5 1.5 0 0 0 5 7v10a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M14.5 12H9M17 8.5 20.5 12 17 15.5" />
    </Icon>
  )
}

export function IconSupport(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.75 9.25a2.25 2.25 0 1 1 4.1 1.25c-.65.65-1.35 1-1.35 2" />
      <circle cx="12" cy="16.75" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconMail(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="m4 7.5 8 5.5 8-5.5" />
    </Icon>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v4.5M12 16.25h.01" />
    </Icon>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.5A2 2 0 0 1 6 5.5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
      <path d="M4 13.5h4.5L10 16h4l1.5-2.5H20" />
    </Icon>
  )
}

export function IconBriefcase(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="9" width="17" height="11" rx="2" />
      <path d="M9 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Icon>
  )
}

export function IconInfo(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8.25h.01" />
    </Icon>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z" />
      <path d="m8.5 12.25 2.25 2.25 5-5" />
    </Icon>
  )
}

export function IconCheckMark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 12.5 3.5 3.5 8.5-8" />
    </Icon>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m7 7 10 10M17 7 7 17" />
    </Icon>
  )
}

export function IconEye(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6S3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  )
}

export function IconEyeOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 10.5a2.75 2.75 0 0 0 3.85 3.85" />
      <path d="M7.2 7.2C5.4 8.4 4.1 10 3.5 12c0 0 3 6 8.5 6 1.6 0 3.05-.45 4.25-1.2" />
      <path d="M14.8 14.8C13.6 15.55 12.35 16 11 16 8 16 5.5 13.5 5.5 10.5c0-1.05.3-2 .85-2.85" />
      <path d="m4 4 16 16" />
    </Icon>
  )
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="11" width="13" height="9.5" rx="2" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
    </Icon>
  )
}

export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5v11M8 8.5l4-4 4 4" />
      <path d="M5 19.5h14" />
    </Icon>
  )
}

export function IconTrendUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.5 10 10.5 14 14.5 20 6.5" />
      <path d="M15 6.5h5v5" />
    </Icon>
  )
}

export function IconCreditCard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M3 11h18" />
    </Icon>
  )
}

export function IconWave(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 11.5V8a2 2 0 1 1 4 0v1.5" />
      <path d="M6.5 11.5c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4" />
      <path d="M12.5 11.5c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4" />
      <path d="M6.5 11.5c.75 1.5 2 2.5 3.5 2.5s2.75-1 3.5-2.5" />
    </Icon>
  )
}

export function IconGrid(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  )
}

export function IconMapPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.5s-6.5-4.5-6.5-10a6.5 6.5 0 1 1 13 0c0 5.5-6.5 10-6.5 10Z" />
      <circle cx="12" cy="11.5" r="2.25" />
    </Icon>
  )
}

export function IconPhone(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.2 4.8c.4-.4 1-.5 1.5-.3l2 0.8c.5.2.8.7.7 1.2l-.4 2.1a1 1 0 0 1-.6.7l-1.3.5a10.5 10.5 0 0 0 4.8 4.8l.5-1.3a1 1 0 0 1 .7-.6l2.1-.4c.5-.1 1 .2 1.2.7l.8 2c.2.5.1 1.1-.3 1.5l-1.1 1.1c-.4.4-1 .6-1.6.5C11.4 18.8 5.2 12.6 4.3 6.4c-.1-.6.1-1.2.5-1.6L8.2 4.8Z" />
    </Icon>
  )
}

export function IconWhatsApp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5a7.5 7.5 0 0 0-6.5 11.2L4.5 19.5l3.9-1A7.5 7.5 0 1 0 12 4.5Z" />
      <path d="M9.2 9.4c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.4.7 1.1 1.4 1.9 1.9.1.1.3.1.4 0l.5-.4c.2-.1.4-.2.5-.1l1.7.7c.3.1.4.3.4.5v.5c0 .2 0 .4-.4.6-.4.2-.9.4-1.4.4-2.4 0-5.3-2.7-5.8-5.1-.1-.5.1-1 .3-1.4Z" />
    </Icon>
  )
}
