"use client";

import { motion } from "framer-motion";

const variants = {
  primary:
    "border-brand bg-brand text-white shadow-[0_12px_30px_rgba(33,89,210,0.32)] hover:bg-brandDark hover:border-brandDark",
  secondary: "border-[#cfd9ec] bg-white text-[#16316d] hover:bg-[#f6f9ff]",
  ghost: "border-transparent bg-transparent text-muted hover:bg-[#edf3ff]",
};

export function Button({
  as = "a",
  href = "#",
  variant = "primary",
  className = "",
  children,
  whileHover,
  whileTap,
  ...props
}) {
  const Component = as;

  return (
    <motion.div whileHover={whileHover || { y: -2 }} whileTap={whileTap || { scale: 0.98 }} className="inline-flex">
      <Component
        href={Component === "a" ? href : undefined}
        className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-[0.95rem] font-bold tracking-[-0.01em] transition ${variants[variant] || variants.primary} ${className}`}
        {...props}
      >
        {children}
      </Component>
    </motion.div>
  );
}
