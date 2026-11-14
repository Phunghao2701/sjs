import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return <motion.div className="page-motion" initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}>{children}</motion.div>
}
