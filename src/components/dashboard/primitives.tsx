import { useEffect } from "react"
import type { ReactNode } from "react"
import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { cn } from "@/lib/utils"

export function AnimatedNumber({
  value,
  decimals = 0,
  format,
  className,
}: {
  value: number
  decimals?: number
  format?: (value: number) => string
  className?: string
}) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => (format ? format(v) : v.toFixed(decimals)))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, mv])

  return <motion.span className={cn("tabular", className)}>{text}</motion.span>
}

export function BentoCard({
  className,
  children,
  delay = 0,
}: {
  className?: string
  children: ReactNode
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("bento-card h-full", className)}
    >
      {children}
    </motion.section>
  )
}
