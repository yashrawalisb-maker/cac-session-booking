"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center gap-1 border-b border-border",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      // CSS attribute-selector variants (data-[active]:, aria-selected:) proved unreliable
      // against this Base UI + Tailwind v4 combination — compute the active state in JS
      // via the state render-prop instead, which is authoritative.
      className={(state: TabsPrimitive.Tab.State) =>
        cn(
          "-mb-px inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          state.active
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground",
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      // Base UI keeps every panel mounted and marks inactive ones with the `inert`
      // attribute (for focus/AT purposes) rather than hiding them — display:none has to
      // be applied by us, or every panel's content renders stacked at once.
      className={cn("outline-none [&[inert]]:hidden", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
