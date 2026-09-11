"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/motion"

interface CountdownTimerProps {
  targetDate: Date
  onExpire?: () => void
  className?: string
  variant?: "default" | "compact" | "large"
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date): TimeLeft | null {
  const difference = targetDate.getTime() - new Date().getTime()
  
  if (difference <= 0) {
    return null
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

export function CountdownTimer({ 
  targetDate, 
  onExpire, 
  className,
  variant = "default" 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => 
    calculateTimeLeft(targetDate)
  )
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate)
      setTimeLeft(newTimeLeft)
      
      if (newTimeLeft) {
        const totalMinutes = 
          newTimeLeft.days * 24 * 60 + 
          newTimeLeft.hours * 60 + 
          newTimeLeft.minutes
        setIsUrgent(totalMinutes < 30)
      }
      
      if (!newTimeLeft) {
        clearInterval(timer)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, onExpire])

  if (!timeLeft) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        Window closed
      </div>
    )
  }

  const formatNumber = (num: number) => num.toString().padStart(2, "0")

  if (variant === "compact") {
    return (
      <div className={cn(
        "font-mono text-sm",
        isUrgent ? "text-destructive" : "text-primary",
        className
      )}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
      </div>
    )
  }

  if (variant === "large") {
    return (
      <div className={cn("flex items-center gap-1.5 sm:gap-3", className)}>
        {timeLeft.days > 0 && (
          <TimeUnit value={timeLeft.days} label="Days" isUrgent={isUrgent} size="large" />
        )}
        <TimeUnit value={timeLeft.hours} label="Hours" isUrgent={isUrgent} size="large" />
        <TimeUnit value={timeLeft.minutes} label="Mins" isUrgent={isUrgent} size="large" />
        <TimeUnit value={timeLeft.seconds} label="Secs" isUrgent={isUrgent} size="large" />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {timeLeft.days > 0 && (
        <TimeUnit value={timeLeft.days} label="D" isUrgent={isUrgent} size="sm" />
      )}
      <TimeUnit value={timeLeft.hours} label="H" isUrgent={isUrgent} size="sm" />
      <TimeUnit value={timeLeft.minutes} label="M" isUrgent={isUrgent} size="sm" />
      <TimeUnit value={timeLeft.seconds} label="S" isUrgent={isUrgent} size="sm" />
    </div>
  )
}

function TimeUnit({
  value,
  label,
  isUrgent,
  size = "default"
}: {
  value: number
  label: string
  isUrgent: boolean
  size?: "sm" | "default" | "large"
}) {
  return (
    <div className={cn(
      "flex flex-col items-center rounded-lg bg-secondary",
      size === "sm" && "px-2 py-1",
      size === "default" && "px-4 py-3",
      size === "large" && "px-2.5 py-2 sm:px-4 sm:py-3"
    )}>
      <span className={cn(
        "font-mono font-bold",
        isUrgent ? "text-destructive" : "text-foreground",
        size === "sm" && "text-lg",
        size === "default" && "text-3xl",
        size === "large" && "text-xl sm:text-3xl"
      )}>
        {/* The large variant is the high-stakes, single-instance countdown
            (session detail page) — it gets the odometer flip. Compact/sm
            variants render in every session card simultaneously, so they
            stay static text to avoid a grid full of flickering digits. */}
        {size === "large" ? (
          <FlipNumber value={value} />
        ) : (
          value.toString().padStart(2, "0")
        )}
      </span>
      <span className={cn(
        "text-muted-foreground uppercase",
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {label}
      </span>
    </div>
  )
}

function FlipNumber({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const digits = value.toString().padStart(2, "0").split("")

  if (reduce) {
    return <>{digits.join("")}</>
  }

  return (
    <span className="inline-flex">
      {digits.map((digit, i) => (
        <span key={i} className="relative inline-block h-[1.2em] w-[1ch] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={digit}
              initial={{ y: "60%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-60%", opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="absolute inset-0"
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
